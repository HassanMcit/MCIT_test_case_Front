import { unstable_cache } from "next/cache";
import { pool } from "@/lib/db";
import type { ProjectApiItem } from "@/app/(dashboard)/projects/getProjects.action";
import type {
  TestCaseItem,
  TestCaseListResponse,
  TestCaseQueryParams,
} from "@/app/(dashboard)/test-cases/test-cases.interface";

/**
 * Races a cached backend `fetch` promise against a short timeout (e.g. 2000ms).
 * - If Next.js `force-cache` hits -> resolves in ~1ms.
 * - If Render is awake -> resolves in ~150ms and populates `force-cache`.
 * - If Render is asleep (Cold Start) -> returns `null` after `timeoutMs` while the
 *   underlying `fetch` continues waking Render & populating `force-cache` in background!
 */
export async function raceBackendFetch(
  fetchPromise: Promise<Response>,
  timeoutMs = 2000
): Promise<Response | null> {
  // Prevent unhandled rejection if fetch fails later in background
  const safeFetch = fetchPromise.catch(() => null);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );
  return Promise.race([safeFetch, timeout]);
}

function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function parseStepsArray(rawSteps: any): string[] {
  if (!rawSteps) return [];
  if (Array.isArray(rawSteps)) return rawSteps.map((s) => String(s ?? ""));
  if (typeof rawSteps === "string") {
    try {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s ?? ""));
    } catch {
      return rawSteps
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Fast direct PostgreSQL fallback for `getProjects` (~80ms on Supabase Pooler)
 */
async function queryProjectsFromDbRaw(params?: {
  environment?: string;
  status?: string;
  search?: string;
  shouldFilterToMe?: boolean;
  currentUserId?: number;
  assignedToUserId?: number;
}): Promise<ProjectApiItem[]> {
  const [projRes, assignRes, tcStatsRes] = await Promise.all([
    pool.query(`SELECT to_jsonb(p) AS p_json FROM projects p ORDER BY p.id DESC`),
    pool.query(`
      SELECT pa.id AS pa_id, pa."projectId", pa."userId", to_jsonb(pa) AS pa_json, to_jsonb(u) AS u_json
      FROM project_assignments pa
      INNER JOIN users u ON pa."userId" = u.id
      ORDER BY pa.id ASC
    `),
    pool.query(`
      SELECT "projectId", LOWER(TRIM(COALESCE(module, ''))) AS mod_key, status, COUNT(*)::int AS cnt
      FROM test_cases
      GROUP BY "projectId", LOWER(TRIM(COALESCE(module, ''))), status
    `),
  ]);

  const assignmentsByProject = new Map<number, NonNullable<ProjectApiItem["assignedUsers"]>>();
  for (const row of assignRes.rows) {
    const pid = Number(row.projectId);
    const u = row.u_json || {};
    const pa = row.pa_json || {};
    const photo = u.photo || u.profileImage || "";
    const list = assignmentsByProject.get(pid) || [];
    list.push({
      id: Number(row.pa_id) || Number(u.id),
      userId: Number(row.userId) || Number(u.id),
      name: u.name || "",
      email: u.email || "",
      role: u.role || "tester",
      photo,
      profileImage: u.profileImage || photo,
      assignedAt: toIsoString(pa.assignedAt || pa.createdAt),
    });
    assignmentsByProject.set(pid, list);
  }

  let items: ProjectApiItem[] = projRes.rows.map((r: any) => {
    const p = r.p_json || {};
    const pid = Number(p.id);
    const pNameLower = String(p.name || "").trim().toLowerCase();

    let total = 0;
    let passed = 0;
    let failed = 0;
    let pending = 0;

    for (const st of tcStatsRes.rows) {
      const matchId = st.projectId && Number(st.projectId) === pid;
      const matchMod = !st.projectId && pNameLower && st.mod_key === pNameLower;
      if (matchId || matchMod) {
        const c = Number(st.cnt) || 0;
        total += c;
        if (st.status === "passed") passed += c;
        else if (st.status === "failed") failed += c;
        else pending += c;
      }
    }

    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      id: pid,
      name: p.name || "",
      description: p.description ?? null,
      application: p.application ?? null,
      environment: p.environment === "production" ? "production" : "staging",
      status: p.status === "archived" ? "archived" : "active",
      createdAt: toIsoString(p.createdAt),
      updatedAt: toIsoString(p.updatedAt || p.createdAt),
      stats: { total, passed, failed, pending, successRate },
      assignedUsers: assignmentsByProject.get(pid) || [],
    };
  });

  if (params?.environment && params.environment !== "all") {
    items = items.filter((p) => p.environment === params.environment);
  }
  if (params?.status && params.status !== "all") {
    items = items.filter((p) => p.status === params.status);
  }
  if (params?.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.application && p.application.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }
  if (params?.shouldFilterToMe && params?.currentUserId) {
    const uid = Number(params.currentUserId);
    items = items.filter((p) =>
      (p.assignedUsers || []).some((au) => au.userId === uid || au.id === uid)
    );
  }
  if (params?.assignedToUserId) {
    const targetUid = Number(params.assignedToUserId);
    items = items.filter((p) =>
      (p.assignedUsers || []).some((au) => au.userId === targetUid || au.id === targetUid)
    );
  }

  return items;
}

