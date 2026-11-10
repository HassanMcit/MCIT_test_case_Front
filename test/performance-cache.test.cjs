const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (key) => {
        if (key in mocks) return mocks[key];
        if (
          key.startsWith("@/") ||
          key.startsWith(".") ||
          key === "server-only"
        )
          throw Error(`Unmocked app dependency: ${key}`);
        return require(key);
      },
      console,
      URL,
      Headers,
      Response,
      Buffer,
      process: { env: {} },
      setTimeout,
      clearTimeout,
      fetch: () => {
        throw Error("Network disabled in performance tests");
      },
      ...globals,
    },
    { filename: file },
  );
  return module.exports;
}

function fakeCache() {
  const entries = new Map(),
    registrations = [];
  return {
    registrations,
    unstable_cache(read, keyParts, options) {
      registrations.push({ keyParts, options });
      return async (...args) => {
        const key = JSON.stringify([keyParts, args]);
        if (!entries.has(key)) {
          const result = Promise.resolve().then(() => read(...args));
          entries.set(key, { result, tags: options.tags || [] });
          result.catch(() => entries.delete(key));
        }
        return entries.get(key).result;
      };
    },
    updateTag(tag) {
      for (const [key, entry] of entries)
        if (entry.tags.includes(tag)) entries.delete(key);
    },
  };
}

test("shared catalog authorizes every hit, reuses equivalent users, and expires on revision or tags", async () => {
  let user = { id: 2, role: "tester", cacheRevision: "10" },
    reads = 0;
  const caching = fakeCache();
  const { authenticatedSharedCache, scopedCache } = load(
    "src/lib/scoped-cache.ts",
    {
      "server-only": {},
      "next/cache": caching,
      "@/app/myUtil": { getCurrentUserSession: async () => user },
    },
  );
  const shared = authenticatedSharedCache(
    async (category) => ({ category, reads: ++reads }),
    ["catalog"],
    { tags: ["quality-apps"], revalidate: 15 },
  );
  const first = await shared("All");
  user = { id: 3, role: "admin", cacheRevision: "10" };
  assert.equal(await shared("All"), first);
  user = { id: 4, role: "user", cacheRevision: "10" };
  assert.equal(await shared("All"), first);
  await shared("HR");
  assert.equal(reads, 2);
  user = null;
  await assert.rejects(shared("All"), /Authentication/);
  assert.equal(reads, 2);
  user = { id: 3, role: "admin", cacheRevision: "11" };
  assert.notEqual(await shared("All"), first);
  assert.equal(reads, 3);
  caching.updateTag("quality-apps");
  await shared("All");
  assert.equal(reads, 4);
  assert.equal(caching.registrations[0].options.revalidate, 15);
  scopedCache(async () => 1, ["default"]);
  scopedCache(async () => 1, ["indefinite"], { revalidate: false });
  assert.equal(caching.registrations[1].options.revalidate, 60);
  assert.equal(caching.registrations[2].options.revalidate, false);
  let freshReads = 0;
  for (const factory of [scopedCache, authenticatedSharedCache]) {
    const fresh = factory(async () => ++freshReads, ["uncached"], {
      revalidate: 0,
    });
    const before = await fresh();
    assert.equal(await fresh(), before + 1);
  }
});

test("RSC request-local auth memoizes parallel reads but a new request rechecks roles and revocation", async () => {
  let context = new Map(),
    calls = 0;
  let row = {
    id: 2,
    role: "tester",
    name: "Test",
    email: "test@example.invalid",
    revision: "1",
    sessionActive: true,
    minTokenIat: 0,
  };
  const credential = `header.${Buffer.from(JSON.stringify({ sub: 2, iat: 100, sid: "test-device" })).toString("base64url")}.signature`;
  const { getCurrentUserSession, getUserToken } = load(
    "src/app/myUtil.ts",
    {
      react: {
        cache:
          (read) =>
          (...args) => {
            if (!context.has(read)) context.set(read, read(...args));
            return context.get(read);
          },
      },
      "@/lib/db": {
        pool: {
          query: async () => {
            calls++;
            return { rows: row ? [row] : [] };
          },
        },
      },
      "next/headers": {
        cookies: async () => ({
          get: (key) =>
            key === "authjs.session-token"
              ? { value: "fixture-cookie" }
              : undefined,
        }),
      },
      "next-auth/jwt": {
        decode: async () => ({ id: 2, credentialToken: credential }),
      },
    },
    { process: { env: { AUTH_SECRET: "isolated-test-only" } } },
  );
  const results = await Promise.all([
    getCurrentUserSession(),
    getUserToken(),
    getCurrentUserSession(),
    getUserToken(),
  ]);
  assert.equal(calls, 1);
  assert.equal(results[1], credential);
  context = new Map();
  row = { ...row, role: "admin", revision: "2" };
  assert.equal((await getCurrentUserSession()).role, "admin");
  assert.equal(calls, 2);
  context = new Map();
  row = { ...row, sessionActive: false };
  assert.equal(await getCurrentUserSession(), null);
  assert.equal(calls, 3);
});

