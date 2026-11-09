-- Isolated Local & Staging Test PostgreSQL Schema
-- Derived strictly from application source code and local migrations.
-- Contains NO production data, credentials, or government records.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'tester',
  "profileImage" TEXT DEFAULT 'http://127.0.0.1:8787/icon.png',
  photo TEXT DEFAULT 'http://127.0.0.1:8787/icon.png',
  "minTokenIat" BIGINT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  application TEXT,
  environment TEXT DEFAULT 'staging',
  status TEXT DEFAULT 'active',
  "startAt" TIMESTAMPTZ,
  "endAt" TIMESTAMPTZ,
  "assignedTesterId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_schedule_valid CHECK (
    ("startAt" IS NULL AND "endAt" IS NULL) OR
    ("startAt" IS NOT NULL AND "endAt" IS NOT NULL AND "startAt" < "endAt")
  )
);

CREATE INDEX IF NOT EXISTS projects_due_idx
  ON projects("endAt")
  WHERE "assignedTesterId" IS NOT NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  "testId" TEXT NOT NULL,
  module TEXT NOT NULL,
  "pageName" TEXT,
  scenario TEXT NOT NULL,
  "preConditions" TEXT,
  steps TEXT NOT NULL,
  "expectedResult" TEXT NOT NULL,
  "actualResult" TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  severity TEXT DEFAULT NULL,
  notes TEXT,
  "executedAt" TIMESTAMPTZ,
  "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "updatedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "test_cases_project_testid_idx"
  ON test_cases (COALESCE("projectId", 0), "testId");

CREATE TABLE IF NOT EXISTS project_assignments (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "primaryManaged" BOOLEAN NOT NULL DEFAULT FALSE,
  "assignedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "projectId")
);

CREATE OR REPLACE FUNCTION clear_project_primary_tester() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE projects SET "assignedTesterId" = NULL, "updatedAt" = NOW()
  WHERE id = OLD."projectId" AND "assignedTesterId" = OLD."userId";
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS clear_project_primary_tester ON project_assignments;
CREATE TRIGGER clear_project_primary_tester
  AFTER DELETE ON project_assignments
  FOR EACH ROW EXECUTE FUNCTION clear_project_primary_tester();

