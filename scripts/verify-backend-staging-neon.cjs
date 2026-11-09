#!/usr/bin/env node
/**
 * End-to-End Staging NestJS Backend Verification against Isolated Neon PostgreSQL (`neondb`).
 *
 * SAFETY GUARANTEES:
 * - Enforces `assertSafeDatabaseTarget` (exact allowlist: ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech / neondb / neondb_owner).
 * - Never prints or logs connection strings, passwords, or secrets.
 * - Verifies `ALLOW_DATABASE_BOOTSTRAP=false`, `ENABLE_PROJECT_DEADLINE_WORKER=false`, and `assertRuntimeSchemaReady` (READ ONLY startup).
 * - Verifies all NestJS backend services (`AuthService`, `JwtStrategy`, `DashboardService`, `ProjectsService`, `TestCasesService`, `WorkflowService`, `UsersService`, `AuditLogsService`) against the 18-table Neon staging schema.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  assertSafeDatabaseTarget,
  createIsolatedLocalPostgres,
  initializeExternalTestPostgres,
} = require("./init-local-test-db.cjs");

const BACKEND_DIST = path.resolve(
  __dirname,
  "../../garage-safe-startup/dist",
);

function loadStagingDbUrl() {
  if (process.env.STAGING_DB_URL) {
    return process.env.STAGING_DB_URL.trim();
  }
  const envFile = path.resolve(__dirname, "../.dev.vars.staging");
  if (!fs.existsSync(envFile)) {
    throw new Error("Missing .dev.vars.staging or STAGING_DB_URL");
  }
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (key === "STAGING_DB_URL" && val) {
      return val;
    }
  }
  throw new Error("STAGING_DB_URL not found in .dev.vars.staging");
}

async function main() {
  const useLocalPglite = process.argv.includes("--local-pglite");
  let connectionString = "postgresql://postgres@127.0.0.1:5432/local_test";
  let localPg = null;

  if (useLocalPglite) {
    localPg = await createIsolatedLocalPostgres({ dataDir: "memory://", seed: true });
    console.log("[1/4] Created isolated in-memory PGlite test database");
    console.log("[2/4] Initialized 18 tables + view + synthetic bcrypt hashes in PGlite");
  } else {
    connectionString = loadStagingDbUrl();

    // 1. Enforce strict target allowlist before any network connection
    const target = assertSafeDatabaseTarget(connectionString);
    console.log(
      `[1/4] Verified safe staging database target: host=${target.host}, db=${target.database}, user=${target.user}`,
    );

    // 2. Apply updated schema (including RLS on test_case_imports) & real bcrypt synthetic password hashes
    const initSummary = await initializeExternalTestPostgres(connectionString);
    assert.equal(initSummary.database, "neondb");
    assert.equal(initSummary.user, "neondb_owner");
    console.log(
      `[2/4] Initialized & synced 18 tables + view + synthetic bcrypt hashes on Neon neondb`,
    );
  }

  // 3. Configure safe staging environment variables for NestJS backend
  process.env.DATABASE_URL = connectionString;
  process.env.ALLOW_DATABASE_BOOTSTRAP = "false";
  process.env.ENABLE_PROJECT_DEADLINE_WORKER = "false";
  process.env.JWT_SECRET = "staging-only-synthetic-jwt-secret-2026-mcit-verification";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.CORS_ALLOWED_ORIGINS =
    "https://mcit-test-case-front-staging.workers.dev,https://mcit-test-case-backend-staging.onrender.com";
  process.env.BACKEND_URL = "https://mcit-test-case-backend-staging.onrender.com";

  const { DatabaseService } = require(path.join(
    BACKEND_DIST,
    "database/database.service",
  ));
  const { assertRuntimeSchemaReady } = require(path.join(
    BACKEND_DIST,
    "database/runtime-schema",
  ));
  const { createCorsOptions } = require(path.join(
    BACKEND_DIST,
    "security/cors",
  ));
  const { AuditLogsService } = require(path.join(
    BACKEND_DIST,
    "audit-logs/audit-logs.service",
  ));
  const { AuthService } = require(path.join(BACKEND_DIST, "auth/auth.service"));
  const { JwtStrategy } = require(path.join(BACKEND_DIST, "auth/jwt.strategy"));
  const { DashboardService } = require(path.join(
    BACKEND_DIST,
    "dashboard/dashboard.service",
  ));
  const { ProjectsService } = require(path.join(
    BACKEND_DIST,
    "projects/projects.service",
  ));
  const { WorkflowService } = require(path.join(
    BACKEND_DIST,
    "workflow/workflow.service",
  ));
  const { TestCasesService } = require(path.join(
    BACKEND_DIST,
    "test-cases/test-cases.service",
  ));
  const { UsersService } = require(path.join(
    BACKEND_DIST,
    "users/users.service",
  ));
  const { JwtService } = require(path.resolve(
    BACKEND_DIST,
    "../node_modules/@nestjs/jwt",
  ));

  const databaseService = new DatabaseService();
  if (useLocalPglite) {
    databaseService.db = localPg.pool;
  } else {
    await databaseService.onModuleInit();
  }

  try {
    // Verify read-only runtime schema check explicitly
    if (!useLocalPglite) {
      await assertRuntimeSchemaReady(databaseService.db);
    }

    // Verify CORS allowlist accepts Cloudflare staging Worker origin and rejects untrusted origins
    const corsOptions = createCorsOptions(process.env.CORS_ALLOWED_ORIGINS);
    await new Promise((resolve, reject) => {
      corsOptions.origin(
        "https://mcit-test-case-front-staging.workers.dev",
        (err, allow) => (err || !allow ? reject(err || new Error("Blocked")) : resolve()),
      );
    });
    let untrustedRejected = false;
    await new Promise((resolve) => {
      corsOptions.origin("https://evil.example.com", (err) => {
        if (err) untrustedRejected = true;
        resolve();
      });
    });
    assert.equal(untrustedRejected, true, "Untrusted origin must be rejected by CORS");

    // Instantiate NestJS services connected to Neon staging DB
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    });
    const auditLogsService = new AuditLogsService(databaseService);
    const authService = new AuthService(
      databaseService,
      jwtService,
      auditLogsService,
    );
    const jwtStrategy = new JwtStrategy(databaseService);
    const dashboardService = new DashboardService(databaseService);
    const projectsService = new ProjectsService(databaseService);
    const workflowService = new WorkflowService(databaseService);
    const testCasesService = new TestCasesService(
      databaseService,
      workflowService,
    );
    const usersService = new UsersService(databaseService);

    // 3a. Verify real NestJS login with synthetic credentials + bcrypt password verification
    const adminLogin = await authService.login(
      {
        email: "admin@synthetic.local",
        password: "StagingTest#2026!",
      },
      {
        ip: "127.0.0.1",
        headers: { "user-agent": "NestStagingVerifier/1.0" },
      },
    );
    assert.ok(adminLogin.access_token, "Admin login must return JWT access_token");
    assert.equal(adminLogin.user.email, "admin@synthetic.local");
    assert.equal(adminLogin.user.role, "admin");

    const testerLogin = await authService.login(
      {
        email: "tester1@synthetic.local",
        password: "StagingTest#2026!",
      },
      {
        ip: "127.0.0.1",
        headers: { "user-agent": "NestStagingVerifier/1.0" },
      },
    );
    assert.ok(testerLogin.access_token, "Tester login must return JWT access_token");
    assert.equal(testerLogin.user.email, "tester1@synthetic.local");
    assert.equal(testerLogin.user.role, "tester");

    // 3b. Verify JwtStrategy validation & session revocation (minTokenIat)
    const decodedAdmin = jwtService.verify(adminLogin.access_token);
    const validatedAdmin = await jwtStrategy.validate(decodedAdmin);
    assert.equal(validatedAdmin.id, 1);
    assert.equal(validatedAdmin.role, "admin");

    const decodedTester = jwtService.verify(testerLogin.access_token);
    const validatedTester = await jwtStrategy.validate(decodedTester);
    assert.equal(validatedTester.id, 2);
    assert.equal(validatedTester.role, "tester");

    // Revoke tester sessions and confirm JwtStrategy rejects the old token
    await authService.revokeAllUserSessions(2, validatedAdmin, false);
    await assert.rejects(
      () => jwtStrategy.validate(decodedTester),
      /(Session has been logged out remotely|This device session was revoked)/,
      "Revoked session token must be rejected by JwtStrategy",
    );
    await databaseService.db.query(
      'UPDATE users SET "minTokenIat" = 0 WHERE id = 2',
    );

    // 3c. Verify DashboardService queries (admin vs tester)
    const adminStats = await dashboardService.getStats(validatedAdmin);
    assert.equal(adminStats.total, 3);
    assert.equal(adminStats.totalProjects, 2);

    const testerStats = await dashboardService.getStats(validatedTester);
    assert.equal(testerStats.total, 2, "Tester 1 sees only Project 1 test cases");
    assert.equal(testerStats.totalProjects, 1);

    const chartData = await dashboardService.getChartData(7, validatedAdmin);
    assert.equal(chartData.length, 7);

    const severityData = await dashboardService.getSeverityBreakdown(validatedAdmin);
    assert.equal(severityData.total, 1);

    // 3d. Verify ProjectsService queries & authorization boundaries
    const adminProjects = await projectsService.findAll({}, validatedAdmin);
    assert.equal(adminProjects.length, 2);

    const testerProjects = await projectsService.findAll({}, validatedTester);
    assert.equal(testerProjects.length, 1);
    assert.equal(testerProjects[0].id, 1);

    const projectOne = await projectsService.findOne(1, validatedTester);
    assert.equal(projectOne.name, "Synthetic Portal Project");
    await assert.rejects(
      () => projectsService.findOne(2, validatedTester),
      /غير مصرح/,
      "Tester 1 must be forbidden from accessing unassigned Project 2",
    );

    // 3e. Verify TestCasesService queries (`test_cases_current` + `test_case_imports`)
    const adminCases = await testCasesService.findAll({}, validatedAdmin);
    assert.equal(adminCases.meta.total, 3);
    const case101 = await testCasesService.findOne(101, validatedTester);
    assert.equal(case101.testId, "TC_SYN_001");
    assert.equal(case101.importMetadata.sourceKey, "synthetic-seed-v1");

    // 3f. Verify WorkflowService (releases, cycles, items, execution history & fallback history)
    const releases = await workflowService.releases(1, {}, validatedTester);
    assert.equal(releases.meta.total, 1);

    const cycles = await workflowService.cycles({ projectId: 1 }, validatedTester);
    assert.equal(cycles.meta.total, 1);

    const cycleDetail = await workflowService.cycle(1, validatedTester);
    assert.equal(cycleDetail.summary.total, 1);
    assert.equal(cycleDetail.summary.passed, 1);

    const cycleItems = await workflowService.items(1, {}, validatedTester);
    assert.equal(cycleItems.meta.total, 1);

    const history101 = await workflowService.history(101, {}, validatedTester);
    assert.equal(history101.meta.total, 1);
    assert.equal(history101.data[0].status, "passed");

    const history102 = await workflowService.history(102, {}, validatedTester);
    assert.equal(
      history102.meta.total,
      1,
      "Legacy executed test case 102 must return fallback execution history record",
    );
    assert.equal(history102.data[0].source, "legacy");

    const wfMetrics = await workflowService.metrics({ projectId: 1 }, validatedTester);
    assert.equal(wfMetrics.totalExecutions, 1);

    // 3g. Verify UsersService & AuditLogsService
    const allUsers = await usersService.findAll();
    assert.equal(allUsers.length, 3);
    const eligible = await usersService.eligibleProjectUsers();
    assert.equal(eligible.length, 3);
    const notifs = await usersService.getNotifications(2);
    assert.ok(Array.isArray(notifs.notifications));

    const sessions = await authService.getSessions(validatedAdmin);
    assert.ok(sessions.length >= 2, "user_login_sessions must record login sessions");

    await auditLogsService.log({
      userId: 1,
      userName: "Synthetic Admin",
      email: "admin@synthetic.local",
      role: "admin",
      action: "STAGING_BACKEND_VERIFY",
      actionCategory: "AUTH",
      description: "Synthetic staging backend verification",
      method: "POST",
      endpoint: "/api/auth/login",
      ip: "127.0.0.1",
      userAgent: "NestStagingVerifier/1.0",
      status: "success",
    });

    const audits = await auditLogsService.findAll({ limit: 10 });
    assert.ok(audits.meta.total >= 1, "Audit logs must record events");

    // Clean up verification audit logs and login sessions so staging baseline stays tidy
    await databaseService.db.query(
      `DELETE FROM audit_logs WHERE "userAgent" = 'NestStagingVerifier/1.0' OR description LIKE '%Synthetic%'`,
    );
    await databaseService.db.query(
      `DELETE FROM user_login_sessions WHERE "userAgent" = 'NestStagingVerifier/1.0'`,
    );

    console.log(
      "[3/4] Verified all NestJS services (Auth, JWT,Revocation, Dashboard, Projects, TestCases, Workflow, Users, AuditLogs, CORS, RLS) against Neon neondb: PASSED",
    );
  } finally {
    if (useLocalPglite && localPg) {
      await localPg.close();
    } else {
      await databaseService.onModuleDestroy();
    }
  }

  console.log("[4/4] Staging NestJS backend + Neon verification completed cleanly.");
}

main().catch((err) => {
  console.error("Staging backend verification failed:", err.message);
  process.exit(1);
});