test("appFetch honors TTL; auth, sessions, exports and all mutations remain no-store", async () => {
  const calls = [];
  const { appFetch } = load(
    "src/lib/app-fetch.ts",
    {
      "server-only": {},
      "@/app/myUtil": {
        getCurrentUserSession: async () => ({
          id: 2,
          role: "tester",
          token: "fixture-token",
          cacheRevision: "3",
        }),
      },
    },
    {
      fetch: async (url, options) => {
        calls.push({ url, options });
        return new Response("{}");
      },
    },
  );
  await appFetch("https://fixture.invalid/api/projects", {
    next: { revalidate: 20, tags: ["projects"] },
  });
  assert.equal(calls.at(-1).options.next.revalidate, 20);
  await appFetch("https://fixture.invalid/api/projects", {
    next: { revalidate: false },
  });
  assert.equal(calls.at(-1).options.next.revalidate, false);
  await appFetch("https://fixture.invalid/api/projects", {
    next: { revalidate: 0 },
  });
  assert.equal(calls.at(-1).options.cache, "no-store");
  assert.equal(calls.at(-1).options.next, undefined);
  for (const path of [
    "/api/auth/me",
    "/api/users/sessions",
    "/api/users/notifications",
    "/api/projects/1/export",
  ]) {
    await appFetch(`https://fixture.invalid${path}`, {
      next: { revalidate: 20 },
      cache: "force-cache",
    });
    assert.equal(calls.at(-1).options.cache, "no-store");
    assert.equal(calls.at(-1).options.next, undefined);
  }
  for (const method of ["POST", "PATCH", "DELETE"]) {
    await appFetch("https://fixture.invalid/api/projects", {
      method,
      cache: "force-cache",
    });
    assert.equal(calls.at(-1).options.cache, "no-store");
  }
});

test("actual quality CRUD actions invalidate shared catalog while assessment reads remain identity-scoped", async () => {
  let user = {
    id: 2,
    role: "tester",
    name: "Synthetic QA",
    cacheRevision: "1",
  };
  let listReads = 0,
    detailReads = 0,
    writes = 0;
  const caching = fakeCache(),
    paths = [];
  const scoped = load("src/lib/scoped-cache.ts", {
    "server-only": {},
    "next/cache": caching,
    "@/app/myUtil": { getCurrentUserSession: async () => user },
  });
  const app = {
    id: 1,
    name: "Fixture",
    url: "https://fixture.invalid",
    defaultFunctions: [],
  };
  const actions = load("src/app/(dashboard)/quality/quality.action.ts", {
    "next/cache": { ...caching, revalidatePath: (path) => paths.push(path) },
    "@/lib/scoped-cache": scoped,
    "@/app/myUtil": { getCurrentUserSession: async () => user },
    "@/lib/audit": { recordSystemAuditLog: async () => {} },
    "@/lib/db": {
      pool: {
        query: async (sql) => {
          if (sql.startsWith("SELECT * FROM quality_applications WHERE"))
            detailReads++;
          else if (sql.startsWith("SELECT * FROM quality_applications"))
            listReads++;
          else if (/^\s*(INSERT|UPDATE|DELETE)/.test(sql)) writes++;
          return { rows: sql.includes("quality_checklists") ? [] : [app] };
        },
      },
    },
  });
  await actions.getQualityApplications();
  await actions.getQualityAppById(1);
  user = { ...user, id: 3, role: "admin" };
  await actions.getQualityApplications("All", "  ");
  await actions.getQualityAppById(1);
  assert.equal(listReads, 1);
  assert.equal(detailReads, 2);
  for (const mutation of [
    () => actions.registerQualityApplication(app),
    () => actions.updateQualityApplication(1, { name: "Changed" }),
    () =>
      actions.submitQualityAssessment({
        appId: 1,
        isUpAndRunning: true,
        functionsResults: [],
      }),
    () => actions.deleteQualityApplication(1),
  ]) {
    const before = listReads;
    await mutation();
    await actions.getQualityApplications();
    assert.equal(listReads, before + 1);
    assert.ok(paths.includes("/quality"));
  }
  user = { ...user, role: "tester" };
  const before = writes;
  await assert.rejects(actions.registerQualityApplication(app));
  await assert.rejects(
    actions.updateQualityApplication(1, { name: "Forbidden" }),
  );
  await assert.rejects(actions.deleteQualityApplication(1));
  assert.equal(writes, before);
});

