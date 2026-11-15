const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createRequire } = require("node:module");

const projectRoot = path.resolve(__dirname, "..");

function loadTsModule(relPath, mocks = {}, env = {}) {
  const fullPath = path.resolve(projectRoot, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const localRequire = createRequire(fullPath);
  const module = { exports: {} };
  const processShim = {
    env: {
      NEXT_PUBLIC_BASE_URL: "https://backend.example.com",
      ...env,
    },
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("@/")) {
        const mapped = path.resolve(projectRoot, "src", id.slice(2));
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(mapped + ext) && fs.statSync(mapped + ext).isFile()) {
            return loadTsModule(path.relative(projectRoot, mapped + ext), mocks, env);
          }
        }
      }
      if (id.startsWith(".")) {
        const mapped = path.resolve(path.dirname(fullPath), id);
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(mapped + ext) && fs.statSync(mapped + ext).isFile()) {
            return loadTsModule(path.relative(projectRoot, mapped + ext), mocks, env);
          }
        }
      }
      if (id.startsWith("node:")) return require(id);
      return localRequire(id);
    },
    process: processShim,
    console: { log() {}, warn() {}, error() {} },
    fetch: (...args) => globalThis.fetch(...args),
    AbortSignal: globalThis.AbortSignal,
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
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename: fullPath });
  return module.exports;
}

test("getNextTestCaseId queries PostgreSQL beyond 100 rows and avoids force-cache on API fallback", async () => {
  const queries = [];
  const fetches = [];

  const { getNextTestCaseId } = loadTsModule(
    "src/app/(dashboard)/add/test-case.action.ts",
    {
      "@/lib/app-fetch": {
        appFetch: async (url, init) => {
          fetches.push({ url, init });
          return {
            ok: true,
            json: async () => ({ nextId: "TC-0205" }),
          };
        },
      },
      "@/lib/db": {
        pool: {
          query: async (sql, params) => {
            queries.push({ sql, params });
            if (params[0] === 999) {
              throw new Error("Transient DB error");
            }
            return {
              rows: [
                { testId: "TC-0001" },
                { testId: "BUG-0142" },
              ],
            };
          },
        },
      },
      "@/app/myUtil": {
        getCurrentUserSession: async () => ({
          id: 7,
          role: "admin",
          token: "jwt-token",
        }),
      },
      "./test-case-interface": {},
      "next/cache": { revalidatePath() {}, updateTag() {} },
      "@/lib/audit": { recordSystemAuditLog: async () => {} },
    },
  );

  const dbNext = await getNextTestCaseId("Portal", 5);
  assert.equal(dbNext, "TC-0143");
  assert.equal(queries.length, 1);
  assert.equal(fetches.length, 0);

  const apiNext = await getNextTestCaseId("Portal", 999);
  assert.equal(apiNext, "TC-0205");
  assert.equal(fetches.length, 1);
  assert.match(fetches[0].url, /\/api\/test-cases\/next-id\?projectId=999$/);
  assert.equal(fetches[0].init.cache, "no-store");
});

test("addNewTestCase recovers from 503 wake and 409 conflicts with bumped BUG-/TC- IDs", async () => {
  const requests = [];
  let postAttempt = 0;

  const { addNewTestCase } = loadTsModule(
    "src/app/(dashboard)/add/test-case.action.ts",
    {
      "@/lib/app-fetch": {
        appFetch: async (url, init) => {
          requests.push({ url, body: init?.body ? JSON.parse(init.body) : null });
          if (String(url).includes("/api/test-cases/next-id")) {
            return {
              ok: true,
              json: async () => ({ nextId: "TC-0009" }),
            };
          }
          postAttempt += 1;
          if (postAttempt === 1) {
            return { ok: false, status: 503, json: async () => { throw new Error("HTML"); } };
          }
          if (postAttempt === 2) {
            return { ok: false, status: 409, json: async () => ({ message: "Duplicate" }) };
          }
          return { ok: true, status: 201, json: async () => ({ id: 42 }) };
        },
      },
      "@/lib/db": {
        pool: {
          query: async () => ({ rows: [{ testId: "TC-0008" }] }),
        },
      },
      "@/app/myUtil": {
        getCurrentUserSession: async () => ({
          id: 12,
          role: "tester",
          token: "jwt-token",
        }),
      },
      "./test-case-interface": {},
      "next/cache": { revalidatePath() {}, updateTag() {} },
      "@/lib/audit": { recordSystemAuditLog: async () => {} },
    },
  );

  const result = await addNewTestCase({
    testId: "BUG-0009",
    module: "MCIT Portal",
    scenario: "Login test",
    steps: ["Open", "Submit"],
    expectedResult: "Dashboard loads",
    priority: "high",
    status: "failed",
    projectId: 3,
    testerId: 1,
    userId: 1,
  });

  assert.equal(result.success, true);
  assert.equal(postAttempt, 3);
  assert.equal(requests[0].body.testId, "BUG-0009");
  assert.equal(requests[1].body.testId, "BUG-0009");
  assert.equal(requests[2].body.testId, "BUG-0010");
  assert.equal(requests[2].body.testerId, 12);
  assert.equal(requests[2].body.userId, 12);
});

