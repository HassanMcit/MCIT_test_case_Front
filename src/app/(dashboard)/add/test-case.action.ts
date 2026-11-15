"use server";
import { appFetch } from "@/lib/app-fetch";
import { pool } from "@/lib/db";
import { getCurrentUserSession } from "@/app/myUtil";
import type { AddTestCaseResponse, TestCaseFormValues } from "./test-case-interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  isAbortLikeError,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

const GATEWAY_OUTAGE_STATUSES = new Set([502, 503]);
const NEXT_ID_TIMEOUT_MS = 15000;
const TEST_ID_PATTERN = /^(TC|BUG)-\d{4,}$/;
const MODULE_PATTERN = /^[\p{L}\p{N}\s\-_.,()&/:'"+–—]{2,200}$/u;

function formatTestCaseId(num: number, status?: string): string {
  const prefix = status === "failed" ? "BUG-" : "TC-";
  return `${prefix}${String(Math.max(1, num)).padStart(4, "0")}`;
}

function parseTestCaseNumber(id?: string | null): number {
  const match = (id || "").match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function computeNextTestCaseId(
  existingIds: Array<string | null | undefined>,
  minimumNum = 0,
): string {
  let maxNum = minimumNum;
  for (const rawId of existingIds) {
    const num = parseTestCaseNumber(rawId);
    if (num > maxNum) maxNum = num;
  }
  return `TC-${String(maxNum + 1).padStart(4, "0")}`;
}

function createTimeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

async function postTestCaseWithWakeRetry(
  baseUrl: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetchWithWakeRetry(
    appFetch,
    `${baseUrl}/api/test-cases`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    {
      maxAttempts: 2,
      timeoutsMs: [15000, 18000],
      retryOnTimeout: false,
      retryStatuses: GATEWAY_OUTAGE_STATUSES,
      baseUrl,
    },
  );
}

type DirectCreateFallbackResult =
  | { ok: true; data: Record<string, any> }
  | { ok: false; message: string }
  | null;

async function addTestCaseDirectDbFallback(
  payload: Record<string, any>,
  sessionUser: { id?: string | number; role?: string } | null,
): Promise<DirectCreateFallbackResult> {
  const actorId = Number(sessionUser?.id);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return null;
  }

  const dbPool = pool as any;
  if (!dbPool || typeof dbPool.connect !== "function") {
    return null;
  }

  if (!TEST_ID_PATTERN.test(String(payload.testId || ""))) {
    return {
      ok: false,
      message: "يجب أن يطابق معرّف الاختبار النمط TC-XXXX أو BUG-XXXX (مثل TC-8492 أو BUG-8492)",
    };
  }
  if (!MODULE_PATTERN.test(String(payload.module || ""))) {
    return {
      ok: false,
      message: "اسم الوحدة البرمجية يجب أن يتكون من 2 إلى 200 حرف مقبولة",
    };
  }
  if (String(payload.scenario || "").trim().length < 5) {
    return {
      ok: false,
      message: "سيناريو الاختبار يجب ألا يقل عن 5 أحرف",
    };
  }
  if (!Array.isArray(payload.steps) || payload.steps.length === 0) {
    return {
      ok: false,
      message: "يجب إدخال خطوة اختبار واحدة على الأقل",
    };
  }
  if (typeof payload.expectedResult !== "string" || payload.expectedResult.trim() === "") {
    return {
      ok: false,
      message: "النتيجة المتوقعة مطلوبة",
    };
  }

  const targetProjectId = payload.projectId ? Number(payload.projectId) : null;
  const isAdmin = sessionUser?.role === "admin";
  if (!targetProjectId && !isAdmin) {
    return {
      ok: false,
      message: "يرجى اختيار مشروع مسند إليك",
    };
  }

  const requestedTesterId = payload.testerId ?? payload.userId ?? actorId;
  const targetTesterId = Number(requestedTesterId) || actorId;
  if (!isAdmin && targetTesterId !== actorId) {
    return {
      ok: false,
      message: "لا يمكنك إسناد حالة الاختبار لمستخدم آخر",
    };
  }

  let client: any;
  let began = false;
  try {
    client = await dbPool.connect();
    await client.query("BEGIN");
    began = true;

    if (targetProjectId) {
      const projRes = await client.query("SELECT id FROM projects WHERE id = $1", [targetProjectId]);
      if (!projRes.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, message: "المشروع المحدد غير موجود" };
      }
      if (!isAdmin) {
        const memRes = await client.query(
          'SELECT 1 FROM project_assignments WHERE "projectId" = $1 AND "userId" = $2',
          [targetProjectId, actorId],
        );
        if (!memRes.rowCount && memRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return { ok: false, message: "ليس لديك صلاحية لإضافة حالات في هذا المشروع" };
        }
      }
    }

    let testId = String(payload.testId).trim();
    const dupRes = targetProjectId
      ? await client.query(
          'SELECT id FROM test_cases WHERE "testId" = $1 AND "projectId" = $2',
          [testId, targetProjectId],
        )
      : payload.module
        ? await client.query(
            'SELECT id FROM test_cases WHERE "testId" = $1 AND LOWER(TRIM(module)) = LOWER(TRIM($2))',
            [testId, payload.module],
          )
        : await client.query(
            'SELECT id FROM test_cases WHERE "testId" = $1 AND "projectId" IS NULL',
            [testId],
          );

    if (dupRes.rows.length > 0) {
      const idRowsRes = targetProjectId
        ? await client.query('SELECT "testId" FROM test_cases WHERE "projectId" = $1', [targetProjectId])
        : payload.module
          ? await client.query(
              'SELECT "testId" FROM test_cases WHERE LOWER(TRIM(module)) = LOWER(TRIM($1))',
              [payload.module],
            )
          : await client.query('SELECT "testId" FROM test_cases');
      const nextTcId = computeNextTestCaseId(
        idRowsRes.rows.map((r: { testId?: string }) => r.testId),
        parseTestCaseNumber(testId),
      );
      testId = payload.status === "failed" ? nextTcId.replace(/^TC-/, "BUG-") : nextTcId;
    }

    const schemaRes = await client.query(
      "SELECT to_regclass('public.test_executions') AS exec_tbl, to_regclass('public.test_cases_current') AS current_view",
    );
    const hasWorkflowExecutions = Boolean(schemaRes.rows[0]?.exec_tbl);
    const hasCurrentView = Boolean(schemaRes.rows[0]?.current_view);

    const stepsStr = JSON.stringify(payload.steps || []);
    const severity = payload.severity || (payload.status === "failed" ? "medium" : null);
    const requestedStatus = payload.status || "pending";
    const initialActual = payload.actualResult || null;
    const initialNotes = payload.notes || null;
    const initialExecutedAt =
      ["pending", "not_run"].includes(requestedStatus)
        ? null
        : payload.executedAt || new Date().toISOString();

    const insertRes = await client.query(
      `INSERT INTO test_cases (
        "testId", module, "pageName", scenario, "preConditions", steps,
        "expectedResult", "actualResult", priority, status, severity, notes,
        "executedAt", "testerId", "projectId"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id`,
      [
        testId,
        payload.module,
        payload.pageName || null,
        payload.scenario,
        payload.preConditions || null,
        stepsStr,
        payload.expectedResult,
        hasWorkflowExecutions ? null : initialActual,
        payload.priority || "medium",
        hasWorkflowExecutions ? "pending" : requestedStatus,
        severity,
        hasWorkflowExecutions ? null : initialNotes,
        hasWorkflowExecutions ? null : initialExecutedAt,
        targetTesterId,
        targetProjectId,
      ],
    );

    const newId = insertRes.rows[0].id;
    const tcRow = (await client.query("SELECT * FROM test_cases WHERE id = $1", [newId])).rows[0];

    if (
      hasWorkflowExecutions &&
      (requestedStatus !== "pending" || initialActual || initialNotes) &&
      ["passed", "failed", "blocked", "skipped", "pending", "not_run"].includes(requestedStatus)
    ) {
      const actorName =
        (await client.query("SELECT name FROM users WHERE id = $1", [actorId])).rows[0]?.name || null;
      await client.query(
        `INSERT INTO test_executions("testCaseId","projectId","testerId","testerName",status,"actualResult",notes,environment,"executedAt",snapshot,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'compatibility')`,
        [
          tcRow.id,
          tcRow.projectId ?? null,
          actorId,
          actorName,
          requestedStatus === "pending" ? "not_run" : requestedStatus,
          initialActual,
          initialNotes,
          null,
          initialExecutedAt,
          JSON.stringify(tcRow),
        ],
      );
    }

    const fromRelation = hasCurrentView ? "test_cases_current" : "test_cases";
    const fullRow = (
      await client.query(
        `SELECT tc.*, u.id AS tester_id, u.name AS tester_name, u.email AS tester_email, p.id AS project_id, p.name AS project_name
         FROM ${fromRelation} tc
         LEFT JOIN test_cases base_tc ON base_tc.id = tc.id
         LEFT JOIN users u ON COALESCE(base_tc."testerId", tc."testerId") = u.id
         LEFT JOIN projects p ON tc."projectId" = p.id
         WHERE tc.id = $1`,
        [newId],
      )
    ).rows[0];

    await client.query("COMMIT");
    began = false;

    const { tester_id, tester_name, tester_email, project_id, project_name, ...base } = fullRow || {
      id: newId,
    };
    let parsedSteps = payload.steps || [];
    if (typeof base.steps === "string") {
      try {
        const tmp = JSON.parse(base.steps);
        if (Array.isArray(tmp)) parsedSteps = tmp;
      } catch {
        parsedSteps = payload.steps || [];
      }
    }

    return {
      ok: true,
      data: {
        ...base,
        steps: parsedSteps,
        testerId: tester_id || targetTesterId,
        userId: tester_id || targetTesterId,
        tester: tester_id ? { id: tester_id, userId: tester_id, name: tester_name, email: tester_email } : null,
        project: project_id ? { id: project_id, name: project_name } : null,
      },
    };
  } catch (dbErr) {
    if (client && began) {
      await client.query("ROLLBACK").catch(() => {});
    }
    console.warn("Direct DB fallback for addNewTestCase failed:", dbErr);
    return null;
  } finally {
    if (client && typeof client.release === "function") {
      client.release();
    }
  }
}

