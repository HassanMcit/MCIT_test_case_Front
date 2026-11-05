// Read-only component layout audit. Server actions are replaced before loading any frontend module.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
process.chdir(root);
fs.mkdirSync("scratch", { recursive: true });
const cache = new Map();
const baseline = process.argv
  .find((arg) => arg.startsWith("--baseline="))
  ?.slice("--baseline=".length);
let fixtureState = "";
function fixture(source, file) {
  if (file.endsWith("TestCaseForm.tsx") && fixtureState === "failed")
    source = source.replace("status: undefined", 'status: "failed"');
  if (file.endsWith("Navbar.tsx") && fixtureState === "notifications")
    source = source.replace(
      "[showNotifications, setShowNotifications] = useState(false)",
      "[showNotifications, setShowNotifications] = useState(true)",
    );
  if (file.endsWith("Navbar.tsx") && fixtureState === "profile")
    source = source.replace(
      "[showDropdown, setShowDropdown] = useState(false)",
      "[showDropdown, setShowDropdown] = useState(true)",
    );
  if (
    file.endsWith(path.join("(dashboard)", "layout.tsx")) &&
    fixtureState === "sidebar"
  )
    source = source.replace(
      "[isSidebarOpen, setIsSidebarOpen] = useState(false)",
      "[isSidebarOpen, setIsSidebarOpen] = useState(true)",
    );
  if (file.endsWith("ProjectsForm.tsx") && fixtureState === "modal")
    source = source.replace(
      "[showAddModal, setShowAddModal] = useState(false)",
      "[showAddModal, setShowAddModal] = useState(true)",
    );
  if (file.endsWith("QualityClient.tsx") && fixtureState === "modal")
    source = source.replace(
      "[isRegisterOpen, setIsRegisterOpen] = useState(false)",
      "[isRegisterOpen, setIsRegisterOpen] = useState(true)",
    );
  return source;
}
function source(file) {
  if (!baseline) return fixture(fs.readFileSync(file, "utf8"), file);
  let original = require("node:child_process").execFileSync(
    "git",
    ["show", `${baseline}:${path.relative(root, file).replaceAll("\\", "/")}`],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (file.endsWith(path.join("(dashboard)", "layout.tsx")))
    original = original.replaceAll("overflow-x-hidden", "");
  return fixture(original, file);
}
const user = {
  id: 1,
  name: "Layout QA Synthetic Administrator",
  email: "qa@example.invalid",
  role: "admin",
  assignedProjects: [],
};
const session = { data: { user }, status: "authenticated", update() {} };
const noAction = new Proxy(
  {},
  {
    get: (_, name) => {
      if (name === "__esModule") return true;
      return () => {
        throw new Error(
          `Server action disabled in layout audit: ${String(name)}`,
        );
      };
    },
  },
);
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const local = createRequire(file);
  function req(id) {
    if (
      /\.action$|\.services$|^server-only$|^next\/headers$|^@\/app\/myUtil$/.test(
        id,
      )
    )
      return noAction;
    if (id === "next-auth/react")
      return {
        useSession: () => session,
        SessionProvider: ({ children }) => children,
      };
    if (id === "next/navigation")
      return {
        usePathname: () => "/add",
        useRouter: () => ({}),
        useSearchParams: () => new URLSearchParams(),
      };
    if (id === "next/link")
      return {
        __esModule: true,
        default: ({ href, children, ...props }) =>
          React.createElement("a", { href, ...props }, children),
      };
    if (id === "next/image")
      return {
        __esModule: true,
        default: ({ fill, priority, unoptimized, ...props }) =>
          React.createElement("img", {
            ...props,
            src:
              typeof props.src === "string" &&
              fs.existsSync(path.join(root, "public", props.src))
                ? "data:image/png;base64," +
                  fs
                    .readFileSync(path.join(root, "public", props.src))
                    .toString("base64")
                : props.src,
            style: fill
              ? { width: "100%", height: "100%", objectFit: "contain" }
              : props.style,
          }),
      };
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/")
        ? path.join(root, "src", id.slice(2))
        : path.resolve(path.dirname(file), id);
      for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        const target = base + ext;
        if (fs.existsSync(target) && fs.statSync(target).isFile())
          return load(target);
      }
    }
    return local(id);
  }
  const code = ts.transpileModule(source(file), {
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
const project = {
  id: 1,
  name: "Synthetic Project",
  description: "Layout verification only",
  environment: "staging",
  status: "active",
  application: "Synthetic Application",
  assignedUsers: [user],
  testCases: [],
  _count: { testCases: 1 },
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const app = {
  id: 1,
  name: "Synthetic Application",
  nameAr: "????? ??????",
  category: "Internal Operations",
  url: "https://example.invalid",
  environment: "Staging",
  version: "1.0",
  status: "Healthy",
  passRate: 100,
  suitesCount: 1,
  bugsCount: 0,
  defaultFunctions: [],
};
const tc = {
  id: 1,
  testId: "TC-0001",
  scenario: "Synthetic scenario",
  module: "Synthetic Project",
  pageName: "Home",
  status: "failed",
  priority: "high",
  severity: "high",
  steps: ["Step one"],
  expectedResult: "Expected result",
  actualResult: "Actual result",
  tester: user,
  user,
  project,
  projectId: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const dashboard = {
  currentUser: user,
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
  projects: [project],
  testCases: [tc],
  usersOverview: [{ ...user, _count: { testCases: 1, assignedProjects: 1 } }],
};
const cases = [
  [
    "projects@modal",
    "projects/ProjectsForm.tsx",
    { serverProjects: [project], allApplications: [app] },
  ],
  [
    "quality@modal",
    "quality/QualityClient.tsx",
    {
      initialData: {
        applications: [app],
        metrics: {
          totalApps: 1,
          avgPassRate: 100,
          totalSuites: 1,
          totalDefects: 0,
          criticalDefects: 0,
        },
      },
    },
  ],
  [
    "reports@modal",
    "@/components/ExportReportModal.tsx",
    {
      open: true,
      onClose() {},
      allProjects: [project],
      allApplications: [app],
    },
  ],
  [
    "test-cycles/1",
    "test-cycles/[id]/CycleWorkspace.tsx",
    {
      id: 1,
      initial: {
        id: 1,
        projectId: 1,
        releaseId: 1,
        name: "Synthetic Cycle",
        description: "Read-only layout verification",
        status: "active",
        releaseName: "Release",
        version: "1.0",
        projectName: project.name,
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          blocked: 0,
          skipped: 0,
          notRun: 0,
          executed: 1,
          progress: 100,
          passRate: 0,
        },
      },
      initialError: "",
      isAdmin: true,
      userId: 1,
    },
  ],
  ["login", "@/components/login-form.tsx", {}],
  ["forget-password", "@/components/forget-password-form.tsx", {}],
  ["not-found", "@/app/not-found.tsx", {}],
  ...["notifications", "profile", "sidebar", "long-text", "failed"].map(
    (state) => [
      `add@${state}`,
      "add/TestCaseForm.tsx",
      { allProjects: [project], allApplications: [app] },
    ],
  ),
  [
    "add",
    "add/TestCaseForm.tsx",
    { allProjects: [project], allApplications: [app] },
  ],
  ["dashboard", "dashboard/DashboardClient.tsx", { data: dashboard }],
  [
    "test-cases",
    "test-cases/TestCasesTable.tsx",
    {
      initialData: {
        data: [tc],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      allProjects: [project],
      allApplications: [app],
    },
  ],
  [
    "projects",
    "projects/ProjectsForm.tsx",
    { serverProjects: [project], allApplications: [app] },
  ],
  [
    "quality",
    "quality/QualityClient.tsx",
    {
      initialData: {
        applications: [app],
        metrics: {
          totalApps: 1,
          avgPassRate: 100,
          totalSuites: 1,
          totalDefects: 0,
          criticalDefects: 0,
        },
      },
    },
  ],
  [
    "quality/1",
    "quality/[id]/AppDetailClient.tsx",
    { initialApp: app, initialAssessments: [] },
  ],
  ["users", "users/UsersClient.tsx", { initialUsers: [user] }],
  ["users/add", "users/add/AddUserClient.tsx", {}],
  [
    "assign-projects",
    "assign-projects/AssignProjectsClient.tsx",
    { initialUsers: [user], initialProjects: [project] },
  ],
  [
    "test-cycles",
    "test-cycles/WorkflowManager.tsx",
    { projects: [project], isAdmin: true },
  ],
  ["devices", "devices/DevicesSecurityClient.tsx", {}],
  ["reset-codes", "reset-codes/ResetCodesClient.tsx", {}],
  ["change-password", "change-password/ChangePasswordClient.tsx", {}],
  [
    "test-cases/email",
    "test-cases/email/EmailComposer.tsx",
    { initialTestCase: tc, failedCases: [tc] },
  ],
  [
    "test-cases/1/history",
    "test-cases/[id]/history/ExecutionHistory.tsx",
    { id: 1 },
  ],
];
async function main() {
  const { compile } = require("@tailwindcss/node");
  const { Scanner } = require("@tailwindcss/oxide");
  const css = await compile(source(path.join(root, "src/app/globals.css")), {
    base: path.join(root, "src/app"),
    onDependency() {},
  });
  const scanner = new Scanner({
    sources: [
      {
        base: path.join(root, "src"),
        pattern: "**/*.{tsx,ts}",
        negated: false,
      },
    ],
  });
  let styles = css.build(scanner.scan());
  const chunksDir = ".next/static/chunks";
  const fontFiles = fs.existsSync(chunksDir)
    ? fs.readdirSync(chunksDir).filter((f) => f.endsWith(".css"))
    : [];
  let fonts =
    fontFiles
      .map((f) => fs.readFileSync(`.next/static/chunks/${f}`, "utf8"))
      .join("")
      .match(/@font-face\{[^}]+\}/g)
      ?.join("") || "";
  fonts = fonts.replace(
    /url\(\.\.\/media\/([^)]+)\)/g,
    (_, f) =>
      "url(data:font/woff2;base64," +
      (fs.existsSync(`.next/static/media/${f}`)
        ? fs.readFileSync(`.next/static/media/${f}`).toString("base64")
        : "") +
      ")",
  );
  styles += `${fonts}:root{--font-almarai:Almarai;--font-geist-mono:"Geist Mono"}`;
  // Measure the settled layout, including menus that normally animate on entry.
  styles +=
    "*,*::before,*::after{animation:none!important;transition:none!important}";
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    ({ chromium } = require(
      path.join(root, ".qa-test-tools/node_modules/playwright"),
    ));
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];
  try {
    for (const lang of ["en", "ar"]) {
      for (const [route, file, props] of cases) {
        let markup;
        fixtureState = route.split("@")[1] || "";
        cache.clear();
        const { LanguageProvider } = load(
          path.join(root, "src/context/language-context.tsx"),
        );
        const Layout = load(
          path.join(root, "src/app/(dashboard)/layout.tsx"),
        ).default;
        try {
          const exports = load(
            file.startsWith("@/")
              ? path.join(root, "src", file.slice(2))
              : path.join(root, "src/app/(dashboard)", file),
          );
          const Page =
            exports.default || exports.LoginForm || exports.ForgetPasswordForm;
          markup = renderToStaticMarkup(
            React.createElement(
              LanguageProvider,
              { initialLang: lang },
              file.startsWith("@/")
                ? React.createElement(Page, props)
                : React.createElement(
                    Layout,
                    null,
                    React.createElement(Page, props),
                  ),
            ),
          );
        } catch (e) {
          results.push({ route, lang, error: e.message });
          continue;
        }
        const page = await browser.newPage();
        await page.route("**/*", (r) => r.abort()); // No backend, font, image, or external requests.
        for (const width of [1920, 1440, 1366, 1024, 768, 390, 375]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.setContent(
            '<!doctype html><html lang="' +
              lang +
              '" dir="' +
              (lang === "ar" ? "rtl" : "ltr") +
              '"><head><style>' +
              styles +
              "</style></head><body>" +
              markup +
              "</body></html>",
          );
          await page.evaluate(() => document.fonts.ready);
          if (fixtureState === "long-text")
            await page.locator("textarea").evaluateAll((els) =>
              els.forEach((el) => {
                el.value = "LONG_UNBROKEN_VALUE_".repeat(40);
              }),
            );
          const result = await page.evaluate(() => {
            const viewport = innerWidth;
            const overflow = [...document.querySelectorAll("body *")]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                if (
                  s.visibility === "hidden" ||
                  s.display === "none" ||
                  r.width === 0
                )
                  return false;
                if (r.left >= -1 && r.right <= viewport + 1) return false;
                for (
                  let p = el.parentElement;
                  p && p !== document.body;
                  p = p.parentElement
                )
                  if (
                    ["auto", "scroll", "hidden", "clip"].includes(
                      getComputedStyle(p).overflowX,
                    )
                  )
                    return false;
                return true;
              })
              .slice(0, 8)
              .map((el) => ({
                tag: el.tagName,
                class: el.className?.baseVal ?? el.className,
                left: Math.round(el.getBoundingClientRect().left),
                right: Math.round(el.getBoundingClientRect().right),
              }));
            const scrollers = [...document.querySelectorAll(".overflow-x-auto")]
              .filter((el) => el.scrollWidth > el.clientWidth)
              .map((el) => {
                const start = el.scrollLeft;
                el.scrollLeft = 100;
                if (el.scrollLeft === start) el.scrollLeft = -100;
                const moved = el.scrollLeft !== start;
                el.scrollLeft = start;
                return {
                  moved,
                  content: el.scrollWidth,
                  container: el.clientWidth,
                };
              });
            return {
              scrollers,
              viewport,
              html: document.documentElement.scrollWidth,
              body: document.body.scrollWidth,
              overflow,
            };
          });
          results.push({ route, lang, ...result });
          if (
            !baseline &&
            width === 375 &&
            [
              "add",
              "add@notifications",
              "add@profile",
              "add@sidebar",
              "dashboard",
              "projects",
              "quality",
            ].includes(route)
          )
            await page.screenshot({
              path: `scratch/overflow-${route}-${lang}.png`,
              fullPage: true,
            });
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    baseline
      ? "scratch/overflow-baseline.json"
      : "scratch/overflow-results.json",
    JSON.stringify(results, null, 2),
  );
  const failures = results.filter(
    (r) =>
      r.error ||
      r.html > r.viewport ||
      r.body > r.viewport ||
      r.overflow?.length ||
      r.scrollers?.some((s) => !s.moved),
  );
  console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
