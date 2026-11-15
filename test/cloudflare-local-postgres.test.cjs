// End-to-end local PostgreSQL integration tests using isolated PGlite (PostgreSQL 18.6 WASM)
// and real node-postgres (pg.Client) with strictly synthetic data.
// Zero network access, zero production credentials, zero production database access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { encode, decode } = require('next-auth/jwt');
const {
  assertSafeDatabaseTarget,
  createIsolatedLocalPostgres,
} = require('../scripts/init-local-test-db.cjs');

const SYNTHETIC_AUTH_SECRET = 'synthetic-local-postgres-auth-secret-32bytes!';

function makeSyntheticBackendJwt({ sub, name, email, role, sid, iat, expOffsetSec = 3600 }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      id: sub,
      name,
      email,
      role,
      sid,
      iat: iat ?? nowSec,
      exp: nowSec + expOffsetSec,
    }),
  ).toString('base64url');
  return `${header}.${payload}.synthetic-sig`;
}

function loadTsModule(relFile, mocks, extraGlobals = {}) {
  const absPath = path.resolve(__dirname, '..', relFile);
  const source = fs.readFileSync(absPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  const fn = vm.runInThisContext(
    `(function(exports, require, module, process, fetch) {\n${transpiled}\n})`,
    { filename: absPath },
  );
  const customProcess = {
    ...process,
    env: {
      ...process.env,
      AUTH_SECRET: SYNTHETIC_AUTH_SECRET,
      NEXT_PUBLIC_BASE_URL: 'https://synthetic-backend.invalid',
      NEXT_PUBLIC_APP_ENV: 'staging',
    },
  };
  const customRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name === '@/lib/account-email') return loadTsModule('src/lib/account-email.ts', {});
    if (name === '@/lib/avatar') return loadTsModule('src/lib/avatar.ts', {});
    if (name === '@/lib/backend-wake') return loadTsModule('src/lib/backend-wake.ts', {});
    if (name === 'node:crypto' || name === 'crypto') return crypto;
    if (name === 'node:zlib' || name === 'zlib') return require('node:zlib');
    if (name === 'node:fs' || name === 'fs') return fs;
    if (name === 'node:path' || name === 'path') return path;
    if (name === 'react') return { cache: (f) => f };
    if (name === 'server-only') return {};
    throw new Error(`Unexpected require('${name}') in ${relFile}`);
  };
  fn(
    mod.exports,
    customRequire,
    mod,
    customProcess,
    extraGlobals.fetch ?? globalThis.fetch,
  );
  return mod.exports;
}