function buildSafeTestCasePayload(
  data: TestCaseFormValues,
  sessionUserId?: string | number,
): Record<string, any> {
  const nowIso = new Date().toISOString();
  const resolvedTesterId = Number(sessionUserId) || Number(data.testerId) || undefined;
  const status = data.status || "pending";
  const safePayload: Record<string, any> = {
    testId: data.testId?.trim() || "TC-0001",
    module: (data.module || "").trim().slice(0, 200).trim(),
    scenario: (data.scenario || "").trim(),
    steps: Array.isArray(data.steps)
      ? data.steps.map((s) => (typeof s === "string" ? s.trim() : String(s))).filter(Boolean)
      : ["Initial Step"],
    expectedResult: (data.expectedResult || "").trim(),
    priority: data.priority || "medium",
    status,
  };

  if (status !== "pending") {
    safePayload.executedAt = nowIso;
  }
  if (data.pageName && String(data.pageName).trim()) {
    safePayload.pageName = String(data.pageName).trim();
  }
  if (data.preConditions && String(data.preConditions).trim()) {
    safePayload.preConditions = String(data.preConditions).trim();
  }
  if (data.actualResult && String(data.actualResult).trim()) {
    safePayload.actualResult = String(data.actualResult).trim();
  }
  if (data.notes && String(data.notes).trim()) {
    safePayload.notes = String(data.notes).trim();
  }
  if (data.severity && ["critical", "high", "medium", "low"].includes(data.severity)) {
    safePayload.severity = data.severity;
  }
  if (data.projectId && Number(data.projectId) > 0) {
    safePayload.projectId = Number(data.projectId);
  }
  if (resolvedTesterId && resolvedTesterId > 0) {
    safePayload.testerId = resolvedTesterId;
    safePayload.userId = resolvedTesterId;
  }

  return safePayload;
}