test("authorize normalizes email, retries 503 wake once, and surfaces backend outage distinctly", async () => {
  const mockDb = { query: async () => ({ rows: [] }) };
  const makeMocks = () => ({
    "next-auth": {},
    "next-auth/providers/credentials": (cfg) => cfg,
    "@/lib/db": { pool: mockDb },
    "@/app/login/login.interface": {},
    "@/lib/account-email": {
      isAllowedAccountEmail: (email) =>
        typeof email === "string" && email.endsWith("@mcit.gov.eg"),
    },
  });

  // 1) Transient 503 followed by 200 succeeds and sends trimmed lowercase email
  {
    const bodies = [];
    let calls = 0;
    const mod = loadTsModule("authjsConfig/authjsConfig.ts", makeMocks());
    const prevFetch = global.fetch;
    global.fetch = async (_url, init) => {
      calls += 1;
      bodies.push(JSON.parse(init.body));
      if (calls === 1) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "tok-1",
          sessionId: "sess-1",
          user: { id: 5, name: "Tester", email: "user@mcit.gov.eg", role: "tester" },
        }),
      };
    };

    try {
      const user = await mod.authConfig.providers[0].authorize({
        email: "  User@MCIT.GOV.EG ",
        password: "Secret@123",
      });
      assert.equal(calls, 2);
      assert.equal(bodies[0].email, "user@mcit.gov.eg");
      assert.equal(user.email, "user@mcit.gov.eg");
    } finally {
      global.fetch = prevFetch;
    }
  }

  // 2) Persistent 503 throws BACKEND_UNAVAILABLE instead of masquerading as wrong password
  {
    const mod = loadTsModule("authjsConfig/authjsConfig.ts", makeMocks());
    const prevFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });

    try {
      await assert.rejects(
        () =>
          mod.authConfig.providers[0].authorize({
            email: "user@mcit.gov.eg",
            password: "Secret@123",
          }),
        /BACKEND_UNAVAILABLE/,
      );
    } finally {
      global.fetch = prevFetch;
    }
  }

  // 3) 401 returns null cleanly (wrong credentials)
  {
    const mod = loadTsModule("authjsConfig/authjsConfig.ts", makeMocks());
    const prevFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });

    try {
      const user = await mod.authConfig.providers[0].authorize({
        email: "user@mcit.gov.eg",
        password: "WrongPassword1!",
      });
      assert.equal(user, null);
    } finally {
      global.fetch = prevFetch;
    }
  }
});