test('safety guard blocks any production or Supabase database connection strings and enforces exact staging allowlist', () => {
  assert.throws(
    () => assertSafeDatabaseTarget('postgresql://postgres:secret@db.xxxx.supabase.co:5432/postgres'),
    /Refusing to run test schema\/seed/,
  );
  assert.throws(
    () => assertSafeDatabaseTarget('postgresql://postgres.xxxx:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'),
    /Refusing to run test schema\/seed/,
  );
  assert.throws(
    () => assertSafeDatabaseTarget('postgresql://neondb_owner:secret@ep-unknown-host.eu-central-1.aws.neon.tech/neondb?sslmode=require'),
    /not in ALLOWED_STAGING_TARGETS/,
  );
  assert.throws(
    () => assertSafeDatabaseTarget('postgresql://neondb_owner:secret@ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech/wrongdb?sslmode=require'),
    /not in ALLOWED_STAGING_TARGETS/,
  );
  assert.doesNotThrow(() =>
    assertSafeDatabaseTarget('postgresql://local:local@127.0.0.1:54329/mcit_test_local'),
  );
  assert.doesNotThrow(() =>
    assertSafeDatabaseTarget(
      'postgresql://neondb_owner:synthetic@ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ),
  );
});

test('isolated local PostgreSQL verifies schema, triggers, auth, session revocation, audit logs, and all DB queries', async () => {
  const { pool, close } = await createIsolatedLocalPostgres({
    dataDir: 'memory://',
    seed: true,
  });

  try {
    // 1. Verify schema, baseline cache revision, and view projection in real PostgreSQL
    const revBefore = Number(
      (await pool.query('SELECT revision FROM app_cache_revision WHERE id = 1')).rows[0].revision,
    );
    assert.ok(revBefore >= 1);

    const viewRows = (await pool.query('SELECT id, "testId", status, "actualResult" FROM test_cases_current ORDER BY id ASC')).rows;
    assert.equal(viewRows.length, 3);
    assert.equal(viewRows[0].testId, 'TC_SYN_001');
    assert.equal(viewRows[0].status, 'passed');

    // Verify projects_schedule_valid CHECK constraint rejects endAt <= startAt in real PostgreSQL
    await assert.rejects(
      () =>
        pool.query(
          `INSERT INTO projects (name, "startAt", "endAt") VALUES ('Invalid Schedule', '2026-11-10T10:00:00Z', '2026-11-09T10:00:00Z')`,
        ),
      /projects_schedule_valid/,
    );

    // 2. Wire up real src/app/myUtil.ts with real next-auth/jwt decode and real PostgreSQL pool
    let activeCookieHeader = new Map();
    const myUtil = loadTsModule('src/app/myUtil.ts', {
      '@/lib/db': { pool },
      'next-auth/jwt': { decode },
      'next/headers': {
        cookies: async () => ({
          get: (name) => {
            const val = activeCookieHeader.get(name);
            return val ? { value: val } : undefined;
          },
        }),
      },
    });

    async function setActiveSessionCookie({ id, name, email, role, sid, iat }) {
      const backendJwt = makeSyntheticBackendJwt({ sub: id, name, email, role, sid, iat });
      const encryptedCookie = await encode({
        salt: 'authjs.session-token',
        secret: SYNTHETIC_AUTH_SECRET,
        token: {
          id: String(id),
          name,
          email,
          role,
          sid,
          credentialToken: backendJwt,
          loginAt: Date.now(),
        },
      });
      activeCookieHeader = new Map([['authjs.session-token', encryptedCookie]]);
      return backendJwt;
    }

    // 3. Test Authentication (authjsConfig.ts) against real PostgreSQL
    const testerSid = 'syn-session-tester-1';
    const testerIat = Math.floor(Date.now() / 1000) - 60;
    const testerBackendJwt = makeSyntheticBackendJwt({
      sub: 2,
      name: 'Synthetic Tester One',
      email: 'tester1@synthetic.local',
      role: 'tester',
      sid: testerSid,
      iat: testerIat,
    });

    let loginShouldSucceed = true;
    const { authConfig } = loadTsModule(
      'authjsConfig/authjsConfig.ts',
      {
        'next-auth/providers/credentials': (cfg) => cfg,
        '@/lib/db': { pool },
      },
      {
        fetch: async (url) => {
          assert.equal(url, 'https://synthetic-backend.invalid/api/auth/login');
          if (!loginShouldSucceed) return { ok: false, status: 401 };
          // Model the backend login endpoint as the single owner of session creation.
          await pool.query(
            `INSERT INTO user_login_sessions ("sessionId", "userId", "userName", email, "isActive", "createdAt", "lastSeenAt")
             VALUES ($1, 2, 'Synthetic Tester One', 'tester1@synthetic.local', TRUE, NOW(), NOW())
             ON CONFLICT ("sessionId") DO UPDATE SET "lastSeenAt" = NOW()`,
            [testerSid],
          );
          return {
            ok: true,
            json: async () => ({
              user: {
                id: 2,
                name: 'Synthetic Tester One',
                email: 'tester1@synthetic.local',
                role: 'tester',
                photo: 'http://127.0.0.1:8787/icon.png',
              },
              access_token: testerBackendJwt,
              sessionId: testerSid,
            }),
          };
        },
      },
    );

    // 3a. Rejected login never writes to user_login_sessions or audit_logs
    loginShouldSucceed = false;
    const rejectedUser = await authConfig.providers[0].authorize({
      email: 'tester1@synthetic.local',
      password: 'wrong-synthetic-password',
    });
    assert.equal(rejectedUser, null);
    assert.equal(
      (await pool.query('SELECT COUNT(*)::int AS cnt FROM user_login_sessions')).rows[0].cnt,
      0,
    );

    // 3b. Successful login persists session, resets minTokenIat, and writes AUTH audit log in PostgreSQL
    loginShouldSucceed = true;
    const authorizedUser = await authConfig.providers[0].authorize({
      email: 'tester1@synthetic.local',
      password: 'valid-synthetic-password',
      clientIp: '127.0.0.1',
      macAddress: '02:00:00:00:00:99',
      deviceInfo: 'Synthetic Browser',
      location: 'Synthetic Lab',
      userAgent: 'SyntheticAgent/1.0',
    });
    assert.equal(authorizedUser.id, '2');
    assert.equal(authorizedUser.sid, testerSid);
    assert.equal(authorizedUser.role, 'tester');

    const sessRow = (
      await pool.query('SELECT * FROM user_login_sessions WHERE "sessionId" = $1', [testerSid])
    ).rows[0];
    assert.equal(sessRow.userId, 2);
    assert.equal(sessRow.isActive, true);

    // 3c. Pre-existing backend-created sessionId is handled idempotently without duplicate-key error
    await pool.query('UPDATE users SET "minTokenIat" = 999 WHERE id = 2');
    const auditsBeforeRepeat = (
      await pool.query('SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE "userId" = 2 AND "actionCategory" = \'AUTH\'')
    ).rows[0].cnt;
    const repeatedUser = await authConfig.providers[0].authorize({
      email: 'tester1@synthetic.local',
      password: 'valid-synthetic-password',
      clientIp: '127.0.0.1',
      macAddress: '02:00:00:00:00:99',
      deviceInfo: 'Synthetic Browser',
      location: 'Synthetic Lab',
      userAgent: 'SyntheticAgent/1.0',
    });
    assert.equal(repeatedUser.sid, testerSid);
    const cutoffAfterRepeat = (
      await pool.query('SELECT "minTokenIat" FROM users WHERE id = 2')
    ).rows[0].minTokenIat;
    assert.equal(Number(cutoffAfterRepeat), 0);
    const auditsAfterRepeat = (
      await pool.query('SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE "userId" = 2 AND "actionCategory" = \'AUTH\'')
    ).rows[0].cnt;
    assert.equal(auditsAfterRepeat, auditsBeforeRepeat + 1);

    // 4. Verify live session resolution via myUtil.getCurrentUserSession() against real PostgreSQL
    await setActiveSessionCookie({
      id: 2,
      name: 'Synthetic Tester One',
      email: 'tester1@synthetic.local',
      role: 'tester',
      sid: testerSid,
      iat: testerIat,
    });
    const liveTesterSession = await myUtil.getCurrentUserSession();
    assert.equal(liveTesterSession.id, 2);
    assert.equal(liveTesterSession.role, 'tester');
    assert.equal(liveTesterSession.email, 'tester1@synthetic.local');

    // 5. Verify Session Revocation & Role Enforcement (sessions.action.ts) against real PostgreSQL
    const invalidatedTags = [];
    const revalidatedPaths = [];
    const sessionsActions = loadTsModule('src/app/(dashboard)/users/sessions.action.ts', {
      '@/app/myUtil': myUtil,
      '@/lib/db': { pool },
      'next/cache': {
        updateTag: (t) => invalidatedTags.push(t),
        revalidateTag: (t) => invalidatedTags.push(t),
      },
    });

    // 5a. Tester cannot list or revoke sessions
    assert.deepEqual(await sessionsActions.getLoginSessions(), []);
    assert.equal((await sessionsActions.revokeLoginSession(testerSid)).success, false);
    assert.equal((await sessionsActions.revokeAllOtherSessions(2)).success, false);

    // 5b. Switch active cookie to Synthetic Admin (id = 1)
    const adminSid = 'syn-session-admin-1';
    const adminIat = Math.floor(Date.now() / 1000);
    await pool.query(
      `INSERT INTO user_login_sessions ("sessionId", "userId", "userName", email, ip, "isActive")
       VALUES ($1, 1, 'Synthetic Admin', 'admin@synthetic.local', '127.0.0.1', TRUE)`,
      [adminSid],
    );
    await setActiveSessionCookie({
      id: 1,
      name: 'Synthetic Admin',
      email: 'admin@synthetic.local',
      role: 'admin',
      sid: adminSid,
      iat: adminIat,
    });

    const activeSessionsList = await sessionsActions.getLoginSessions();
    assert.equal(activeSessionsList.length, 2);

    // 5c. Admin revokes Tester One's session
    const revokeResult = await sessionsActions.revokeLoginSession(testerSid);
    assert.equal(revokeResult.success, true);

    // Switch cookie back to Tester One's token and verify immediate rejection by both myUtil and Auth.js callback
    await setActiveSessionCookie({
      id: 2,
      name: 'Synthetic Tester One',
      email: 'tester1@synthetic.local',
      role: 'tester',
      sid: testerSid,
      iat: testerIat,
    });
    assert.equal(await myUtil.getCurrentUserSession(), null);

    const callbackSession = await authConfig.callbacks.session({
      session: { user: {} },
      token: { id: '2', sid: testerSid, role: 'tester', iat: testerIat },
    });
    assert.equal(callbackSession.user.isRevoked, true);

    // 6. Verify Audit Logging & Admin Audit Queries (audit.ts & audit-logs.action.ts) against real PostgreSQL
    await setActiveSessionCookie({
      id: 1,
      name: 'Synthetic Admin',
      email: 'admin@synthetic.local',
      role: 'admin',
      sid: adminSid,
      iat: adminIat,
    });

    const auditMod = loadTsModule('src/lib/audit.ts', {
      'next/headers': { headers: async () => new Headers({ 'user-agent': 'SyntheticChrome/120', 'x-forwarded-for': '127.0.0.1' }) },
      'next/cache': { revalidateTag: (t) => invalidatedTags.push(t) },
      '@/app/myUtil': myUtil,
      '@/lib/db': { pool },
    });

    const auditLogsActions = loadTsModule('src/app/(dashboard)/devices/audit-logs.action.ts', {
      'next/cache': { updateTag: (t) => invalidatedTags.push(t) },
      '@/app/myUtil': myUtil,
      '@/lib/db': { pool },
    });

    assert.equal(
      await auditMod.recordSystemAuditLog({
        action: 'Synthetic System Verification',
        actionCategory: 'SECURITY',
        description: 'Verified audit trail against local PostgreSQL',
        endpoint: '/test/audit',
        method: 'POST',
      }),
      true,
    );

    assert.equal(
      await auditLogsActions.recordClientAuditAction({
        action: 'Synthetic UI Click',
        actionCategory: 'CLIENT_ACTION',
        description: 'Clicked synthetic button',
      }),
      true,
    );

    const securityLogs = await auditLogsActions.getAuditLogs({ category: 'SECURITY', page: 1, limit: 10 });
    assert.ok(securityLogs.meta.total >= 2);
    assert.ok(securityLogs.data.some((l) => l.action === 'Synthetic System Verification'));

    const searchedLogs = await auditLogsActions.getAuditLogs({ search: 'tester1@synthetic.local' });
    assert.ok(searchedLogs.meta.total >= 1);

    // 7. Verify Fast-Read Queries (src/lib/fast-read.ts) for Admin and Tester roles against real PostgreSQL
    const scopedCacheMock = {
      scopedCache: (fn) => fn,
      authenticatedSharedCache: (fn) => fn,
    };
    const fastRead = loadTsModule('src/lib/fast-read.ts', {
      'next/server': { after: () => {} },
      '@/lib/scoped-cache': scopedCacheMock,
      '@/lib/db': { pool },
    });

    const allProjects = await fastRead.queryProjectsFromDb({});
    assert.equal(allProjects.length, 2);
    const portalProj = allProjects.find((p) => p.id === 1);
    assert.deepEqual(portalProj.stats, {
      total: 2,
      passed: 1,
      failed: 1,
      pending: 0,
      successRate: 50,
    });
    assert.equal(portalProj.assignedUsers.length, 2);

    // Admin sees all 3 test cases
    const adminCases = await fastRead.queryTestCasesFromDb({ page: 1, limit: 50 }, { id: 1, role: 'admin' });
    assert.equal(adminCases.meta.total, 3);
    const tc101 = adminCases.data.find((tc) => tc.id === 101);
    assert.equal(tc101.importMetadata.sourceKey, 'synthetic-seed-v1');

    // Tester One (id=2) only sees Project 1's 2 test cases
    const tester1Cases = await fastRead.queryTestCasesFromDb({ page: 1, limit: 50 }, { id: 2, role: 'tester' });
    assert.equal(tester1Cases.meta.total, 2);
    assert.ok(tester1Cases.data.every((tc) => tc.projectId === 1));

    // Tester Two (id=3) only sees Project 2's 1 test case
    const tester2Cases = await fastRead.queryTestCasesFromDb({ page: 1, limit: 50 }, { id: 3, role: 'tester' });
    assert.equal(tester2Cases.meta.total, 1);
    assert.equal(tester2Cases.data[0].testId, 'TC_SYN_003');

    // queryAllUsersFromDb returns all 3 synthetic users with accurate counts
    const allUsers = await fastRead.queryAllUsersFromDb();
    assert.equal(allUsers.length, 3);
    const u2 = allUsers.find((u) => u.id === 2);
    assert.deepEqual(u2._count, { testCases: 2, assignedProjects: 1 });

    // 8. Verify Quality Applications & Assessments CRUD (quality.action.ts) + cache revision bump
    const qualityActions = loadTsModule('src/app/(dashboard)/quality/quality.action.ts', {
      'next/cache': {
        revalidatePath: (p) => revalidatedPaths.push(p),
        updateTag: (t) => invalidatedTags.push(t),
      },
      'next/navigation': { unstable_rethrow: () => {} },
      '@/lib/scoped-cache': scopedCacheMock,
      '@/lib/db': { pool },
      '@/app/myUtil': myUtil,
      '@/lib/audit': auditMod,
    });

    const revBeforeQuality = Number(
      (await pool.query('SELECT revision FROM app_cache_revision WHERE id = 1')).rows[0].revision,
    );

    const createdApp = await qualityActions.registerQualityApplication({
      name: 'Synthetic Analytics App',
      nameAr: 'تطبيق التحليلات التجريبي',
      category: 'Synthetic Analytics',
      url: 'https://analytics.synthetic.invalid',
      environment: 'Staging',
      version: 'v2.0-syn',
    });
    assert.equal(createdApp.success, true);
    const newAppId = createdApp.application.id;

    const assessmentRes = await qualityActions.submitQualityAssessment({
      appId: newAppId,
      isUpAndRunning: true,
      functionsResults: [
        { name: 'Synthetic Login', status: 'pass' },
        { name: 'Synthetic Report', status: 'fail', notes: 'Synthetic issue' },
      ],
      notes: 'Synthetic checklist run',
    });
    assert.equal(assessmentRes.success, true);
    assert.equal(assessmentRes.passedCount, 1);
    assert.equal(assessmentRes.issuesCount, 1);

    const appDetails = await qualityActions.getQualityAppById(newAppId);
    assert.equal(appDetails.application.bugsCount, 1);
    assert.equal(appDetails.assessments.length, 1);

    const revAfterQuality = Number(
      (await pool.query('SELECT revision FROM app_cache_revision WHERE id = 1')).rows[0].revision,
    );
    assert.ok(revAfterQuality > revBeforeQuality);

    // 9. Verify Project Excel Report Export (exportProjectReport.action.ts) against real PostgreSQL
    const { buildOfficialQaXlsxBuffer } = loadTsModule(
      'src/app/(dashboard)/projects/xlsxTemplateBuilder.ts',
      { xlsx: require('xlsx') },
    );
    const exportAction = loadTsModule('src/app/(dashboard)/projects/exportProjectReport.action.ts', {
      '@/lib/db': { pool },
      '@/app/myUtil': myUtil,
      '@/lib/audit': auditMod,
      './xlsxTemplateBuilder': { buildOfficialQaXlsxBuffer },
    });

    const excelResult = await exportAction.exportProjectExcelAction({
      projectId: 1,
      fromDate: '2026-11-01',
      toDate: '2026-11-06',
      tzOffsetMinutes: -120,
    });
    assert.equal(excelResult.success, true);
    assert.equal(excelResult.totalCount, 2);
    assert.equal(excelResult.passedCount, 1);
    assert.equal(excelResult.failedCount, 1);
    assert.ok(excelResult.base64.length > 100);

    // 9b. Verify fast-read & export read latest status from test_cases_current while preserving base_tc."testerId" creator
    const hasExecTable = Boolean(
      (await pool.query(`SELECT to_regclass('public.test_executions') AS reg`)).rows[0]?.reg,
    );
    if (!hasExecTable) {
      await pool.query(`
        CREATE TABLE test_executions (
          id SERIAL PRIMARY KEY,
          "testCaseId" INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
          "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
          "testerName" TEXT,
          status TEXT NOT NULL,
          "actualResult" TEXT,
          notes TEXT,
          environment VARCHAR(200),
          "executedAt" TIMESTAMPTZ,
          "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          source TEXT DEFAULT 'compatibility'
        );
      `);
    }
    const hasCurrentView = Boolean(
      (await pool.query(`SELECT to_regclass('public.test_cases_current') AS reg`)).rows[0]?.reg,
    );
    if (!hasCurrentView) {
      await pool.query(`
        CREATE VIEW test_cases_current AS
        SELECT tc.id, tc."testId", tc.module, tc."pageName", tc.scenario, tc."preConditions", tc.steps, tc."expectedResult",
          CASE WHEN e.id IS NOT NULL THEN e."actualResult" ELSE tc."actualResult" END AS "actualResult",
          tc.priority,
          CASE WHEN e.id IS NOT NULL THEN CASE WHEN e.status='not_run' THEN 'pending' ELSE e.status END ELSE tc.status END AS status,
          tc.severity,
          CASE WHEN e.id IS NOT NULL THEN e.notes ELSE tc.notes END AS notes,
          CASE WHEN e.id IS NOT NULL THEN e."executedAt" ELSE tc."executedAt" END AS "executedAt",
          CASE WHEN e.id IS NOT NULL THEN e."testerId" ELSE tc."testerId" END AS "testerId",
          tc."updatedById", tc."projectId", tc."createdAt", tc."updatedAt"
        FROM test_cases tc
        LEFT JOIN LATERAL (SELECT * FROM test_executions WHERE "testCaseId" = tc.id ORDER BY id DESC LIMIT 1) e ON true;
      `);
    }
    await pool.query(
      `INSERT INTO test_executions ("testCaseId", "projectId", "testerId", "testerName", status, "actualResult", notes, "executedAt", snapshot, source)
       VALUES (101, 1, 1, 'Synthetic Admin', 'failed', 'Updated failure in execution projection', 'Re-tested by Admin', '2026-11-05T12:00:00Z', '{"id":101,"testId":"TC_SYN_001"}'::jsonb, 'compatibility')`,
    );
    await pool.query(
      `UPDATE test_cases SET "updatedById" = 1, "updatedAt" = '2026-11-05T12:00:00Z' WHERE id = 101`,
    );

    const updatedAdminCases = await fastRead.queryTestCasesFromDb({ page: 1, limit: 50 }, { id: 1, role: 'admin' });
    const updatedTc101 = updatedAdminCases.data.find((tc) => tc.id === 101);
    assert.equal(updatedTc101.status, 'failed');
    assert.equal(updatedTc101.actualResult, 'Updated failure in execution projection');
    assert.equal(updatedTc101.testerId, 2); // Creator preserved via base_tc."testerId"
    assert.equal(updatedTc101.tester.name, 'Synthetic Tester One');
    assert.equal(updatedTc101.updatedById, 1);
    assert.equal(updatedTc101.updatedBy.name, 'Synthetic Admin');

    const updatedProjects = await fastRead.queryProjectsFromDb({});
    const updatedPortalProj = updatedProjects.find((p) => p.id === 1);
    assert.deepEqual(updatedPortalProj.stats, {
      total: 2,
      passed: 0,
      failed: 2,
      pending: 0,
      successRate: 0,
    });

    const updatedExcel = await exportAction.exportProjectExcelAction({
      projectId: 1,
      fromDate: '2026-11-01',
      toDate: '2026-11-06',
      tzOffsetMinutes: -120,
    });
    assert.equal(updatedExcel.success, true);
    assert.equal(updatedExcel.passedCount, 0);
    assert.equal(updatedExcel.failedCount, 2);

    // 9c. Verify addNewTestCase & updateTestCase seamlessly fall back to ACID PostgreSQL transactions when Render returns 503
    const prevGlobalFetch = global.fetch;
    global.fetch = async () => new Response("Service Waking", { status: 503 });
    try {
      const outageFetch = async () => new Response("<html>Bad Gateway</html>", { status: 503 });
      const revBeforeOutage = Number(
        (await pool.query('SELECT revision FROM app_cache_revision WHERE id = 1')).rows[0].revision,
      );

      const addActionsOutage = loadTsModule('src/app/(dashboard)/add/test-case.action.ts', {
        '@/lib/app-fetch': { appFetch: outageFetch },
        '@/lib/db': { pool },
        '@/app/myUtil': {
          getCurrentUserSession: async () => ({ id: '2', role: 'tester', token: 'tok-2' }),
        },
        './test-case-interface': {},
        'next/cache': {
          revalidatePath: (p) => revalidatedPaths.push(p),
          updateTag: (t) => invalidatedTags.push(t),
        },
        '@/lib/audit': auditMod,
      });

      const longModule = 'Extended Digital Governance Portal Module Over Fifty Characters Long Validation Check';
      const createdDuringOutage = await addActionsOutage.addNewTestCase({
        testId: 'TC-0901',
        module: longModule,
        pageName: 'Submissions',
        scenario: 'Create defect cleanly even while Render backend sleeps',
        preConditions: 'Tester assigned to project 1',
        steps: ['Open form', 'Submit defect'],
        expectedResult: 'Persists via direct PostgreSQL transaction',
        actualResult: 'Saved during 503 outage',
        priority: 'high',
        status: 'failed',
        severity: 'high',
        projectId: 1,
      });
      assert.equal(createdDuringOutage.success, true, createdDuringOutage.message);
      assert.equal(createdDuringOutage.data.module, longModule);
      assert.equal(createdDuringOutage.data.testerId, 2);

      const createdBaseRow = (
        await pool.query('SELECT * FROM test_cases WHERE id = $1', [createdDuringOutage.data.id])
      ).rows[0];
      assert.equal(createdBaseRow.status, 'pending');
      assert.equal(createdBaseRow.testerId, 2);
      assert.equal(createdBaseRow.module, longModule);

      const createdProjRow = (
        await pool.query('SELECT status, "actualResult" FROM test_cases_current WHERE id = $1', [
          createdDuringOutage.data.id,
        ])
      ).rows[0];
      assert.equal(createdProjRow.status, 'failed');
      assert.equal(createdProjRow.actualResult, 'Saved during 503 outage');

      const updateActionsAdminOutage = loadTsModule(
        'src/app/(dashboard)/test-cases/test-cases.action.ts',
        {
          '@/lib/app-fetch': { appFetch: outageFetch },
          '@/lib/db': { pool },
          '@/lib/fast-read': fastRead,
          '@/app/myUtil': {
            getCurrentUserSession: async () => ({ id: '1', role: 'admin', token: 'tok-1' }),
            getUserToken: async () => 'tok-1',
          },
          './test-cases.interface': {},
          'next/cache': {
            revalidatePath: (p) => revalidatedPaths.push(p),
            updateTag: (t) => invalidatedTags.push(t),
          },
          'next/navigation': { unstable_rethrow: () => {} },
          '@/lib/audit': auditMod,
        },
      );

      const orig101Before = (
        await pool.query('SELECT "testerId", "createdAt" FROM test_cases WHERE id = 101')
      ).rows[0];
      const updatedDuringOutage = await updateActionsAdminOutage.updateTestCase(101, {
        status: 'passed',
        actualResult: 'Verified fix during Render outage',
        notes: 'Cleared after retest',
        pageName: null,
      });
      assert.equal(updatedDuringOutage.success, true, updatedDuringOutage.message);
      assert.equal('testerId' in updatedDuringOutage.data, false);
      assert.equal('createdAt' in updatedDuringOutage.data, false);

      const orig101After = (
        await pool.query('SELECT "testerId", "createdAt", "updatedById", "pageName" FROM test_cases WHERE id = 101')
      ).rows[0];
      assert.equal(orig101After.testerId, orig101Before.testerId);
      assert.equal(
        new Date(orig101After.createdAt).toISOString(),
        new Date(orig101Before.createdAt).toISOString(),
      );
      assert.equal(orig101After.updatedById, 1);
      assert.equal(orig101After.pageName, '');

      const proj101After = (
        await pool.query('SELECT status, "actualResult", notes FROM test_cases_current WHERE id = 101')
      ).rows[0];
      assert.equal(proj101After.status, 'passed');
      assert.equal(proj101After.actualResult, 'Verified fix during Render outage');
      assert.equal(proj101After.notes, 'Cleared after retest');

      // Unauthorized tester (user 3 is assigned to project 2, NOT project 1) must be rejected without DB mutation
      const updateActionsUnauthOutage = loadTsModule(
        'src/app/(dashboard)/test-cases/test-cases.action.ts',
        {
          '@/lib/app-fetch': { appFetch: outageFetch },
          '@/lib/db': { pool },
          '@/lib/fast-read': fastRead,
          '@/app/myUtil': {
            getCurrentUserSession: async () => ({ id: '3', role: 'tester', token: 'tok-3' }),
            getUserToken: async () => 'tok-3',
          },
          './test-cases.interface': {},
          'next/cache': {
            revalidatePath: (p) => revalidatedPaths.push(p),
            updateTag: (t) => invalidatedTags.push(t),
          },
          'next/navigation': { unstable_rethrow: () => {} },
          '@/lib/audit': auditMod,
        },
      );
      const deniedOutageUpdate = await updateActionsUnauthOutage.updateTestCase(101, {
        status: 'failed',
      });
      assert.equal(deniedOutageUpdate.success, false);
      const proj101StillPassed = (
        await pool.query('SELECT status FROM test_cases_current WHERE id = 101')
      ).rows[0];
      assert.equal(proj101StillPassed.status, 'passed');

      const revAfterOutage = Number(
        (await pool.query('SELECT revision FROM app_cache_revision WHERE id = 1')).rows[0].revision,
      );
      assert.ok(revAfterOutage > revBeforeOutage);
    } finally {
      global.fetch = prevGlobalFetch;
    }

    // 10. Verify clear_project_primary_tester trigger on project_assignments DELETE
    await pool.query('DELETE FROM project_assignments WHERE "projectId" = 2 AND "userId" = 3');
    const proj2AfterDelete = (
      await pool.query('SELECT "assignedTesterId" FROM projects WHERE id = 2')
    ).rows[0];
    assert.equal(proj2AfterDelete.assignedTesterId, null);
  } finally {
    await close();
  }
});
