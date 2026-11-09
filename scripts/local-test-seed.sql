-- Isolated Local & Staging Test PostgreSQL Seed Data
-- STRICTLY SYNTHETIC DATA ONLY. No real employee accounts, government records, or production values.

BEGIN;

-- Synthetic test password for all 3 synthetic accounts: StagingTest#2026!
INSERT INTO users (id, name, email, password, role, "profileImage", photo, "minTokenIat", "createdAt", "updatedAt")
VALUES
  (1, 'Synthetic Admin', 'admin@synthetic.local', '$2b$10$eYfI3U6XjQHEHswfdkMlfOyHFacSPKNrWGlHi7uwMjy4U89vrBPsi', 'admin', 'http://127.0.0.1:8787/icon.png', 'http://127.0.0.1:8787/icon.png', 0, '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
  (2, 'Synthetic Tester One', 'tester1@synthetic.local', '$2b$10$eYfI3U6XjQHEHswfdkMlfOyHFacSPKNrWGlHi7uwMjy4U89vrBPsi', 'tester', 'http://127.0.0.1:8787/icon.png', 'http://127.0.0.1:8787/icon.png', 0, '2026-11-01T08:05:00Z', '2026-11-01T08:05:00Z'),
  (3, 'Synthetic Tester Two', 'tester2@synthetic.local', '$2b$10$eYfI3U6XjQHEHswfdkMlfOyHFacSPKNrWGlHi7uwMjy4U89vrBPsi', 'tester', 'http://127.0.0.1:8787/icon.png', 'http://127.0.0.1:8787/icon.png', 0, '2026-11-01T08:10:00Z', '2026-11-01T08:10:00Z')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);