test("quality reads preserve Next.js dynamic-rendering signals instead of returning an empty snapshot", async () => {
  const signal = Object.assign(new Error("Request-time data"), {
    digest: "DYNAMIC_SERVER_USAGE",
  });
  const user = {
    getCurrentUserSession: async () => {
      throw signal;
    },
  };
  const caching = load("src/lib/scoped-cache.ts", {
    "server-only": {},
    "next/cache": fakeCache(),
    "@/app/myUtil": user,
  });
  const actions = load("src/app/(dashboard)/quality/quality.action.ts", {
    "next/cache": {},
    "@/lib/scoped-cache": caching,
    "@/app/myUtil": user,
    "@/lib/db": {
      pool: {
        query: () => {
          throw Error("No database access expected");
        },
      },
    },
    "@/lib/audit": {},
  });
  await assert.rejects(
    actions.getQualityApplications(),
    (error) => error === signal,
  );
  await assert.rejects(
    actions.getQualityAppById(1),
    (error) => error === signal,
  );
});

test("notification refresh is a fresh read, not an unrelated Router Cache invalidation", async () => {
  const invalidated = [],
    requests = [];
  const actions = load(
    "src/components/Navbar/notifications.action.ts",
    {
      "@/lib/app-fetch": {
        appFetch: async (_url, options) => {
          requests.push(options);
          return new Response(
            JSON.stringify({ notifications: [], unreadCount: 0 }),
          );
        },
      },
      "@/app/myUtil": { getUserToken: async () => "fixture-token" },
      "next/cache": { updateTag: (tag) => invalidated.push(tag) },
      "@/lib/fast-read": { raceBackendFetch: async (request) => request },
    },
    { process: { env: { NEXT_PUBLIC_BASE_URL: "https://fixture.invalid" } } },
  );
  await actions.refreshNotifications();
  assert.equal(invalidated.length, 0);
  assert.equal(requests.at(-1).cache, "no-store");
  await actions.markNotificationAsRead(1);
  assert.deepEqual(invalidated, []);
  assert.equal(requests.at(-1).cache, "no-store");
});

test("sidebar computes available stats without waiting for the legacy stats endpoint", async () => {
  let requests = 0;
  const { getDashboardStats } = load(
    "src/components/Sidebar/sidebar.action.ts",
    {
      "@/lib/app-fetch": {
        appFetch: async () => {
          requests++;
          throw Error("Unneeded request");
        },
      },
      "@/lib/fast-read": { raceBackendFetch: async (request) => request },
      "@/app/myUtil": {
        getUserToken: async () => "fixture-token",
        getCurrentUserSession: async () => ({
          id: 2,
          role: "tester",
          token: "fixture-token",
        }),
      },
      "@/app/(dashboard)/projects/getProjects.action": {
        getProjects: async () => [{ id: 1, name: "Project" }],
      },
      "@/app/(dashboard)/test-cases/test-cases.action": {
        getTestCases: async () => ({
          data: [{ projectId: 1, status: "passed" }],
        }),
      },
    },
  );
  const stats = await getDashboardStats();
  assert.equal(stats.total, 1);
  assert.equal(stats.passed, 1);
  assert.equal(requests, 0);
});

