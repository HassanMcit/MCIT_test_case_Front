const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");

function loadTsModule(relPath, mocks = {}, env = {}) {
  const fullPath = path.resolve(root, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const localRequire = createRequire(fullPath);
  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("@/")) {
        const mapped = path.resolve(root, "src", id.slice(2));
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (
            fs.existsSync(mapped + ext) &&
            fs.statSync(mapped + ext).isFile()
          ) {
            return loadTsModule(path.relative(root, mapped + ext), mocks, env);
          }
        }
      }
      if (id.startsWith(".")) {
        const mapped = path.resolve(path.dirname(fullPath), id);
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (
            fs.existsSync(mapped + ext) &&
            fs.statSync(mapped + ext).isFile()
          ) {
            return loadTsModule(path.relative(root, mapped + ext), mocks, env);
          }
        }
      }
      return localRequire(id);
    },
    process: { env: { ...env } },
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
    Buffer,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename: fullPath });
  return mod.exports;
}

function loadClientComponent(relPath, lang = "en", sourceTransform) {
  const cache = new Map();
  const creatorUser = {
    id: 20,
    name: "Alaa Eldin Mohsen",
    email: "alaa@example.invalid",
    role: "tester",
    assignedProjects: [],
  };
  const session = {
    data: { user: creatorUser },
    status: "authenticated",
    update() {},
  };

  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const localRequire = createRequire(file);

    function req(id) {
      if (id === "react") return React;
      if (
        /\.action$|\.services$|^server-only$|^next\/headers$|^@\/app\/myUtil$/.test(
          id,
        )
      ) {
        return new Proxy(
          {},
          {
            get: (_, name) =>
              name === "__esModule" ? true : async () => ({ success: true }),
          },
        );
      }
      if (id === "next-auth/react") {
        return {
          useSession: () => session,
          SessionProvider: ({ children }) => children,
        };
      }
      if (id === "next/navigation") {
        return {
          usePathname: () => "/test-cases",
          useRouter: () => ({ push() {}, refresh() {}, replace() {} }),
          useSearchParams: () => new URLSearchParams(),
        };
      }
      if (id === "next/link") {
        return {
          __esModule: true,
          default: ({ href, children, ...props }) =>
            React.createElement("a", { href, ...props }, children),
        };
      }
      if (id === "next/image") {
        return {
          __esModule: true,
          default: (props) => React.createElement("img", props),
        };
      }
      if (id === "@/context/language-context") {
        return {
          useLanguage: () => ({
            lang,
            dir: lang === "ar" ? "rtl" : "ltr",
            isRTL: lang === "ar",
            t: (key) => key,
          }),
        };
      }
      if (id.startsWith("@/") || id.startsWith(".")) {
        const base = id.startsWith("@/")
          ? path.join(root, "src", id.slice(2))
          : path.resolve(path.dirname(file), id);
        for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
          const target = base + ext;
          if (fs.existsSync(target) && fs.statSync(target).isFile()) {
            return load(target);
          }
        }
      }
      return localRequire(id);
    }

    const rawSource = fs.readFileSync(file, "utf8");
    const transformedSource =
      typeof sourceTransform === "function"
        ? sourceTransform(rawSource, file)
        : rawSource;
    const code = ts.transpileModule(transformedSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;

    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
      filename: file,
    })(req, mod, mod.exports);

    return mod.exports;
  }

  return load(path.resolve(root, relPath));
}

test("getTestCaseCreatedTimestamp and mergeUpdatedTestCaseRecord never overwrite creator or createdAt on update", () => {
  const mod = loadTsModule("src/lib/test-case-timestamps.ts");
  const createdAt = "2026-11-12T10:00:00.000Z";
  const updateAt = "2026-11-14T22:26:00.000Z";

  const existing = {
    id: 42,
    testId: "TC-0042",
    scenario: "Old scenario",
    status: "pending",
    actualResult: null,
    notes: null,
    tester: {
      id: 20,
      userId: 20,
      name: "Alaa Eldin Mohsen",
      email: "alaa@example.invalid",
    },
    testerId: 20,
    userId: 20,
    createdAt,
    executedAt: createdAt,
    updatedAt: createdAt,
    updatedById: null,
    updatedBy: null,
  };

  // Even if backend payload returns updater as tester and new executedAt/createdAt
  const maliciousBackendResponse = {
    id: 42,
    tester: {
      id: 30,
      userId: 30,
      name: "Hassan Ali",
      email: "hassan@example.invalid",
    },
    testerId: 30,
    userId: 30,
    createdAt: updateAt,
    executedAt: updateAt,
    updatedAt: updateAt,
    updatedById: 30,
    status: "failed",
    actualResult: "Broken button",
  };

  const mergedNoStatusChange = mod.mergeUpdatedTestCaseRecord(
    existing,
    maliciousBackendResponse,
    { scenario: "Edited scenario" },
    {
      nowIso: updateAt,
      currentUpdater: {
        id: 30,
        userId: 30,
        name: "Hassan Ali",
        email: "hassan@example.invalid",
      },
      executionChanged: false,
    },
  );

  assert.equal(mergedNoStatusChange.tester.name, "Alaa Eldin Mohsen");
  assert.equal(mergedNoStatusChange.testerId, 20);
  assert.equal(mergedNoStatusChange.createdAt, createdAt);
  assert.equal(mergedNoStatusChange.executedAt, createdAt);
  assert.equal(mergedNoStatusChange.updatedBy.name, "Hassan Ali");
  assert.equal(mergedNoStatusChange.updatedAt, updateAt);
  assert.equal(
    mod.getTestCaseCreatedTimestamp(mergedNoStatusChange),
    createdAt,
  );
  assert.equal(
    mod.getTestCaseModalCreatedTimestamp(mergedNoStatusChange),
    createdAt,
  );
  assert.equal(mod.getTestCaseSortTimestamp(mergedNoStatusChange), createdAt);

  // When outcome changed at updateAt, executedAt updates for history/dashboard,
  // while creator + createdAt display timestamps remain at createdAt!
  const mergedWithStatusChange = mod.mergeUpdatedTestCaseRecord(
    existing,
    maliciousBackendResponse,
    { status: "failed", actualResult: "Broken button" },
    {
      nowIso: updateAt,
      currentUpdater: {
        id: 30,
        userId: 30,
        name: "Hassan Ali",
        email: "hassan@example.invalid",
      },
      executionChanged: true,
    },
  );

  assert.equal(mergedWithStatusChange.tester.name, "Alaa Eldin Mohsen");
  assert.equal(mergedWithStatusChange.createdAt, createdAt);
  assert.equal(mergedWithStatusChange.executedAt, updateAt);
  assert.equal(mergedWithStatusChange.updatedAt, updateAt);
  assert.equal(
    mod.getTestCaseCreatedTimestamp(mergedWithStatusChange),
    createdAt,
  );
  assert.equal(
    mod.getTestCaseModalCreatedTimestamp(mergedWithStatusChange),
    createdAt,
  );
});