INSERT INTO projects (id, name, description, application, environment, status, "startAt", "endAt", "assignedTesterId", "createdAt", "updatedAt")
VALUES
  (1, 'Synthetic Portal Project', 'Synthetic QA project for portal verification', 'Synthetic Portal', 'staging', 'active', '2026-11-01T09:00:00Z', '2026-11-15T17:00:00Z', 2, '2026-11-01T09:00:00Z', '2026-11-01T09:00:00Z'),
  (2, 'Synthetic Payments Project', 'Synthetic QA project for payment gateway verification', 'Synthetic Payments', 'production', 'active', '2026-11-02T09:00:00Z', '2026-11-20T17:00:00Z', 3, '2026-11-02T09:00:00Z', '2026-11-02T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('projects', 'id'), COALESCE((SELECT MAX(id) FROM projects), 1), true);

INSERT INTO project_assignments ("userId", "projectId", "primaryManaged", "assignedAt")
VALUES
  (1, 1, FALSE, '2026-11-01T09:05:00Z'),
  (2, 1, TRUE,  '2026-11-01T09:05:00Z'),
  (3, 2, TRUE,  '2026-11-02T09:05:00Z')
ON CONFLICT ("userId", "projectId") DO NOTHING;

INSERT INTO test_cases (
  id, "testId", module, "pageName", scenario, "preConditions", steps,
  "expectedResult", "actualResult", priority, status, severity, notes,
  "executedAt", "testerId", "updatedById", "projectId", "createdAt", "updatedAt"
)
VALUES
  (
    101, 'TC_SYN_001', 'Synthetic Portal', 'Login Screen',
    'Verify synthetic login with valid credentials',
    'Synthetic user exists in local test database',
    '["Open synthetic login page", "Enter synthetic credentials", "Submit form"]',
    'User is redirected to synthetic dashboard',
    'Redirected to dashboard in 120ms',
    'high', 'passed', NULL, 'Synthetic execution note 1',
    '2026-11-05T10:00:00Z', 2, 2, 1, '2026-11-04T10:00:00Z', '2026-11-05T10:00:00Z'
  ),
  (
    102, 'TC_SYN_002', 'Synthetic Portal', 'Profile Settings',
    'Verify validation error on invalid synthetic avatar format',
    'Signed in as synthetic tester',
    '["Open profile settings", "Select invalid file extension", "Click Save"]',
    'Validation banner rejects unsupported format',
    'Validation banner missing on mobile viewport',
    'medium', 'failed', 'high', 'Synthetic defect logged',
    '2026-11-05T11:30:00Z', 2, 1, 1, '2026-11-04T11:00:00Z', '2026-11-05T11:30:00Z'
  ),
  (
    103, 'TC_SYN_003', 'Synthetic Payments', 'Checkout Flow',
    'Verify synthetic receipt generation',
    'Synthetic order is in ready state',
    '["Submit synthetic payment", "Download receipt PDF"]',
    'Receipt PDF downloads with synthetic reference ID',
    NULL,
    'high', 'pending', NULL, NULL,
    NULL, 3, 3, 2, '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('test_cases', 'id'), COALESCE((SELECT MAX(id) FROM test_cases), 103), true);

INSERT INTO test_case_imports (
  "testCaseId", "projectId", "sourceKey", "sourceTestId", "sourceRow",
  "rowHash", "batchHash", original, "plannedAt", "plannedTimezone", "importedById"
)
VALUES (
  101, 1, 'synthetic-seed-v1', 'TC_SYN_001', 1,
  '1111111111111111111111111111111111111111111111111111111111111111',
  '2222222222222222222222222222222222222222222222222222222222222222',
  '{"Sheet":"Synthetic","Row":1,"TestId":"TC_SYN_001"}'::jsonb,
  '2026-11-05T10:00:00Z', 'Africa/Cairo', 1
)
ON CONFLICT ("testCaseId") DO NOTHING;

INSERT INTO releases (id, "projectId", name, version, description, status, "startDate", "releaseDate", "createdById", "updatedById")
VALUES
  (1, 1, 'Synthetic Release 1.0', 'v1.0.0-syn', 'Initial synthetic release', 'testing', '2026-11-01', '2026-11-15', 1, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('releases', 'id'), COALESCE((SELECT MAX(id) FROM releases), 1), true);

INSERT INTO test_cycles (id, "projectId", "releaseId", name, description, status, "startDate", "endDate", "createdById")
VALUES
  (1, 1, 1, 'Synthetic Cycle 1 - Smoke', 'Synthetic smoke test cycle', 'active', '2026-11-04', '2026-11-10', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('test_cycles', 'id'), COALESCE((SELECT MAX(id) FROM test_cycles), 1), true);

INSERT INTO test_cycle_items (id, "cycleId", "projectId", "testCaseId", "testerId", snapshot)
VALUES
  (1, 1, 1, 101, 2, '{"testId":"TC_SYN_001","scenario":"Verify synthetic login with valid credentials"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('test_cycle_items', 'id'), COALESCE((SELECT MAX(id) FROM test_cycle_items), 1), true);

INSERT INTO test_executions (
  id, "testCaseId", "cycleItemId", "projectId", "testerId", "testerName",
  status, "actualResult", notes, environment, "executedAt", "durationSeconds",
  snapshot, source, "sourceKey"
)
VALUES
  (
    1, 101, 1, 1, 2, 'Synthetic Tester One',
    'passed', 'Redirected to dashboard in 120ms', 'Synthetic execution note 1',
    'staging', '2026-11-05T10:00:00Z', 45,
    '{"testId":"TC_SYN_001","status":"passed"}'::jsonb,
    'cycle', 'syn_exec:101:1'
  )
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('test_executions', 'id'), COALESCE((SELECT MAX(id) FROM test_executions), 1), true);

INSERT INTO quality_applications (
  id, name, "nameAr", category, url, environment, version,
  status, "passRate", "suitesCount", "bugsCount", "lastCheck", "defaultFunctions"
)
VALUES
  (
    1, 'Synthetic Portal App', 'تطبيق البوابة التجريبي', 'Synthetic Services',
    'https://portal.synthetic.invalid', 'Staging', 'v1.0-syn',
    'Healthy', 96.0, 20, 1, '2026-11-05',
    '["Synthetic Login", "Synthetic Dashboard", "Synthetic Export"]'::jsonb
  ),
  (
    2, 'Synthetic Payments App', 'تطبيق المدفوعات التجريبي', 'Financial Synthetic',
    'https://payments.synthetic.invalid', 'Staging', 'v1.2-syn',
    'Warning', 85.0, 15, 2, '2026-11-05',
    '["Synthetic Checkout", "Synthetic Refund"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('quality_applications', 'id'), COALESCE((SELECT MAX(id) FROM quality_applications), 2), true);

INSERT INTO quality_checklists (
  id, "appId", "testerId", "testerName", "isUpAndRunning",
  "functionsResults", "passedCount", "issuesCount", "performanceScore", notes
)
VALUES
  (
    1, 1, 2, 'Synthetic Tester One', TRUE,
    '[{"name":"Synthetic Login","status":"pass"},{"name":"Synthetic Dashboard","status":"pass"}]'::jsonb,
    2, 0, 100.0, 'Synthetic initial checklist pass'
  )
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('quality_checklists', 'id'), COALESCE((SELECT MAX(id) FROM quality_checklists), 1), true);

COMMIT;
