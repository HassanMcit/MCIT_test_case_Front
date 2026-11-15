const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTsModule(relPath, mocks = {}, env = {}, extraGlobals = {}) {
  const fullPath = path.resolve(__dirname, "..", relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("node:")) return require(id);
      return require(id);
    },
    process: { env: { ...env } },
    console: { log() {}, warn() {}, error() {} },
    fetch: (...args) => globalThis.fetch(...args),
    AbortController: globalThis.AbortController,
    AbortSignal: globalThis.AbortSignal,
    TextDecoder: globalThis.TextDecoder,
    URL,
    Headers,
    Response,
    Promise,
    Error,
    Number,
    String,
    Boolean,
    Array,
    Math,
    JSON,
    Date,
    Set,
    Map,
    Buffer,
    Event: globalThis.Event,
    setTimeout,
    clearTimeout,
    ...extraGlobals,
  };

  vm.runInNewContext(outputText, sandbox, { filename: fullPath });
  return module.exports;
}

test("AuthenticatedEventSource emits UNAUTHORIZED on 401 and settles to CLOSED on failures", async () => {
  let nextFetch;
  const { AuthenticatedEventSource } = loadTsModule(
    "src/lib/authenticated-event-source.ts",
    {},
    {},
    {
      fetch: (...args) => nextFetch(...args),
    },
  );

  nextFetch = async () => new Response(null, { status: 401 });
  const unauthorizedMessages = [];
  let unauthorizedErrors = 0;
  const es401 = new AuthenticatedEventSource("https://api.example.com/stream", "tok");
  es401.onmessage = (event) => unauthorizedMessages.push(JSON.parse(event.data));
  es401.onerror = () => {
    unauthorizedErrors++;
  };
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.deepEqual(unauthorizedMessages, [{ type: "UNAUTHORIZED" }]);
  assert.equal(es401.readyState, AuthenticatedEventSource.CLOSED);
  assert.equal(unauthorizedErrors, 0);

  nextFetch = async () => new Response(null, { status: 503 });
  let err503 = 0;
  const es503 = new AuthenticatedEventSource("https://api.example.com/stream", "tok");
  es503.onerror = () => {
    err503++;
  };
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(err503, 1);
  assert.equal(es503.readyState, AuthenticatedEventSource.CLOSED);

  nextFetch = async () => {
    throw new Error("network sleep");
  };
  let errNet = 0;
  const esNet = new AuthenticatedEventSource("https://api.example.com/stream", "tok");
  esNet.onerror = () => {
    errNet++;
  };
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(errNet, 1);
  assert.equal(esNet.readyState, AuthenticatedEventSource.CLOSED);
});

test("raceBackendFetch skips Cloudflare background after() when keepAliveInBackground is false", async () => {
  const afterCallbacks = [];
  const { raceBackendFetch } = loadTsModule(
    "src/lib/fast-read.ts",
    {
      "next/server": {
        after: (fn) => afterCallbacks.push(fn),
      },
      "@/lib/db": { pool: { query: async () => ({ rows: [] }) } },
      "@/lib/scoped-cache": { scopedCache: (fn) => fn },
      "@/lib/avatar": loadTsModule("src/lib/avatar.ts"),
      "@/lib/app-fetch": { appFetch: async () => new Response(null) },
      "@/app/myUtil": {
        getCurrentUserSession: async () => null,
        getUserToken: async () => null,
      },
    },
    { MCIT_CLOUDFLARE: "true" },
  );

  await raceBackendFetch(Promise.resolve(new Response("ok")), 500, false);
  assert.equal(afterCallbacks.length, 0);

  const fastReadSrc = fs.readFileSync(
    path.resolve(__dirname, "..", "src", "lib", "fast-read.ts"),
    "utf8",
  );
  const expectsAfter = fastReadSrc.includes("next/server");
  await raceBackendFetch(Promise.resolve(new Response("ok")), 500);
  assert.equal(afterCallbacks.length, expectsAfter ? 1 : 0);
});

test("avatar route degrades to 503 on session outage, 302s external https URLs, and uses long immutable cache on versioned DB photos", async () => {
  let sessionImpl = async () => {
    throw new Error("Database temporarily waking");
  };
  let dbQueryImpl = async () => ({ rows: [] });

  const { GET } = loadTsModule("src/app/api/avatar/[id]/route.ts", {
    "@/app/myUtil": {
      getCurrentUserSession: () => sessionImpl(),
    },
    "@/lib/db": {
      pool: {
        query: (...args) => dbQueryImpl(...args),
      },
    },
    "@/lib/avatar": require("path") && loadTsModule("src/lib/avatar.ts"),
  });

  const res503 = await GET(new Request("https://app.example.com/api/avatar/1"), {
    params: Promise.resolve({ id: "1" }),
  });
  assert.equal(res503.status, 503);

  sessionImpl = async () => ({ id: "1", role: "tester" });
  dbQueryImpl = async () => ({
    rows: [{ photo: "https://cdn.example.com/user-1.png" }],
  });
  const resRedirect = await GET(new Request("https://app.example.com/api/avatar/1"), {
    params: Promise.resolve({ id: "1" }),
  });
  assert.equal(resRedirect.status, 302);
  assert.equal(resRedirect.headers.get("location"), "https://cdn.example.com/user-1.png");

  const oneByTwoPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==";
  dbQueryImpl = async () => ({
    rows: [{ photo: `data:image/png;base64,${oneByTwoPngBase64}` }],
  });
  const resImmutable = await GET(
    new Request("https://app.example.com/api/avatar/1?v=abc12345"),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resImmutable.status, 200);
  assert.equal(
    resImmutable.headers.get("cache-control"),
    "private, max-age=604800, immutable",
  );
});

test("static icons, action body limit, profile normalization, and anti-polling guards remain intact", () => {
  const root = path.resolve(__dirname, "..");
  assert.equal(fs.existsSync(path.join(root, "public", "icon.png")), true);
  assert.equal(fs.existsSync(path.join(root, "public", "apple-icon.png")), true);
  assert.equal(fs.existsSync(path.join(root, "src", "app", "icon.png")), false);
  assert.equal(fs.existsSync(path.join(root, "src", "app", "apple-icon.png")), false);

  const nextConfig = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
  assert.match(nextConfig, /bodySizeLimit:\s*["']4mb["']/);

  const navbarSource = fs.readFileSync(
    path.join(root, "src", "components", "Navbar", "Navbar.tsx"),
    "utf8",
  );
  assert.equal(navbarSource.includes('setUploadImage("/avatar.png")'), false);
  assert.doesNotMatch(navbarSource, /new EventSource\(/);
  assert.doesNotMatch(navbarSource, /,\s*5_?000\s*\)/);

  const navbarActionSource = fs.readFileSync(
    path.join(root, "src", "components", "Navbar", "navbar.action.ts"),
    "utf8",
  );
  assert.match(navbarActionSource, /normalizeApiUserPhoto/);

  const dashboardActionSource = fs.readFileSync(
    path.join(root, "src", "app", "(dashboard)", "dashboard", "dashboard.action.ts"),
    "utf8",
  );
  assert.match(dashboardActionSource, /normalizeApiUserPhoto/);
  assert.doesNotMatch(dashboardActionSource, /resolveAvatarForDisplay/);
});