test("independent Add/Projects page reads start together instead of forming a waterfall", async () => {
  for (const file of [
    "src/app/(dashboard)/add/page.tsx",
    "src/app/(dashboard)/projects/page.tsx",
  ]) {
    let resolveProjects,
      qualityStarted = false;
    const pending = new Promise((resolve) => {
      resolveProjects = resolve;
    });
    const page = load(file, {
      "../projects/getProjects.action": { getProjects: () => pending },
      "./getProjects.action": { getProjects: () => pending },
      "../quality/quality.action": {
        getQualityApplications: async () => {
          qualityStarted = true;
          return { applications: [] };
        },
      },
      "./TestCaseForm": { __esModule: true, default: () => null },
      "./ProjectsForm": { __esModule: true, default: () => null },
    }).default;
    const rendered = page();
    assert.equal(qualityStarted, true);
    resolveProjects([]);
    await rendered;
  }
});

// Simulate React state/effects to exercise mount behavior without calling a backend.
function mount(file, props, mocks, globals = {}) {
  const effects = [];
  const updates = [];
  const react = {
    ...React,
    useEffect: (effect) => effects.push(effect),
    useState: (initial) => [
      typeof initial === "function" ? initial() : initial,
      (value) => updates.push(value),
    ],
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (current) => ({ current }),
    useTransition: () => [false, () => {}],
  };
  const fallback = new Proxy({}, { get: () => () => null });
  const imported = new Proxy(
    { react, ...mocks },
    {
      has: () => true,
      get: (target, key) =>
        key in target
          ? target[key]
          : key === "react/jsx-runtime"
            ? require(key)
            : fallback,
    },
  );
  const Component = load(file, imported, globals).default;
  Component(props);
  const cleanups = effects.map((effect) => effect());
  return {
    updates,
    unmount: () => {
      for (const cleanup of cleanups)
        if (typeof cleanup === "function") cleanup();
    },
  };
}

test("server snapshots including empty lists do not immediately refetch on the client", () => {
  let requests = 0;
  const request = () => {
    requests++;
    return Promise.resolve([]);
  };
  const common = {
    "next-auth/react": {
      useSession: () => ({
        data: { user: { id: "2", role: "admin" } },
        status: "authenticated",
      }),
    },
    "@/context/language-context": {
      useLanguage: () => ({ dir: "ltr", lang: "en", t: (key) => key }),
    },
    "next/navigation": {
      useRouter: () => ({}),
      useSearchParams: () => new URLSearchParams(),
    },
  };
  mount(
    "src/app/(dashboard)/users/UsersClient.tsx",
    { initialUsers: [] },
    { ...common, "./user.action": { getAllUsers: request } },
  );
  mount(
    "src/app/(dashboard)/assign-projects/AssignProjectsClient.tsx",
    { initialUsers: [], initialProjects: [] },
    { ...common, "./assign.action": { fetchAssignData: request } },
  );
  mount(
    "src/app/(dashboard)/test-cases/TestCasesTable.tsx",
    {
      initialData: { data: [], meta: { page: 1, total: 0, totalPages: 1 } },
      allProjects: [],
      allApplications: [],
    },
    { ...common, "./test-cases.action": { getTestCases: request } },
  );
  mount(
    "src/app/(dashboard)/test-cases/[id]/history/ExecutionHistory.tsx",
    {
      id: 1,
      initialResult: {
        ok: true,
        data: { data: [], meta: { page: 1, total: 0, totalPages: 1 } },
      },
    },
    {
      ...common,
      "../../../test-cycles/workflow.action": { workflowRequest: request },
      "../../../test-cycles/WorkflowShared": {
        useWords: () => ({ dir: "ltr", lang: "en", w: (en) => en }),
      },
    },
  );
  const emptyPage = { data: [], meta: { page: 1, total: 0, totalPages: 1 } };
  const words = {
    useWords: () => ({ dir: "ltr", lang: "en", w: (en) => en }),
    executionStatuses: [],
  };
  mount(
    "src/app/(dashboard)/test-cycles/WorkflowManager.tsx",
    {
      projects: [{ id: 1, name: "Project" }],
      isAdmin: true,
      initialProjectId: "1",
      initialCycles: emptyPage,
    },
    {
      ...common,
      zod: require("zod"),
      "react-hook-form": {
        useForm: () => ({
          register: () => ({}),
          handleSubmit: (fn) => fn,
          formState: { errors: {} },
        }),
      },
      "./WorkflowShared": words,
      "./workflow.action": { workflowRequest: request },
    },
  );
  mount(
    "src/app/(dashboard)/test-cycles/[id]/CycleWorkspace.tsx",
    {
      id: 1,
      initial: { id: 1, status: "active", summary: {} },
      initialItems: emptyPage,
      initialError: "",
      isAdmin: true,
      userId: 2,
    },
    {
      ...common,
      "../WorkflowShared": words,
      "../workflow.action": { workflowRequest: request },
    },
  );
  assert.equal(requests, 0);
});