test("workbook import metadata timestamps stay authoritative before createdAt/executedAt", () => {
  const mod = loadTsModule("src/lib/test-case-timestamps.ts");
  const imported = {
    createdAt: "2026-11-12T10:00:00.000Z",
    executedAt: "2026-11-15T00:26:00.000Z",
    importMetadata: {
      plannedAt: "2026-11-01T08:00:00.000Z",
      importedAt: "2026-11-05T09:30:00.000Z",
    },
  };

  assert.equal(
    mod.getTestCaseCreatedTimestamp(imported),
    "2026-11-01T08:00:00.000Z",
  );
  assert.equal(
    mod.getTestCaseModalCreatedTimestamp(imported),
    "2026-11-05T09:30:00.000Z",
  );
  assert.equal(
    mod.getTestCaseSortTimestamp(imported),
    "2026-11-05T09:30:00.000Z",
  );
});

test("updateTestCase action strips creator/createdAt from backend response and forwards empty-string clears", async () => {
  let capturedPatchBody = null;
  let dbUpdated = false;

  const actions = loadTsModule(
    "src/app/(dashboard)/test-cases/test-cases.action.ts",
    {
      "@/lib/app-fetch": {
        appFetch: async (_url, init) => {
          capturedPatchBody = JSON.parse(init.body);
          return new Response(
            JSON.stringify({
              id: 55,
              testerId: 30,
              userId: 30,
              tester: {
                id: 30,
                name: "Hassan Ali",
                email: "hassan@example.invalid",
              },
              createdAt: "2026-11-15T00:26:00.000Z",
              updatedAt: "2026-11-15T00:26:00.000Z",
              updatedById: 30,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        },
      },
      "@/lib/db": {
        pool: {
          query: async () => {
            dbUpdated = true;
            return { rows: [] };
          },
        },
      },
      "@/lib/fast-read": {
        queryTestCasesFromDb: async () => ({
          data: [],
          meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
        }),
      },
      "@/app/myUtil": {
        getCurrentUserSession: async () => ({
          id: "30",
          token: "tok-30",
          role: "admin",
        }),
        getUserToken: async () => "tok-30",
      },
      "next/cache": {
        revalidatePath() {},
        updateTag() {},
      },
      "@/lib/audit": {
        recordSystemAuditLog: async () => {},
      },
    },
    { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
  );

  const res = await actions.updateTestCase(55, {
    scenario: "Updated scenario",
    actualResult: "",
    notes: "",
  });

  assert.equal(res.success, true);
  assert.equal(dbUpdated, true);
  assert.equal(capturedPatchBody.actualResult, "");
  assert.equal(capturedPatchBody.notes, "");
  assert.equal(capturedPatchBody.status, undefined);
  assert.equal("tester" in res.data, false);
  assert.equal("testerId" in res.data, false);
  assert.equal("userId" in res.data, false);
  assert.equal("createdAt" in res.data, false);
});

test("TestCasesTable SSR renders creator createdAt instead of later updatedAt/executedAt in TESTER & TIME", () => {
  const tableMod = loadClientComponent(
    "src/app/(dashboard)/test-cases/TestCasesTable.tsx",
    "en",
  );
  const TestCasesTable = tableMod.default;
  const formatActionTimestamp = tableMod.formatActionTimestamp;

  const createdAt = "2026-11-12T10:15:00.000Z";
  const updatedAt = "2026-11-14T22:26:00.000Z";
  const expectedCreatedStr = formatActionTimestamp(createdAt, "en");
  const expectedUpdatedStr = formatActionTimestamp(updatedAt, "en");
  assert.notEqual(expectedCreatedStr, expectedUpdatedStr);

  const html = renderToStaticMarkup(
    React.createElement(TestCasesTable, {
      initialData: {
        data: [
          {
            id: 99,
            testId: "TC-0099",
            module: "Portal",
            pageName: "Login",
            scenario: "Verify login after update",
            steps: ["Open login"],
            expectedResult: "Logged in",
            actualResult: "Failed with 500",
            priority: "high",
            status: "failed",
            severity: "high",
            notes: null,
            executedAt: updatedAt, // backend updated execution timestamp at update time!
            createdAt, // original creation timestamp!
            updatedAt,
            testerId: 20,
            userId: 20,
            tester: {
              id: 20,
              userId: 20,
              name: "Alaa Eldin Mohsen",
              email: "alaa@example.invalid",
            },
            updatedById: 30,
            updatedBy: {
              id: 30,
              userId: 30,
              name: "Hassan Ali",
              email: "hassan@example.invalid",
            },
            projectId: 1,
            project: { id: 1, name: "Portal" },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      allProjects: [
        {
          id: 1,
          name: "Portal",
          application: "Web",
          environment: "staging",
          status: "active",
          createdAt,
          updatedAt,
        },
      ],
    }),
  );

  assert.ok(
    html.includes("Alaa Eldin Mohsen"),
    "Expected creator name in TESTER & TIME cell",
  );
  assert.ok(
    html.includes("Hassan Ali"),
    "Expected updater name in amber Updated by box",
  );
  assert.ok(
    html.includes(expectedCreatedStr),
    `Expected creation time "${expectedCreatedStr}" to appear under creator`,
  );
  // Count occurrences of expectedUpdatedStr — it must appear ONLY inside the Updated by badge, NOT duplicated as creation time!
  const updatedMatches = html.split(expectedUpdatedStr).length - 1;
  assert.equal(
    updatedMatches,
    1,
    `Expected update timestamp "${expectedUpdatedStr}" once (in Updated by badge only), got ${updatedMatches}`,
  );
});

test("TestCasesTable Defect Modal (Arabic RTL) and DashboardClient Defect Modal show createdAt before executedAt", () => {
  const createdAt = "2026-11-12T10:15:00.000Z";
  const updatedAt = "2026-11-14T22:26:00.000Z";
  const defectCase = {
    id: 105,
    testId: "BUG-0105",
    module: "Portal",
    pageName: "Profile",
    scenario: "Verify defect modal keeps creator time",
    steps: ["Step 1"],
    expectedResult: "Works",
    actualResult: "Fails",
    priority: "critical",
    status: "failed",
    severity: "high",
    notes: "Edited later",
    executedAt: updatedAt,
    createdAt,
    updatedAt,
    testerId: 20,
    userId: 20,
    tester: {
      id: 20,
      userId: 20,
      name: "Alaa Eldin Mohsen",
      email: "alaa@example.invalid",
    },
    updatedById: 30,
    updatedBy: {
      id: 30,
      userId: 30,
      name: "Hassan Ali",
      email: "hassan@example.invalid",
    },
    projectId: 1,
    project: { id: 1, name: "Portal" },
  };

  // 1) Arabic RTL TestCasesTable with Defect Modal pre-opened
  const arTableMod = loadClientComponent(
    "src/app/(dashboard)/test-cases/TestCasesTable.tsx",
    "ar",
    (src, file) =>
      file.endsWith("TestCasesTable.tsx")
        ? src.replace(
            "const [selectedItem, setSelectedItem] = useState<TestCaseItem | null>(null);",
            `const [selectedItem, setSelectedItem] = useState<TestCaseItem | null>(${JSON.stringify(defectCase)});`,
          )
        : src,
  );
  const arCreatedStr = arTableMod.formatActionTimestamp(createdAt, "ar");
  const arUpdatedStr = arTableMod.formatActionTimestamp(updatedAt, "ar");
  const arHtml = renderToStaticMarkup(
    React.createElement(arTableMod.default, {
      initialData: {
        data: [defectCase],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
      allProjects: [
        {
          id: 1,
          name: "Portal",
          application: "Web",
          environment: "staging",
          status: "active",
          createdAt,
          updatedAt,
        },
      ],
    }),
  );

  // Should appear in both table cell AND Defect Modal (2 times), while arUpdatedStr appears ONLY inside the two Updated badges (2 times), never 3 or 4 times!
  assert.equal(arHtml.split(arCreatedStr).length - 1, 2);
  assert.equal(arHtml.split(arUpdatedStr).length - 1, 2);

  // 2) DashboardClient with Defect Modal pre-opened
  const dashMod = loadClientComponent(
    "src/app/(dashboard)/dashboard/DashboardClient.tsx",
    "en",
    (src, file) =>
      file.endsWith("DashboardClient.tsx")
        ? src.replace(
            "const [selectedDefect, setSelectedDefect] = useState<TestCaseItem | null>(null);",
            `const [selectedDefect, setSelectedDefect] = useState<TestCaseItem | null>(${JSON.stringify(defectCase)});`,
          )
        : src,
  );
  const enCreatedStr = arTableMod.formatActionTimestamp(createdAt, "en");
  const enUpdatedStr = arTableMod.formatActionTimestamp(updatedAt, "en");
  const dashHtml = renderToStaticMarkup(
    React.createElement(dashMod.default, {
      data: {
        currentUser: defectCase.tester,
        stats: {
          total: 1,
          passed: 0,
          failed: 1,
          pending: 0,
          passRate: 0,
          totalProjects: 1,
        },
        chartData: [],
        severityData: { totalFailed: 1, breakdown: [] },
        projects: [
          {
            id: 1,
            name: "Portal",
            application: "Web",
            environment: "staging",
            status: "active",
            assignedUsers: [],
            testCases: [],
            _count: { testCases: 1 },
            createdAt,
            updatedAt,
          },
        ],
        testCases: [defectCase],
        usersOverview: [
          {
            ...defectCase.tester,
            role: "tester",
            assignedProjects: [],
            _count: { testCases: 1, assignedProjects: 1 },
          },
        ],
      },
    }),
  );

  assert.ok(
    dashHtml.includes(enCreatedStr),
    "Expected Dashboard Defect Modal to show createdAt under creator",
  );
  assert.equal(dashHtml.split(enUpdatedStr).length - 1, 2); // Recent table Updated badge + Defect Modal Last Updated badge
});

test("hasTestCaseBeenUpdated ignores legacy 2026-10-22 backfill and detects real edits", () => {
  const mod = loadTsModule("src/lib/test-case-timestamps.ts");
  assert.equal(
    mod.hasTestCaseBeenUpdated({
      createdAt: "2026-10-22T09:00:00.000Z",
      updatedAt: "2026-10-22T18:00:00.000Z",
      updatedBy: { id: 1, name: "Hassan Ali" },
      updatedById: 1,
    }),
    false,
  );
  assert.equal(
    mod.hasTestCaseBeenUpdated({
      createdAt: "2026-11-15T00:26:00.000Z",
      updatedAt: "2026-11-15T00:26:01.000Z",
    }),
    false,
  );
  assert.equal(
    mod.hasTestCaseBeenUpdated({
      createdAt: "2026-11-10T10:00:00.000Z",
      updatedAt: "2026-11-15T12:26:00.000Z",
      updatedById: 1,
    }),
    true,
  );
  assert.equal(
    mod.hasTestCaseBeenUpdated({
      createdAt: "2026-11-10T10:00:00.000Z",
      updatedAt: "2026-11-15T12:26:00.000Z",
    }),
    true,
  );
});

test("DashboardClient recent rows, active defects badge, and sort keep creation timestamp separate from executedAt/updatedAt", () => {
  const olderCreated = "2026-11-10T10:00:00.000Z";
  const newerCreated = "2026-11-12T10:00:00.000Z";
  const laterReExecutedAt = "2026-11-15T14:26:00.000Z";

  const editedOlderDefect = {
    id: 201,
    testId: "TC-0201",
    module: "Portal",
    pageName: "Profile",
    scenario: "Verify avatar",
    preConditions: "",
    steps: ["Open profile"],
    expectedResult: "Shows avatar",
    actualResult: "Broken image after update",
    priority: "high",
    status: "failed",
    severity: "high",
    notes: "Edited later by Hassan Ali",
    executedAt: laterReExecutedAt,
    createdAt: olderCreated,
    updatedAt: laterReExecutedAt,
    testerId: 20,
    updatedById: 1,
    projectId: 1,
    tester: { id: 20, userId: 20, name: "Alaa Eldin Mohsen", email: "alaa@example.invalid" },
    updatedBy: { id: 1, userId: 1, name: "Hassan Ali", email: "hassan@example.invalid" },
    project: { id: 1, name: "Portal" },
  };
  const newerPassedCase = {
    id: 202,
    testId: "TC-0202",
    module: "Portal",
    pageName: "Login",
    scenario: "Verify login",
    preConditions: "",
    steps: ["Submit credentials"],
    expectedResult: "Logs in",
    actualResult: "OK",
    priority: "medium",
    status: "passed",
    severity: null,
    notes: null,
    executedAt: newerCreated,
    createdAt: newerCreated,
    updatedAt: newerCreated,
    testerId: 20,
    updatedById: null,
    projectId: 1,
    tester: { id: 20, userId: 20, name: "Alaa Eldin Mohsen", email: "alaa@example.invalid" },
    updatedBy: null,
    project: { id: 1, name: "Portal" },
  };

  const dashMod = loadClientComponent("src/app/(dashboard)/dashboard/DashboardClient.tsx", "en");
  const tableMod = loadClientComponent("src/app/(dashboard)/test-cases/TestCasesTable.tsx", "en");

  const dashHtml = renderToStaticMarkup(
    React.createElement(dashMod.default, {
      data: {
        currentUser: editedOlderDefect.tester,
        stats: { total: 2, passed: 1, failed: 1, pending: 0, passRate: 50, totalProjects: 1 },
        chartData: [],
        severityData: { totalFailed: 1, breakdown: [] },
        projects: [
          {
            id: 1,
            name: "Portal",
            application: "Web",
            environment: "staging",
            status: "active",
            assignedUsers: [],
            testCases: [],
            _count: { testCases: 2 },
            createdAt: olderCreated,
            updatedAt: laterReExecutedAt,
          },
        ],
        testCases: [editedOlderDefect, newerPassedCase],
        usersOverview: [
          {
            ...editedOlderDefect.tester,
            role: "tester",
            assignedProjects: [],
            _count: { testCases: 2, assignedProjects: 1 },
          },
        ],
      },
    }),
  );

  // Recent Test Cases table row displays creation date (Nov 10, 2026) AND separate Updated by Hassan Ali timestamp
  const olderShortDate = new Date(olderCreated).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const updatedStr = tableMod.formatActionTimestamp(laterReExecutedAt, "en");
  const olderDefectDayOnly = new Date(olderCreated).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const laterReExecutedDayOnly = new Date(laterReExecutedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  assert.ok(dashHtml.includes(olderShortDate), "Expected Recent table row to display creation date");
  assert.ok(dashHtml.includes(updatedStr), "Expected Recent table row to display Updated timestamp");
  assert.ok(dashHtml.includes(olderDefectDayOnly), "Expected Active Defects card to display creation date");
  assert.ok(!dashHtml.includes(`>${laterReExecutedDayOnly}<`), "Active Defects card must not switch date badge to re-execution day");

  // Creation sort order places TC-0202 (created Nov 12) before TC-0201/BUG-0201 (created Nov 10 even though updated Nov 15) inside the Recent Test Cases table
  const tableStartIdx = dashHtml.indexOf("<table");
  assert.ok(tableStartIdx > -1, "Expected Recent Test Cases table in DashboardClient markup");
  const recentTableHtml = dashHtml.slice(tableStartIdx);
  const idxNewer = recentTableHtml.indexOf("TC-0202");
  const idxOlder = recentTableHtml.indexOf("Verify avatar");
  assert.ok(idxNewer > -1 && idxOlder > -1, "Expected both rows inside Recent Test Cases table");
  assert.ok(
    idxNewer < idxOlder,
    "Expected TC-0202 (newer createdAt) to appear before TC-0201/BUG-0201 in Recent Test Cases table",
  );
});

test("EmailComposer bug templates fall back to creation timestamp instead of current clock when executedAt is null", () => {
  const emailMod = loadClientComponent("src/app/(dashboard)/test-cases/email/EmailComposer.tsx", "en");
  const createdAt = "2026-11-10T10:00:00.000Z";
  const expectedFormatted = emailMod.formatReportDate(createdAt, "en");
  const currentYear = String(new Date().getFullYear());
  const tc = {
    id: 301,
    testId: "TC-0301",
    module: "Portal",
    pageName: "Login",
    scenario: "Login fails",
    preConditions: "",
    steps: ["Open login"],
    expectedResult: "Dashboard loads",
    actualResult: "500 Error",
    priority: "high",
    status: "failed",
    severity: "high",
    notes: "",
    executedAt: null,
    createdAt,
    updatedAt: createdAt,
    tester: { id: 20, userId: 20, name: "Alaa Eldin Mohsen", email: "alaa@example.invalid" },
    project: { id: 1, name: "Portal" },
  };

  const textBody = emailMod.generateBugTextTemplate(tc, "en", "Hassan Ali");
  const htmlBody = emailMod.generateBugHtmlTemplate(tc, "en", "Hassan Ali");

  assert.ok(textBody.includes(expectedFormatted), `Expected text template to use ${expectedFormatted}`);
  assert.ok(htmlBody.includes(expectedFormatted), `Expected HTML template to use ${expectedFormatted}`);
  if (currentYear !== "2026") {
    assert.ok(!textBody.includes(currentYear));
  }
});

test("fast-read and Excel export read test_cases_current while preserving base_tc.testerId creator", async () => {
  const recordedQueries = [];
  const syntheticPool = {
    async query(sql, params = []) {
      recordedQueries.push({ sql, params });
      if (sql.includes("to_regclass('public.test_cases_current')")) {
        return { rows: [{ reg: "test_cases_current" }] };
      }
      if (sql.includes("COUNT(*)::int AS total")) {
        return { rows: [{ total: 1 }] };
      }
      if (sql.includes("FROM test_cases_current tc") && sql.includes("to_jsonb(tc) AS tc_json")) {
        return {
          rows: [
            {
              creator_tester_id: 20,
              tc_json: {
                id: 501,
                testId: "TC-0501",
                module: "Portal",
                pageName: "Auth",
                scenario: "Verify edit preserves creator",
                preConditions: null,
                steps: JSON.stringify(["Step 1"]),
                expectedResult: "Passes",
                actualResult: "Updated by Hassan",
                priority: "high",
                status: "failed",
                severity: "high",
                notes: "Updated outcome",
                executedAt: "2026-11-15T12:26:00.000Z",
                testerId: 1, // Executor on test_cases_current view
                updatedById: 1,
                projectId: 1,
                createdAt: "2026-11-10T09:00:00.000Z",
                updatedAt: "2026-11-15T12:26:00.000Z",
              },
              proj_json: { id: 1, name: "Portal" },
              import_json: null,
            },
          ],
        };
      }
      if (sql.includes("FROM users u")) {
        return {
          rows: [
            { id: 1, name: "Hassan Ali", email: "hassan@example.invalid", updatedAt: "2026-11-15T00:00:00.000Z", photo: null, profileImage: null },
            { id: 20, name: "Alaa Eldin Mohsen", email: "alaa@example.invalid", updatedAt: "2026-11-10T00:00:00.000Z", photo: null, profileImage: null },
          ],
        };
      }
      if (sql.includes("FROM test_cases_current") && sql.includes("GROUP BY")) {
        return {
          rows: [{ projectId: 1, mod_key: "portal", status: "failed", cnt: 1 }],
        };
      }
      if (sql.includes("FROM projects p ORDER BY")) {
        return {
          rows: [{ p_json: { id: 1, name: "Portal", application: "Web", environment: "staging", status: "active", createdAt: "2026-11-10T00:00:00.000Z" } }],
        };
      }
      if (sql.includes("SELECT pa.id AS pa_id") && sql.includes("FROM project_assignments pa")) {
        return { rows: [] };
      }
      if (sql.includes("FROM projects p") && sql.includes("WHERE p.id = $1")) {
        return { rows: [{ id: 1, name: "Portal", application: "Web", assigned_lead: "" }] };
      }
      if (sql.includes("FROM test_cases_current tc") && sql.includes("tester_name")) {
        return {
          rows: [
            {
              id: 501,
              testId: "TC-0501",
              module: "Portal",
              pageName: "Auth",
              scenario: "Verify edit preserves creator",
              preConditions: null,
              steps: JSON.stringify(["Step 1"]),
              expectedResult: "Passes",
              actualResult: "Updated by Hassan",
              status: "failed",
              priority: "high",
              severity: "high",
              notes: "Updated outcome",
              executedAt: "2026-11-15T12:26:00.000Z",
              createdAt: "2026-11-10T09:00:00.000Z",
              tester_name: "Alaa Eldin Mohsen",
              proj_name: "Portal",
              proj_app: "Web",
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const fastRead = loadTsModule("src/lib/fast-read.ts", {
    "next/server": { after: () => {} },
    "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/scoped-cache": { scopedCache: (fn) => fn, authenticatedSharedCache: (fn) => fn },
    "@/lib/db": { pool: syntheticPool },
  });

  const projList = await fastRead.queryProjectsFromDb({});
  assert.equal(projList[0].stats.failed, 1);

  const nonAdminCases = await fastRead.queryTestCasesFromDb(
    { page: 1, limit: 50 },
    { id: 20, role: "tester" },
  );
  assert.equal(nonAdminCases.data.length, 1);
  assert.equal(nonAdminCases.data[0].testerId, 20);
  assert.equal(nonAdminCases.data[0].tester.name, "Alaa Eldin Mohsen");
  assert.equal(nonAdminCases.data[0].updatedById, 1);
  assert.equal(nonAdminCases.data[0].updatedBy.name, "Hassan Ali");
  assert.equal(nonAdminCases.data[0].status, "failed");

  const countQuery = recordedQueries.find((q) => q.sql.includes("COUNT(*)::int AS total"));
  assert.ok(countQuery.sql.includes("FROM test_cases_current tc LEFT JOIN test_cases base_tc ON base_tc.id = tc.id"));
  assert.ok(countQuery.sql.includes('COALESCE(base_tc."testerId", tc."testerId")'));

  const listQuery = recordedQueries.find((q) => q.sql.includes("to_jsonb(tc) AS tc_json"));
  assert.ok(listQuery.sql.includes('ORDER BY COALESCE(tc."createdAt", tc."executedAt") DESC, tc.id DESC'));

  const exportMod = loadTsModule("src/app/(dashboard)/projects/exportProjectReport.action.ts", {
    "@/lib/db": { pool: syntheticPool },
    "@/app/myUtil": {
      getUserToken: async () => "tok",
      getCurrentUserSession: async () => ({ id: 20, role: "tester", name: "Alaa Eldin Mohsen" }),
    },
    "@/lib/audit": { recordSystemAuditLog: async () => {} },
    "./xlsxTemplateBuilder": {
      buildOfficialQaXlsxBuffer: (reportData) => {
        assert.equal(reportData.testCases[0].testerName, "Alaa Eldin Mohsen");
        assert.equal(reportData.leadTester, "Alaa Eldin Mohsen");
        assert.equal(reportData.testCases[0].status, "failed");
        return { buffer: Buffer.from("ok"), totalCount: 1, passedCount: 0, failedCount: 1, blockedCount: 0, bugsCount: 1 };
      },
    },
  });
  const exported = await exportMod.exportProjectExcelAction({
    fromDate: "2026-11-14",
    toDate: "2026-11-16",
    tzOffsetMinutes: -120,
  });
  assert.equal(exported.success, true, exported.message || "Expected export success");
  const exportQuery = recordedQueries.find((q) => q.sql.includes("tester_name"));
  assert.ok(exportQuery.sql.includes('LEFT JOIN users u ON COALESCE(base_tc."testerId", tc."testerId") = u.id'));
});

test("updateTestCase retries 503 outage, preserves 80-char module, clears pageName/preConditions, and deleteTestCase retries 503", async () => {
  const prevFetch = global.fetch;
  global.fetch = async () => new Response("Waking", { status: 503 });
  try {
    let patchCalls = 0;
    let capturedBody = null;
    let deleteCalls = 0;

    const actions = loadTsModule(
      "src/app/(dashboard)/test-cases/test-cases.action.ts",
      {
        "@/lib/app-fetch": {
          appFetch: async (_url, init) => {
            if (init.method === "DELETE") {
              deleteCalls += 1;
              if (deleteCalls === 1) return new Response("<html>503</html>", { status: 503 });
              return new Response(JSON.stringify({ deleted: true }), {
                status: 200,
                headers: { "content-type": "application/json" },
              });
            }
            patchCalls += 1;
            if (patchCalls === 1) {
              return new Response("<html>Bad Gateway</html>", { status: 502 });
            }
            capturedBody = JSON.parse(init.body);
            return new Response(
              JSON.stringify({ id: 77, testerId: 99, createdAt: "2026-11-15T00:00:00Z", status: "passed" }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          },
        },
        "@/lib/db": { pool: { query: async () => ({ rows: [] }) } },
        "@/lib/fast-read": { queryTestCasesFromDb: async () => ({ data: [], meta: {} }) },
        "@/app/myUtil": {
          getCurrentUserSession: async () => ({ id: 30, role: "admin", token: "tok-30" }),
          getUserToken: async () => "tok-30",
        },
        "next/cache": { revalidatePath() {}, updateTag() {} },
        "next/navigation": { unstable_rethrow() {} },
        "@/lib/audit": { recordSystemAuditLog: async () => {} },
      },
      { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
    );

    const longModule = "Module Name Long Enough To Exceed Fifty Characters Safely Preserved In Edit Action";
    const updateRes = await actions.updateTestCase(77, {
      module: longModule,
      pageName: null,
      preConditions: null,
      status: "passed",
    });

    assert.equal(updateRes.success, true);
    assert.equal(patchCalls, 2);
    assert.equal(capturedBody.module, longModule);
    assert.equal(capturedBody.pageName, "");
    assert.equal(capturedBody.preConditions, "");
    assert.equal("testerId" in updateRes.data, false);
    assert.equal("createdAt" in updateRes.data, false);

    const delRes = await actions.deleteTestCase(77);
    assert.equal(delRes.success, true);
    assert.equal(deleteCalls, 2);
  } finally {
    global.fetch = prevFetch;
  }
});

test("updateTestCase falls back to ACID PostgreSQL on persistent 503, blocks unauthorized tester, and never falls back on 400/403", async () => {
  const prevFetch = global.fetch;
  global.fetch = async () => new Response("Waking", { status: 503 });
  try {
    const queries = [];
    let released = false;
    const makeTxPool = (assigned) => ({
      query: async () => ({ rows: [] }),
      connect: async () => ({
        query: async (sql, params = []) => {
          queries.push({ sql, params });
          if (sql.includes("SELECT * FROM test_cases WHERE id = $1 FOR UPDATE")) {
            return { rows: [{ id: 55, projectId: 4, testerId: 20, status: "pending", actualResult: null, notes: null }] };
          }
          if (sql.includes("SELECT id FROM projects WHERE id")) return { rows: [{ id: 4 }] };
          if (sql.includes("FROM project_assignments")) return { rowCount: assigned ? 1 : 0, rows: assigned ? [{ "?column?": 1 }] : [] };
          if (sql.includes("to_regclass")) {
            return { rows: [{ exec_tbl: "test_executions", cycle_tbl: "test_cycle_items", current_view: "test_cases_current" }] };
          }
          if (sql.includes("SELECT * FROM test_cases WHERE id = $1")) {
            return { rows: [{ id: 55, projectId: 4, testerId: 20, status: "pending" }] };
          }
          if (sql.includes("SELECT * FROM test_executions WHERE")) return { rows: [] };
          if (sql.includes("SELECT name FROM users WHERE id")) return { rows: [{ name: "Hassan Ali" }] };
          if (sql.includes("FROM test_cases_current tc")) {
            return {
              rows: [{
                id: 55,
                status: "failed",
                actualResult: "Failed in outage",
                steps: JSON.stringify(["Step 1"]),
                testerId: 30,
                createdAt: "2026-11-15T00:00:00Z",
                updated_by_id: 30,
                updated_by_name: "Hassan Ali",
                updated_by_email: "hassan@example.invalid",
                project_id: 4,
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
    });

    const loadOutageActions = (role, assigned) =>
      loadTsModule(
        "src/app/(dashboard)/test-cases/test-cases.action.ts",
        {
          "@/lib/app-fetch": {
            appFetch: async () => new Response("<html>503</html>", { status: 503 }),
          },
          "@/lib/db": { pool: makeTxPool(assigned) },
          "@/lib/fast-read": { queryTestCasesFromDb: async () => ({ data: [], meta: {} }) },
          "@/app/myUtil": {
            getCurrentUserSession: async () => ({ id: 30, role, token: "tok-30" }),
            getUserToken: async () => "tok-30",
          },
          "next/cache": { revalidatePath() {}, updateTag() {} },
          "next/navigation": { unstable_rethrow() {} },
          "@/lib/audit": { recordSystemAuditLog: async () => {} },
        },
        { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
      );

    // 1) Assigned tester succeeds on 503 via ACID transaction, preserves creator, appends compatibility execution
    const assignedActions = loadOutageActions("tester", true);
    const res = await assignedActions.updateTestCase(55, {
      status: "failed",
      actualResult: "Failed in outage",
      notes: "Reproduced offline",
    });
    assert.equal(res.success, true);
    assert.equal(released, true);
    assert.equal("testerId" in res.data, false);
    assert.equal("createdAt" in res.data, false);
    assert.ok(queries.some((q) => q.sql.includes("INSERT INTO test_executions")));
    assert.ok(queries.some((q) => q.sql === "COMMIT"));

    // 2) Unassigned tester on 503 is denied cleanly with ROLLBACK
    const unauthActions = loadOutageActions("tester", false);
    const denied = await unauthActions.updateTestCase(55, { status: "passed" });
    assert.equal(denied.success, false);
    assert.ok(queries.some((q) => q.sql === "ROLLBACK"));

    // 3) 400 validation error never hits DB fallback
    const countBefore400 = queries.length;
    const actions400 = loadTsModule(
      "src/app/(dashboard)/test-cases/test-cases.action.ts",
      {
        "@/lib/app-fetch": {
          appFetch: async () =>
            new Response(JSON.stringify({ message: ["Bad scenario"] }), {
              status: 400,
              headers: { "content-type": "application/json" },
            }),
        },
        "@/lib/db": { pool: makeTxPool(true) },
        "@/lib/fast-read": { queryTestCasesFromDb: async () => ({ data: [], meta: {} }) },
        "@/app/myUtil": {
          getCurrentUserSession: async () => ({ id: 30, role: "admin", token: "tok-30" }),
          getUserToken: async () => "tok-30",
        },
        "next/cache": { revalidatePath() {}, updateTag() {} },
        "next/navigation": { unstable_rethrow() {} },
        "@/lib/audit": { recordSystemAuditLog: async () => {} },
      },
      { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
    );
    const res400 = await actions400.updateTestCase(55, { scenario: "abc" });
    assert.equal(res400.success, false);
    assert.equal(res400.message, "Bad scenario");
    assert.equal(queries.length, countBefore400);
  } finally {
    global.fetch = prevFetch;
  }
});

test("formatTestCaseActionError translates Arabic generic/wake messages in English UI and hardens mutation actions", async () => {
  const prevFetch = global.fetch;
  global.fetch = async () => new Response("Waking", { status: 503 });
  try {
    const wake = loadTsModule("src/lib/backend-wake.ts");
    assert.equal(
      wake.formatTestCaseActionError(
        new Error("فشل تحديث حالة الاختبار"),
        false,
        "فشل تحديث حالة الاختبار",
        "Failed to update test case",
      ),
      "Failed to update test case",
    );
    assert.equal(
      wake.formatTestCaseActionError(
        new Error("الخادم قيد الاستيقاظ أو مزدحم حالياً (502)"),
        false,
        "فشل تحديث حالة الاختبار",
        "Failed to update test case",
      ),
      "Server is waking up or temporarily busy, please try again in a few seconds",
    );
    assert.equal(
      wake.formatTestCaseActionError(
        new Error("فشل تحديث حالة الاختبار"),
        true,
        "فشل تحديث حالة الاختبار",
        "Failed to update test case",
      ),
      "فشل تحديث حالة الاختبار",
    );

    const commonMocks = (fetchFn) => ({
      "@/lib/app-fetch": { appFetch: fetchFn },
      "@/app/myUtil": { getUserToken: async () => "tok-admin" },
      "next/cache": { revalidatePath() {}, updateTag() {} },
      "next/navigation": { unstable_rethrow() {} },
      "@/lib/audit": { recordSystemAuditLog: async () => {} },
      "../users/user.action": { getAllUsers: async () => [] },
      "../projects/getProjects.action": { getProjects: async () => [] },
      "@/lib/fast-read": { queryAllUsersFromDb: async () => [], raceBackendFetch: async () => null },
      "@/lib/avatar": { normalizeApiUserPhoto: () => "" },
    });

    // unassignProjectFromUser must use no-store and retry 503
    let unassignAttempt = 0;
    let unassignCache = null;
    const assignActions = loadTsModule(
      "src/app/(dashboard)/assign-projects/assign.action.ts",
      commonMocks(async (_url, init) => {
        unassignAttempt += 1;
        unassignCache = init.cache;
        if (unassignAttempt === 1) return new Response("<html>503</html>", { status: 503 });
        return new Response(JSON.stringify({ message: "Unassigned" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
      { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
    );
    const unassignRes = await assignActions.unassignProjectFromUser(4, 9);
    assert.equal(unassignRes.success, true);
    assert.equal(unassignAttempt, 2);
    assert.equal(unassignCache, "no-store");

    // deleteThisUser must check !response.ok cleanly instead of pretending success
    const userActions = loadTsModule(
      "src/app/(dashboard)/users/user.action.ts",
      commonMocks(async () =>
        new Response(JSON.stringify({ message: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
      { NEXT_PUBLIC_BASE_URL: "https://backend.example.invalid" },
    );
    await assert.rejects(() => userActions.deleteThisUser(99), /Forbidden/);
  } finally {
    global.fetch = prevFetch;
  }
});