export const queryProjectsFromDb = unstable_cache(
  queryProjectsFromDbRaw,
  ["fast-read-projects"],
  {
    tags: ["projects", "test-cases", "dashboard", "dashboard-stats"],
    revalidate: false,
  }
);

/**
 * Fast direct PostgreSQL fallback for `getTestCases` (~80ms on Supabase Pooler)
 */
async function queryTestCasesFromDbRaw(
  params?: TestCaseQueryParams,
  sessionUser?: { id?: number; role?: string } | null
): Promise<TestCaseListResponse> {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.max(1, Math.min(2000, Number(params?.limit) || 50));

  const conditions: string[] = ["1=1"];
  const sqlParams: any[] = [];
  let idx = 1;

  if (sessionUser && sessionUser.role !== "admin" && sessionUser.id) {
    conditions.push(`(
      (tc."projectId" IS NOT NULL AND tc."projectId" IN (SELECT pa."projectId" FROM project_assignments pa WHERE pa."userId" = $${idx}))
      OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p INNER JOIN project_assignments pa ON p.id = pa."projectId" WHERE pa."userId" = $${idx + 1}))
      OR tc."testerId" = $${idx + 2}
    )`);
    sqlParams.push(Number(sessionUser.id), Number(sessionUser.id), Number(sessionUser.id));
    idx += 3;
  }

  if (params?.status && params.status !== "all") {
    conditions.push(`tc.status = $${idx++}`);
    sqlParams.push(params.status);
  }
  if (params?.priority && params.priority !== "all") {
    conditions.push(`tc.priority = $${idx++}`);
    sqlParams.push(params.priority);
  }
  if (params?.module && params.module !== "all") {
    conditions.push(`tc.module = $${idx++}`);
    sqlParams.push(params.module);
  }
  if (params?.projectId && Number(params.projectId) > 0) {
    conditions.push(
      `(tc."projectId" = $${idx} OR tc.module = (SELECT name FROM projects WHERE id = $${idx + 1}))`
    );
    sqlParams.push(Number(params.projectId), Number(params.projectId));
    idx += 2;
  }
  if (params?.search && params.search.trim() !== "") {
    conditions.push(
      `(tc."testId" ILIKE $${idx} OR tc.module ILIKE $${idx} OR tc.scenario ILIKE $${idx} OR COALESCE(tc."pageName", '') ILIKE $${idx})`
    );
    sqlParams.push(`%${params.search.trim()}%`);
    idx++;
  }

  const whereSql = conditions.join(" AND ");

  const [countRes, rowsRes, usersRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM test_cases tc WHERE ${whereSql}`, sqlParams),
    pool.query(
      `SELECT to_jsonb(tc) AS tc_json, to_jsonb(u) AS tester_json, to_jsonb(p) AS proj_json
       FROM test_cases tc
       LEFT JOIN users u ON tc."testerId" = u.id
       LEFT JOIN projects p ON tc."projectId" = p.id
       WHERE ${whereSql}
       ORDER BY COALESCE(tc."executedAt", tc."createdAt") DESC, tc.id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...sqlParams, limit, (page - 1) * limit]
    ),
    pool.query(`SELECT id, to_jsonb(u) AS u_json FROM users u`),
  ]);

  const userMap = new Map<number, any>();
  for (const ur of usersRes.rows) {
    userMap.set(Number(ur.id), ur.u_json || {});
  }

  const total = Number(countRes.rows[0]?.total) || 0;
  const data: TestCaseItem[] = rowsRes.rows.map((r: any) => {
    const tc = r.tc_json || {};
    const u = r.tester_json || (tc.testerId ? userMap.get(Number(tc.testerId)) : null);
    const updU = tc.updatedById ? userMap.get(Number(tc.updatedById)) : null;
    const p = r.proj_json || null;

    return {
      id: Number(tc.id),
      testId: tc.testId || `TC-${String(tc.id).padStart(4, "0")}`,
      module: tc.module || p?.name || "",
      pageName: tc.pageName ?? null,
      scenario: tc.scenario || "",
      preConditions: tc.preConditions ?? null,
      steps: parseStepsArray(tc.steps),
      expectedResult: tc.expectedResult || "",
      actualResult: tc.actualResult ?? null,
      priority: tc.priority || "medium",
      status: tc.status || "pending",
      severity: tc.severity ?? null,
      notes: tc.notes ?? null,
      executedAt: tc.executedAt ? toIsoString(tc.executedAt) : null,
      testerId: tc.testerId ? Number(tc.testerId) : null,
      userId: tc.userId ? Number(tc.userId) : tc.testerId ? Number(tc.testerId) : null,
      updatedById: tc.updatedById ? Number(tc.updatedById) : null,
      projectId: tc.projectId ? Number(tc.projectId) : null,
      createdAt: toIsoString(tc.createdAt),
      updatedAt: toIsoString(tc.updatedAt || tc.createdAt),
      tester: u
        ? {
            id: Number(u.id),
            userId: Number(u.id),
            name: u.name || "",
            email: u.email || "",
            photo: u.photo || u.profileImage || undefined,
          }
        : null,
      updatedBy: updU
        ? {
            id: Number(updU.id),
            userId: Number(updU.id),
            name: updU.name || "",
            email: updU.email || "",
            photo: updU.photo || updU.profileImage || undefined,
          }
        : null,
      project: p ? { id: Number(p.id), name: p.name || "" } : null,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export const queryTestCasesFromDb = unstable_cache(
  queryTestCasesFromDbRaw,
  ["fast-read-test-cases"],
  {
    tags: ["test-cases", "projects", "dashboard", "dashboard-stats"],
    revalidate: false,
  }
);

/**
 * Fast direct PostgreSQL fallback for `getAllUsers` (~80ms on Supabase Pooler)
 */
async function queryAllUsersFromDbRaw() {
  const [usersRes, assignRes, tcCountRes] = await Promise.all([
    pool.query(`SELECT to_jsonb(u) AS u_json FROM users u ORDER BY u.id DESC`),
    pool.query(`
      SELECT pa.id AS pa_id, pa."userId", pa."projectId", to_jsonb(pa) AS pa_json, to_jsonb(p) AS p_json
      FROM project_assignments pa
      INNER JOIN projects p ON pa."projectId" = p.id
      ORDER BY pa.id DESC
    `),
    pool.query(`
      SELECT "testerId", COUNT(*)::int AS cnt
      FROM test_cases
      WHERE "testerId" IS NOT NULL
      GROUP BY "testerId"
    `),
  ]);

  const tcByUser = new Map<number, number>();
  for (const r of tcCountRes.rows) {
    tcByUser.set(Number(r.testerId), Number(r.cnt) || 0);
  }

  const projectsByUser = new Map<number, any[]>();
  for (const r of assignRes.rows) {
    const uid = Number(r.userId);
    const p = r.p_json || {};
    const pa = r.pa_json || {};
    const list = projectsByUser.get(uid) || [];
    list.push({
      id: Number(p.id),
      projectId: Number(p.id),
      name: p.name || "",
      description: p.description ?? null,
      application: p.application ?? null,
      environment: p.environment || "staging",
      status: p.status || "active",
      assignedAt: toIsoString(pa.assignedAt || pa.createdAt),
    });
    projectsByUser.set(uid, list);
  }

  return usersRes.rows.map((r: any) => {
    const u = r.u_json || {};
    const uid = Number(u.id);
    const photo = u.photo || u.profileImage || "";
    const assignedProjects = projectsByUser.get(uid) || [];
    const testCasesCount = tcByUser.get(uid) || 0;

    return {
      id: uid,
      userId: uid,
      name: u.name || "",
      email: u.email || "",
      role: u.role || "tester",
      photo,
      profileImage: u.profileImage || photo,
      createdAt: toIsoString(u.createdAt),
      updatedAt: toIsoString(u.updatedAt || u.createdAt),
      _count: {
        testCases: testCasesCount,
        assignedProjects: assignedProjects.length,
      },
      assignedProjects,
    };
  });
}

export const queryAllUsersFromDb = unstable_cache(
  queryAllUsersFromDbRaw,
  ["fast-read-all-users"],
  {
    tags: ["users", "projects", "test-cases", "dashboard"],
    revalidate: false,
  }
);