export async function addNewTestCase(data: TestCaseFormValues) {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token;
    if (!token) {
      return { success: false, message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى" };
    }

    const safePayload = buildSafeTestCasePayload(data, sessionUser?.id);
    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    let response: Response | null = null;
    let requestError: unknown = null;

    if (baseUrl) {
      try {
        response = await postTestCaseWithWakeRetry(baseUrl, token, safePayload);

        // On duplicate testId conflict, resolve a fresh uncached ID and retry up to twice.
        for (let conflictRetry = 0; conflictRetry < 2 && response.status === 409; conflictRetry++) {
          const attemptedNum = parseTestCaseNumber(safePayload.testId);
          const freshNextId = await getNextTestCaseId(data.module, data.projectId);
          const freshNum = parseTestCaseNumber(freshNextId);
          const resolvedNum = freshNum <= attemptedNum ? attemptedNum + 1 : freshNum;
          const nextIdFormatted = formatTestCaseId(resolvedNum, data.status);

          safePayload.testId = nextIdFormatted;
          if (safePayload.status !== "pending") {
            safePayload.executedAt = new Date().toISOString();
          }
          response = await postTestCaseWithWakeRetry(baseUrl, token, safePayload);
        }
      } catch (err) {
        requestError = err;
      }
    }

    let responseData: Partial<AddTestCaseResponse> = {};
    let created = false;

    if (response && response.ok) {
      responseData = await response.json().catch(() => ({}));
      created = true;
    } else if (
      (response && GATEWAY_OUTAGE_STATUSES.has(response.status)) ||
      (!response && !isAbortLikeError(requestError))
    ) {
      const fallbackResult = await addTestCaseDirectDbFallback(safePayload, sessionUser);
      if (fallbackResult && fallbackResult.ok) {
        responseData = fallbackResult.data as Partial<AddTestCaseResponse>;
        created = true;
      } else if (fallbackResult && !fallbackResult.ok) {
        return { success: false, message: fallbackResult.message };
      }
    }

    if (created) {
      updateTag("test-cases");
      updateTag("dashboard-stats");
      updateTag("dashboard");
      updateTag("projects");
      updateTag("users");
      revalidatePath("/test-cases");
      revalidatePath("/projects");
      revalidatePath("/dashboard");
      revalidatePath("/users");

      // Audit Log
      await Promise.resolve(
        recordSystemAuditLog({
          action: "إضافة حالة اختبار جديدة",
          actionCategory: "TEST_CASES",
          description: `إضافة حالة اختبار برقم (${safePayload.testId || "جديد"}) في موديول (${safePayload.module || "العام"}) - الحالة: ${safePayload.status}`,
          endpoint: "/api/test-cases",
          method: "POST",
        }),
      ).catch(() => {});

      return {
        success: true,
        message: "Test case created successfully",
        data: responseData,
      };
    }

    if (response) {
      const errorData: Partial<AddTestCaseResponse> = await response.json().catch(() => ({}));
      return {
        success: false,
        message: extractBackendErrorMessage(
          response.status,
          errorData,
          `حدث خطأ أثناء إضافة حالة الاختبار (${response.status})`,
        ),
      };
    }

    return {
      success: false,
      message: isAbortLikeError(requestError)
        ? "استغرق الخادم وقتاً أطول من المعتاد للاستيقاظ، يرجى إعادة المحاولة الآن"
        : requestError instanceof Error
          ? requestError.message
          : "حدث خطأ غير متوقع في الاتصال بالخادم",
    };
  } catch (err) {
    return {
      success: false,
      message: isAbortLikeError(err)
        ? "استغرق الخادم وقتاً أطول من المعتاد للاستيقاظ، يرجى إعادة المحاولة الآن"
        : err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع في الاتصال بالخادم",
    };
  }
}