test("addNewTestCase falls back cleanly to transactional PostgreSQL on persistent 503 outage and never falls back on 400/403", async () => {
  const prevFetch = global.fetch;
  global.fetch = async () => new Response("Waking", { status: 503 });
  try {
    const executedQueries = [];
    let released = false;
    const txPool = {
      query: async () => ({ rows: [] }),
      connect: async () => ({
        query: async (sql, params = []) => {
          executedQueries.push({ sql, params });
          if (sql.includes("SELECT id FROM projects")) return { rows: [{ id: 5 }] };
          if (sql.includes("FROM project_assignments")) return { rowCount: 1, rows: [{ "?column?": 1 }] };
          if (sql.includes("SELECT id FROM test_cases WHERE")) return { rows: [] };
          if (sql.includes("to_regclass")) return { rows: [{ exec_tbl: "test_executions", current_view: "test_cases_current" }] };
          if (sql.includes("INSERT INTO test_cases")) return { rows: [{ id: 88 }] };
          if (sql.includes("SELECT * FROM test_cases WHERE id")) {
            return {
              rows: [{
                id: 88,
                testId: "TC-0099",
                module: params[1] || "Extended Portal Module Over Fifty Characters Validation",
                projectId: 5,
                testerId: 12,
                status: "pending",
              }],
            };
          }
          if (sql.includes("SELECT name FROM users")) return { rows: [{ name: "Tester" }] };
          if (sql.includes("FROM test_cases_current tc")) {
            return {
              rows: [{
                id: 88,
                testId: "TC-0099",
                module: "Extended Portal Module Over Fifty Characters Long Validation Check Pass",
                steps: JSON.stringify(["Step 1"]),
                tester_id: 12,
                tester_name: "Tester",
                tester_email: "t@mcit.gov.eg",
                project_id: 5,
                project_name: "Portal",
              }],
            };
          }
          return { rows: [] };
        },
        release: () => {
          released = true;
        },
      }),
    };

    const longModule = "Extended Portal Module Over Fifty Characters Long Validation Check Pass";
    const { addNewTestCase } = loadTsModule(
      "src/app/(dashboard)/add/test-case.action.ts",
      {
        "@/lib/app-fetch": {
          appFetch: async () => new Response("<html>503</html>", { status: 503 }),
        },
        "@/lib/db": { pool: txPool },
        "@/app/myUtil": {
          getCurrentUserSession: async () => ({ id: 12, role: "tester", token: "tok" }),
        },
        "./test-case-interface": {},
        "next/cache": { revalidatePath() {}, updateTag() {} },
        "@/lib/audit": { recordSystemAuditLog: async () => {} },
      },
    );

    const res503 = await addNewTestCase({
      testId: "TC-0099",
      module: longModule,
      scenario: "Verify long module name persists across direct PostgreSQL fallback",
      steps: ["Open", "Submit"],
      expectedResult: "Saved cleanly",
      priority: "high",
      status: "failed",
      projectId: 5,
    });

    assert.equal(res503.success, true);
    assert.equal(released, true);
    const insertCase = executedQueries.find((q) => q.sql.includes("INSERT INTO test_cases"));
    assert.equal(insertCase.params[1], longModule);
    const insertExec = executedQueries.find((q) => q.sql.includes("INSERT INTO test_executions"));
    assert.ok(insertExec, "Expected compatibility row inserted during 503 fallback");
    assert.ok(executedQueries.some((q) => q.sql === "COMMIT"));

    // 403/400 from backend must NEVER run DB fallback
    const queriesBefore403 = executedQueries.length;
    const { addNewTestCase: addOn403 } = loadTsModule(
      "src/app/(dashboard)/add/test-case.action.ts",
      {
        "@/lib/app-fetch": {
          appFetch: async () =>
            new Response(JSON.stringify({ message: "Project access denied" }), {
              status: 403,
              headers: { "content-type": "application/json" },
            }),
        },
        "@/lib/db": { pool: txPool },
        "@/app/myUtil": {
          getCurrentUserSession: async () => ({ id: 12, role: "tester", token: "tok" }),
        },
        "./test-case-interface": {},
        "next/cache": { revalidatePath() {}, updateTag() {} },
        "@/lib/audit": { recordSystemAuditLog: async () => {} },
      },
    );

    const res403 = await addOn403({
      testId: "TC-0100",
      module: longModule,
      scenario: "Verify 403 stops without fallback",
      steps: ["Open"],
      expectedResult: "Denied",
      priority: "medium",
      status: "pending",
      projectId: 5,
    });
    assert.equal(res403.success, false);
    assert.equal(res403.message, "Project access denied");
    assert.equal(executedQueries.length, queriesBefore403);
  } finally {
    global.fetch = prevFetch;
  }
});

test("getTestCaseSchema validates module length/characters and >=5 char scenarios cleanly", () => {
  const { getTestCaseSchema } = loadTsModule("src/app/(dashboard)/add/test-case.zod.ts");
  const enSchema = getTestCaseSchema("en");
  const baseValid = {
    testId: "TC-0001",
    module: "Extended Portal Application Module Exceeding Fifty Characters Validation Check",
    pageName: "Login",
    scenario: "Verify login succeeds with valid credentials",
    steps: ["Enter email", "Click login"],
    expectedResult: "Dashboard loads",
    priority: "high",
    status: "pending",
    projectId: 1,
  };

  assert.equal(enSchema.safeParse(baseValid).success, true);

  const shortScenario = enSchema.safeParse({ ...baseValid, scenario: "abc" });
  assert.equal(shortScenario.success, false);

  const shortModule = enSchema.safeParse({ ...baseValid, module: "A" });
  assert.equal(shortModule.success, false);
});