for (const hostingPlatform of ["", "netlify"]) {
test(`notification coalescing, hidden tabs and identity isolation (${hostingPlatform || "existing host"})`, async () => {
  let routeRefreshes = 0;
  let requests = 0,
    resolveRead,
    tick,
    stream,
    now = 1000;
  const windowEvents = new Map();
  const request = () => {
    requests++;
    return new Promise((resolve) => {
      resolveRead = resolve;
    });
  };
  const document = {
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
  };
  class FixtureEventSource {
    static OPEN = 1;
    constructor(url) {
      this.url = url;
      this.readyState = 1;
      stream = this;
    }
    close() {}
  }
  const mounted = mount(
    "src/components/Navbar/Navbar.tsx",
    {},
    {
      "next/navigation": {
        useRouter: () => ({
          refresh: () => {
            routeRefreshes++;
          },
        }),
      },
      "next-auth/react": {
        useSession: () => ({
          status: "authenticated",
          data: { user: { id: "2", sid: "fixture" } },
        }),
      },
      "@/context/language-context": {
        useLanguage: () => ({ dir: "ltr", lang: "en", t: (key) => key }),
      },
      "./navbar.action": {
        getUserData: async () => ({ photo: "/avatar.png" }),
      },
      "./notifications.action": {
        getClientToken: async () => "synthetic-token",
        getMyNotifications: request,
        refreshNotifications: request,
      },
    },
    {
      process: { env: {
        NEXT_PUBLIC_HOSTING_PLATFORM: hostingPlatform,
        NEXT_PUBLIC_BASE_URL: "https://backend.example.test",
      } },
      document,
      window: {
        addEventListener: (key, fn) => windowEvents.set(key, fn),
        removeEventListener() {},
      },
      Date: { now: () => now },
      EventSource: FixtureEventSource,
      setInterval: (fn, interval) => {
        assert.equal(interval, hostingPlatform === "netlify" ? 60_000 : 5000);
        tick = fn;
        return 1;
      },
      clearInterval() {},
    },
  );
  await Promise.resolve(); // Connect synthetic stream.
  assert.equal(stream.url, `${hostingPlatform === "netlify" ? "https://backend.example.test" : ""}/api/users/notifications/stream?token=synthetic-token`);
  windowEvents.get("focus")();
  windowEvents.get("focus")();
  tick();
  assert.equal(requests, 1);
  resolveRead({ notifications: [], unreadCount: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 2); // One trailing read preserves intervening events.
  resolveRead({ notifications: [], unreadCount: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  now += 5000;
  tick();
  assert.equal(requests, 2);
  document.visibilityState = "hidden";
  now += 60_000;
  tick();
  assert.equal(requests, 2);
  document.visibilityState = "visible";
  tick();
  assert.equal(requests, 3);
  resolveRead({ notifications: [], unreadCount: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  stream.readyState = 0;
  now += 5000;
  tick();
  assert.equal(requests, 4); // Disconnected streams retain the 5s fallback.
  assert.equal(routeRefreshes, 0); // Poll/focus reads do not discard ready pages.
  stream.onmessage({
    data: JSON.stringify({
      type: "NOTIFICATION",
      payload: { titleEn: "Assignment" },
    }),
  });
  assert.equal(routeRefreshes, 1); // Genuine remote writes do refresh the tab.
  const oldResponse = [{ id: 1, title: "Old session response" }];
  mounted.unmount();
  resolveRead({ notifications: oldResponse, unreadCount: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!mounted.updates.includes(oldResponse));
  assert.equal(requests, 4); // Unmount also cancels any queued trailing read.
  assert.equal(stream.readyState, 0);
});
}