export async function getNextTestCaseId(moduleName?: string, projectId?: number): Promise<string> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token;
    if (!token) return "TC-0001";

    const numericProjectId = Number(projectId);
    const trimmedModule = moduleName?.trim() || "";

    // Query PostgreSQL directly first so ID generation stays fast, never truncates
    // past 100 items, and never serves a stale force-cache response.
    try {
      if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
        const res = await pool.query<{ testId: string }>(
          'SELECT "testId" FROM test_cases WHERE "projectId" = $1',
          [numericProjectId],
        );
        if (Array.isArray(res.rows)) {
          return computeNextTestCaseId(res.rows.map((r) => r.testId));
        }
      } else if (trimmedModule !== "") {
        const res = await pool.query<{ testId: string }>(
          'SELECT "testId" FROM test_cases WHERE LOWER(TRIM(module)) = LOWER(TRIM($1))',
          [trimmedModule],
        );
        if (Array.isArray(res.rows)) {
          return computeNextTestCaseId(res.rows.map((r) => r.testId));
        }
      }
    } catch (dbErr) {
      console.warn("getNextTestCaseId DB lookup failed, falling back to API:", dbErr);
    }

    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) return "TC-0001";

    const nextIdUrl = new URL(`${baseUrl}/api/test-cases/next-id`);
    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      nextIdUrl.searchParams.set("projectId", String(numericProjectId));
    } else if (trimmedModule !== "") {
      nextIdUrl.searchParams.set("module", trimmedModule);
    }

    const nextIdSignal = createTimeoutSignal(NEXT_ID_TIMEOUT_MS);
    const nextIdRes = await appFetch(nextIdUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      ...(nextIdSignal ? { signal: nextIdSignal } : {}),
    }).catch(() => null);

    if (nextIdRes?.ok) {
      const nextIdData = await nextIdRes.json().catch(() => null);
      const candidate =
        typeof nextIdData === "string"
          ? nextIdData
          : nextIdData?.nextId ||
            nextIdData?.testId ||
            nextIdData?.data?.nextId ||
            nextIdData?.data?.testId;
      if (typeof candidate === "string" && /^(TC|BUG)-\d+$/i.test(candidate.trim())) {
        return candidate.trim().toUpperCase().replace(/^BUG-/, "TC-");
      }
    }

    const listUrl = new URL(`${baseUrl}/api/test-cases`);
    listUrl.searchParams.set("limit", "1000");
    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      listUrl.searchParams.set("projectId", String(numericProjectId));
    } else if (trimmedModule !== "") {
      listUrl.searchParams.set("module", trimmedModule);
    }

    const listSignal = createTimeoutSignal(NEXT_ID_TIMEOUT_MS);
    const response = await appFetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      ...(listSignal ? { signal: listSignal } : {}),
    });

    if (!response.ok) {
      return "TC-0001";
    }

    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.data) ? data.data : [];
    return computeNextTestCaseId(items.map((item: { testId?: string }) => item?.testId));
  } catch (err) {
    console.error("Error in getNextTestCaseId:", err);
    return "TC-0001";
  }
}
