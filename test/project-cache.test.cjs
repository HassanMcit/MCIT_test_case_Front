const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
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
      require: (key) => (key in mocks ? mocks[key] : require(key)),
      URL,
      Headers,
      Response,
      Buffer,
      console,
      ...globals,
    },
    { filename: file },
  );
  return module.exports;
}
const time = load("src/lib/project-time.ts");
const schema = load("src/app/(dashboard)/projects/project-schedule.zod.ts", {
  "@/lib/project-time": time,
});
test("server action schema validates offset schedules and nullable testers", () => {
  const valid = {
    name: "Project",
    description: "Description",
    environment: "staging",
    status: "active",
    startAt: "2026-01-01T08:00:00Z",
    endAt: "2026-01-02T08:00:00Z",
  };
  assert.ok(schema.createProjectApiSchema.safeParse(valid).success);
  assert.ok(
    schema.createProjectApiSchema.safeParse({
      ...valid,
      assignedTesterId: null,
    }).success,
  );
  assert.ok(
    schema.updateProjectApiSchema.safeParse({ assignedTesterId: null }).success,
  );
  assert.equal(
    schema.createProjectApiSchema.safeParse({ ...valid, endAt: valid.startAt })
      .success,
    false,
  );
  assert.equal(
    schema.createProjectApiSchema.safeParse({
      ...valid,
      startAt: "2026-01-01T08:00",
    }).success,
    false,
  );
  assert.equal(
    schema.updateProjectApiSchema.safeParse({ startAt: null }).success,
    false,
  );
});
test("Cairo winter/summer UTC round trips, invalid dates and DST ambiguity", () => {
  assert.equal(
    time.cairoInputToUtc("2026-01-01T10:30"),
    "2026-01-01T08:30:00.000Z",
  );
  assert.equal(
    time.cairoInputToUtc("2026-07-01T10:30"),
    "2026-07-01T07:30:00.000Z",
  );
  assert.equal(time.toCairoInput("2026-07-01T07:30:00Z"), "2026-07-01T10:30");
  for (const invalid of [
    "",
    "2026-02-30T10:00",
    "2026-04-24T00:30",
    "2026-10-29T23:30",
  ])
    assert.equal(time.cairoInputToUtc(invalid), null, invalid);
  assert.ok(time.formatProjectTime("2026-01-01T08:30:00Z", true));
  assert.equal(time.formatProjectTime(null, false), "Not scheduled");
});
test("bilingual form schema accepts optional tester and rejects missing/reversed dates", () => {
  const valid = {
    startAt: "2026-01-01T10:30",
    endAt: "2026-01-02T10:30",
    assignedTesterId: "",
  };
  assert.ok(schema.projectScheduleSchema.safeParse(valid).success);
  assert.ok(
    schema.projectScheduleSchema.safeParse({ ...valid, assignedTesterId: "2" })
      .success,
  );
  for (const patch of [
    { endAt: "2025-01-01T10:30" },
    { startAt: "" },
    { assignedTesterId: "-1" },
  ])
    assert.equal(
      schema.projectScheduleSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
  for (const msg of Object.values(schema.projectScheduleMessages)) {
    assert.ok(msg.ar);
    assert.ok(msg.en);
  }
});
test("Arabic/English field rendering includes labels, nullable tester, Cairo timezone, and accessible errors", () => {
  const { default: Fields } = load(
    "src/app/(dashboard)/projects/ProjectScheduleFields.tsx",
    {
      "@/components/ui/input": {
        Input: (props) => React.createElement("input", props),
      },
      "@/components/ui/label": {
        Label: (props) => React.createElement("label", props),
      },
    },
  );
  for (const isRTL of [true, false]) {
    const html = renderToStaticMarkup(
      React.createElement(Fields, {
        value: { startAt: "", endAt: "", assignedTesterId: "" },
        onChange() {},
        testers: [{ id: 2, name: "Tester Name" }],
        isRTL,
        errors: { endAt: "Validation message" },
      }),
    );
    assert.match(html, /Africa\/Cairo/);
    assert.match(html, /datetime-local/);
    assert.match(html, /Tester Name/);
    assert.match(html, /role="alert"/);
    assert.ok(html.includes(isRTL ? "بدون إسناد" : "Unassigned"));
    assert.ok(
      html.includes(
        isRTL ? "تاريخ ووقت بداية المشروع" : "Project Start Date &amp; Time",
      ),
    );
  }
});
test("server fetch caching is identity/revision scoped; all mutations and sensitive endpoints stay fresh", async () => {
  let user = { id: 2, role: "tester", token: "token-2", cacheRevision: "1" };
  const calls = [],
    cache = new Map();
  const { appFetch } = load(
    "src/lib/app-fetch.ts",
    {
      "server-only": {},
      "@/app/myUtil": { getCurrentUserSession: async () => user },
    },
    {
      fetch: async (url, options) => {
        const key =
          url + JSON.stringify([...new Headers(options.headers).entries()]);
        if (options.cache === "force-cache" && cache.has(key))
          return cache.get(key);
        calls.push({ url, options });
        const result = { ok: true, marker: calls.length };
        if (options.cache === "force-cache") cache.set(key, result);
        return result;
      },
    },
  );
  const url = "https://backend.example/api/projects";
  const first = await appFetch(url);
  assert.equal(await appFetch(url), first);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.cache, "force-cache");
  assert.equal(calls[0].options.next.revalidate, 60);
  user = { ...user, cacheRevision: "2" };
  assert.notEqual(
    await appFetch(url),
    first,
    "mutation revision invalidates prior data",
  );
  user = { ...user, id: 3, token: "token-3" };
  assert.notEqual(
    await appFetch(url),
    first,
    "different user has separate cache",
  );
  user = null;
  await assert.rejects(appFetch(url), /Authentication/);
  for (const endpoint of [
    "/api/auth/me",
    "/api/users/notifications",
    "/api/users/notifications/stream",
    "/api/users/profile",
    "/api/users/sessions",
    "/api/audit-logs",
    "/api/health",
    "/api/projects/1/export",
  ]) {
    await appFetch("https://backend.example" + endpoint, {
      cache: "force-cache",
      next: { tags: ["sensitive"] },
    });
    const last = calls.at(-1).options;
    assert.equal(last.cache, "no-store", endpoint);
    assert.equal(last.next, undefined);
  }
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    await appFetch(url, { method, cache: "force-cache" });
    assert.equal(calls.at(-1).options.cache, "no-store");
  }
});
test("SQL cache refuses revoked sessions and partitions identity/role/revision", async () => {
  let user = { id: 2, role: "tester", cacheRevision: "1" },
    reads = 0;
  const { scopedCache } = load("src/lib/scoped-cache.ts", {
    "server-only": {},
    "@/app/myUtil": { getCurrentUserSession: async () => user },
    "next/cache": {
      unstable_cache: (read) => {
        const map = new Map();
        return async (...args) => {
          const key = JSON.stringify(args);
          if (!map.has(key)) map.set(key, await read(...args));
          return map.get(key);
        };
      },
    },
  });
  const cached = scopedCache(async (id) => ({ id, read: ++reads }), ["test"], {
    tags: ["projects"],
  });
  const first = await cached(1);
  assert.equal(await cached(1), first);
  user = { ...user, role: "admin" };
  assert.notEqual(await cached(1), first);
  user = { ...user, cacheRevision: "2" };
  await cached(1);
  assert.equal(reads, 3);
  user = null;
  await assert.rejects(cached(1), /Authentication/);
});
test("live authorization reads current roles, token cutoff, device revocation, and DB revision", async () => {
  const credential =
    "header." +
    Buffer.from(JSON.stringify({ sub: 2, iat: 100, sid: "device-2" })).toString(
      "base64url",
    ) +
    ".signature";
  let row = {
    id: 2,
    role: "tester",
    name: "Tester",
    email: "t@example.test",
    revision: "7",
    minTokenIat: 0,
    sessionActive: true,
  };
  const { getCurrentUserSession } = load(
    "src/app/myUtil.ts",
    {
      "@/lib/db": { pool: { query: async () => ({ rows: row ? [row] : [] }) } },
      "next/headers": {
        cookies: async () => ({
          get: (key) =>
            key === "authjs.session-token"
              ? { value: "encrypted-cookie" }
              : undefined,
        }),
      },
      "next-auth/jwt": {
        decode: async () => ({ id: 2, credentialToken: credential }),
      },
    },
    { process: { env: { AUTH_SECRET: "isolated-test" } } },
  );
  assert.equal((await getCurrentUserSession()).cacheRevision, "7");
  row.role = "admin";
  assert.equal((await getCurrentUserSession()).role, "admin");
  row.sessionActive = false;
  assert.equal(await getCurrentUserSession(), null);
  row.sessionActive = true;
  row.minTokenIat = 101;
  assert.equal(await getCurrentUserSession(), null);
  row = null;
  assert.equal(await getCurrentUserSession(), null);
});