CREATE TABLE IF NOT EXISTS project_deadline_deliveries (
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "endAt" TIMESTAMPTZ NOT NULL,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "deliveredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("projectId", "endAt", "userId")
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "titleEn" TEXT,
  message TEXT NOT NULL,
  "messageEn" TEXT,
  link TEXT,
  "projectId" INTEGER,
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_login_sessions (
  id SERIAL PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userName" TEXT,
  email TEXT,
  ip TEXT,
  "macAddress" TEXT,
  "deviceInfo" TEXT,
  location TEXT,
  "userAgent" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "userName" TEXT,
  email TEXT,
  role TEXT,
  action TEXT NOT NULL,
  "actionCategory" TEXT,
  description TEXT,
  method TEXT,
  endpoint TEXT,
  ip TEXT,
  "macAddress" TEXT,
  location TEXT,
  "deviceInfo" TEXT,
  "userAgent" TEXT,
  status TEXT DEFAULT 'success',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON audit_logs ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON audit_logs ("userId");

CREATE TABLE IF NOT EXISTS quality_applications (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "nameAr" TEXT,
  category TEXT DEFAULT 'Government Services',
  url TEXT,
  environment TEXT DEFAULT 'Production',
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'Healthy',
  "passRate" NUMERIC(5,2) DEFAULT 95.0,
  "suitesCount" INT DEFAULT 100,
  "bugsCount" INT DEFAULT 0,
  "lastCheck" TEXT DEFAULT 'Recently',
  "defaultFunctions" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_checklists (
  id SERIAL PRIMARY KEY,
  "appId" INT NOT NULL REFERENCES quality_applications(id) ON DELETE CASCADE,
  "testerId" INT REFERENCES users(id) ON DELETE SET NULL,
  "testerName" TEXT,
  "isUpAndRunning" BOOLEAN DEFAULT TRUE,
  "functionsResults" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "passedCount" INT DEFAULT 0,
  "issuesCount" INT DEFAULT 0,
  "performanceScore" NUMERIC(5,2) DEFAULT 100.0,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS releases (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 200),
  version VARCHAR(100) NOT NULL CHECK(length(btrim(version)) > 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','testing','released','archived')),
  "startDate" DATE,
  "releaseDate" DATE,
  "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "updatedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK("startDate" IS NULL OR "releaseDate" IS NULL OR "releaseDate" >= "startDate"),
  UNIQUE(id, "projectId")
);

CREATE UNIQUE INDEX IF NOT EXISTS releases_project_version ON releases("projectId", lower(btrim(version)));
CREATE INDEX IF NOT EXISTS releases_project_status ON releases("projectId", status, id);

CREATE TABLE IF NOT EXISTS test_cycles (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  "releaseId" INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','completed','archived')),
  "startDate" DATE,
  "endDate" DATE,
  "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY("releaseId", "projectId") REFERENCES releases(id, "projectId") ON DELETE RESTRICT,
  CHECK("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate"),
  UNIQUE(id, "projectId")
);

CREATE INDEX IF NOT EXISTS cycles_release ON test_cycles("releaseId", id);

CREATE TABLE IF NOT EXISTS test_cycle_items (
  id SERIAL PRIMARY KEY,
  "cycleId" INTEGER NOT NULL,
  "projectId" INTEGER NOT NULL,
  "testCaseId" INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE RESTRICT,
  "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY("cycleId", "projectId") REFERENCES test_cycles(id, "projectId") ON DELETE RESTRICT,
  UNIQUE("cycleId", "testCaseId"),
  UNIQUE(id, "testCaseId", "projectId")
);

CREATE INDEX IF NOT EXISTS cycle_items_tester ON test_cycle_items("testerId", "cycleId");

CREATE TABLE IF NOT EXISTS test_executions (
  id SERIAL PRIMARY KEY,
  "testCaseId" INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE RESTRICT,
  "cycleItemId" INTEGER,
  "projectId" INTEGER REFERENCES projects(id) ON DELETE RESTRICT,
  "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "testerName" TEXT,
  status TEXT NOT NULL CHECK(status IN ('not_run','passed','failed','blocked','skipped')),
  "actualResult" TEXT,
  notes TEXT,
  environment VARCHAR(200),
  "executedAt" TIMESTAMPTZ,
  "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "durationSeconds" INTEGER CHECK("durationSeconds" >= 0),
  snapshot JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'cycle' CHECK(source IN ('cycle','legacy','compatibility')),
  "sourceKey" TEXT UNIQUE,
  FOREIGN KEY("cycleItemId", "testCaseId", "projectId") REFERENCES test_cycle_items(id, "testCaseId", "projectId") ON DELETE RESTRICT,
  CHECK("cycleItemId" IS NULL OR "projectId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS executions_case_history ON test_executions("testCaseId", id DESC);
CREATE INDEX IF NOT EXISTS executions_item_latest ON test_executions("cycleItemId", id DESC);
CREATE INDEX IF NOT EXISTS executions_project ON test_executions("projectId", id DESC);

CREATE OR REPLACE VIEW test_cases_current AS
SELECT
  tc.id,
  tc."testId",
  tc.module,
  tc."pageName",
  tc.scenario,
  tc."preConditions",
  tc.steps,
  tc."expectedResult",
  CASE WHEN e.id IS NOT NULL THEN e."actualResult" ELSE tc."actualResult" END AS "actualResult",
  tc.priority,
  CASE WHEN e.id IS NOT NULL THEN CASE WHEN e.status = 'not_run' THEN 'pending' ELSE e.status END ELSE tc.status END AS status,
  tc.severity,
  CASE WHEN e.id IS NOT NULL THEN e.notes ELSE tc.notes END AS notes,
  CASE WHEN e.id IS NOT NULL THEN e."executedAt" ELSE tc."executedAt" END AS "executedAt",
  CASE WHEN e.id IS NOT NULL THEN e."testerId" ELSE tc."testerId" END AS "testerId",
  tc."updatedById",
  tc."projectId",
  tc."createdAt",
  tc."updatedAt"
FROM test_cases tc
LEFT JOIN LATERAL (
  SELECT * FROM test_executions WHERE "testCaseId" = tc.id ORDER BY id DESC LIMIT 1
) e ON true;

CREATE TABLE IF NOT EXISTS test_case_imports (
  "testCaseId" INTEGER PRIMARY KEY REFERENCES test_cases(id) ON DELETE CASCADE,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  "sourceKey" TEXT NOT NULL,
  "sourceTestId" TEXT NOT NULL,
  "sourceRow" INTEGER NOT NULL CHECK("sourceRow" BETWEEN 1 AND 51),
  "rowHash" TEXT NOT NULL,
  "batchHash" TEXT NOT NULL,
  original JSONB NOT NULL CHECK(jsonb_typeof(original) = 'object'),
  "plannedAt" TIMESTAMPTZ,
  "plannedTimezone" TEXT,
  "importedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "importedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("projectId", "sourceKey", "sourceTestId"),
  UNIQUE("projectId", "sourceKey", "sourceRow")
);

CREATE INDEX IF NOT EXISTS test_case_imports_batch ON test_case_imports("batchHash");
ALTER TABLE test_case_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE test_case_imports FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_cache_revision (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  revision BIGINT NOT NULL DEFAULT 1
);

INSERT INTO app_cache_revision(id, revision)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION bump_app_cache_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE app_cache_revision SET revision = revision + 1 WHERE id = 1;
  RETURN NULL;
END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects',
    'project_assignments',
    'users',
    'test_cases',
    'releases',
    'test_cycles',
    'test_cycle_items',
    'test_executions',
    'quality_applications',
    'quality_checklists'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS cache_revision_changed ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER cache_revision_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION bump_app_cache_revision()',
      tbl
    );
  END LOOP;
END $$;

INSERT INTO schema_migrations(name) VALUES
  ('20261025_execution_workflow_v1'),
  ('20261104_project_deadlines_v1'),
  ('20261104_cache_revision_v1'),
  ('20261105_test_case_imports_v1')
ON CONFLICT (name) DO NOTHING;

COMMIT;
