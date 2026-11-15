"use server";
import { appFetch } from "@/lib/app-fetch";
import { unstable_rethrow } from "next/navigation";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import type { TestCaseItem, TestCaseListResponse, TestCaseQueryParams } from "./test-cases.interface";
import { recordSystemAuditLog } from "@/lib/audit";
import { queryTestCasesFromDb, raceBackendFetch } from "@/lib/fast-read";
import { pool } from "@/lib/db";
import {
  GATEWAY_RETRY_STATUSES,
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  isAbortLikeError,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

const TEST_ID_PATTERN = /^(TC|BUG)-\d{4,}$/;
const MODULE_PATTERN = /^[\p{L}\p{N}\s\-_.,()&/:'"+–—]{2,200}$/u;

type FallbackSessionUser = {
  id?: string | number;
  role?: string;
} | null;

type DirectUpdateFallbackResult =
  | { ok: true; data: TestCaseItem }
  | { ok: false; message: string }
  | null;

function normalizeExecText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseStepsColumn(rawSteps: unknown): string[] {
  if (Array.isArray(rawSteps)) {
    return rawSteps.map((s) => String(s));
  }
  if (typeof rawSteps === "string" && rawSteps.trim() !== "") {
    try {
      const parsed = JSON.parse(rawSteps);
      return Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function updateTestCaseDirectDbFallback(
  id: number,
  payload: Record<string, any>,
  sessionUser: FallbackSessionUser,
): Promise<DirectUpdateFallbackResult> {
  const actorId = Number(sessionUser?.id);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return null;
  }

  const dbPool = pool as any;
  if (!dbPool || typeof dbPool.connect !== "function") {
    return null;
  }

  if (payload.testId !== undefined && !TEST_ID_PATTERN.test(String(payload.testId))) {
    return {
      ok: false,
      message: "يجب أن يطابق معرّف الاختبار النمط TC-XXXX أو BUG-XXXX (مثل TC-8492 أو BUG-8492)",
    };
  }
  if (payload.module !== undefined && !MODULE_PATTERN.test(String(payload.module))) {
    return {
      ok: false,
      message: "اسم الوحدة البرمجية يجب أن يتكون من 2 إلى 200 حرف مقبولة",
    };
  }
  if (payload.scenario !== undefined && String(payload.scenario).trim().length < 5) {
    return {
      ok: false,
      message: "سيناريو الاختبار يجب ألا يقل عن 5 أحرف",
    };
  }

  let client: any;
  let began = false;
  try {
    client = await dbPool.connect();
    await client.query("BEGIN");
    began = true;

    const origRes = await client.query("SELECT * FROM test_cases WHERE id = $1 FOR UPDATE", [id]);
    const original = origRes.rows[0];
    if (!original) {
      await client.query("ROLLBACK");
      return { ok: false, message: "حالة الاختبار غير موجودة" };
    }

    const isAdmin = sessionUser?.role === "admin";
    if (original.projectId) {
      const projRes = await client.query("SELECT id FROM projects WHERE id = $1", [original.projectId]);
      if (!projRes.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, message: "المشروع المرتبط غير موجود" };
      }
      if (!isAdmin) {
        const memRes = await client.query(
          'SELECT 1 FROM project_assignments WHERE "projectId" = $1 AND "userId" = $2',
          [original.projectId, actorId],
        );
        if (!memRes.rowCount && memRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return { ok: false, message: "ليس لديك صلاحية لتعديل هذه الحالة" };
        }
      }
    } else if (!isAdmin && Number(original.testerId) !== actorId) {
      await client.query("ROLLBACK");
      return { ok: false, message: "ليس لديك صلاحية لتعديل هذه الحالة" };
    }

    const schemaRes = await client.query(
      "SELECT to_regclass('public.test_executions') AS exec_tbl, to_regclass('public.test_cycle_items') AS cycle_tbl, to_regclass('public.test_cases_current') AS current_view",
    );
    const hasWorkflowExecutions = Boolean(schemaRes.rows[0]?.exec_tbl);
    const hasCycleItems = Boolean(schemaRes.rows[0]?.cycle_tbl);
    const hasCurrentView = Boolean(schemaRes.rows[0]?.current_view);

    if (
      payload.projectId !== undefined &&
      Number(payload.projectId) !== Number(original.projectId)
    ) {
      const targetProjId = Number(payload.projectId);
      const targetProj = await client.query("SELECT id FROM projects WHERE id = $1", [targetProjId]);
      if (!targetProj.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, message: "المشروع المحدد غير موجود" };
      }
      if (!isAdmin) {
        const memRes = await client.query(
          'SELECT 1 FROM project_assignments WHERE "projectId" = $1 AND "userId" = $2',
          [targetProjId, actorId],
        );
        if (!memRes.rowCount && memRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return { ok: false, message: "ليس لديك صلاحية للنقل إلى هذا المشروع" };
        }
      }
      if (hasWorkflowExecutions && hasCycleItems) {
        const depRes = await client.query(
          'SELECT 1 FROM test_executions WHERE "testCaseId" = $1 UNION ALL SELECT 1 FROM test_cycle_items WHERE "testCaseId" = $1 LIMIT 1',
          [id],
        );
        if (depRes.rowCount || depRes.rows.length > 0) {
          await client.query("ROLLBACK");
          return {
            ok: false,
            message: "لا يمكن نقل حالة اختبار لها سجل تنفيذ أو دورات اختبار",
          };
        }
      }
    }

    let pidx = 1;
    const fields: string[] = [];
    const values: any[] = [];

    fields.push(`"updatedById" = $${pidx++}`);
    values.push(actorId);

    const allowedDefinitionKeys = [
      "testId",
      "module",
      "pageName",
      "scenario",
      "preConditions",
      "expectedResult",
      "priority",
      "severity",
      "projectId",
    ];
    for (const key of allowedDefinitionKeys) {
      if (payload[key] !== undefined) {
        fields.push(`"${key}" = $${pidx++}`);
        values.push(payload[key]);
      }
    }

    if (payload.steps !== undefined) {
      fields.push(`steps = $${pidx++}`);
      values.push(JSON.stringify(payload.steps));
    }

    if (!hasWorkflowExecutions) {
      for (const legacyKey of ["status", "actualResult", "notes"]) {
        if (payload[legacyKey] !== undefined) {
          fields.push(`"${legacyKey}" = $${pidx++}`);
          values.push(payload[legacyKey]);
        }
      }
      if (
        payload.status !== undefined &&
        ["passed", "failed", "blocked", "skipped"].includes(payload.status)
      ) {
        fields.push(`"executedAt" = NOW()`);
      }
    }

    fields.push(`"updatedAt" = NOW()`);
    values.push(id);
    await client.query(`UPDATE test_cases SET ${fields.join(", ")} WHERE id = $${pidx}`, values);

    const refreshedCase = (await client.query("SELECT * FROM test_cases WHERE id = $1", [id])).rows[0];

    if (
      hasWorkflowExecutions &&
      (payload.status !== undefined ||
        payload.actualResult !== undefined ||
        payload.notes !== undefined)
    ) {
      const latestExec = (
        await client.query(
          'SELECT * FROM test_executions WHERE "testCaseId" = $1 ORDER BY id DESC LIMIT 1',
          [id],
        )
      ).rows[0];
      const rawCurrentStatus = latestExec ? latestExec.status : refreshedCase?.status || "pending";
      const currentStatus = rawCurrentStatus === "not_run" ? "pending" : rawCurrentStatus;
      const currentActual = latestExec ? latestExec.actualResult : refreshedCase?.actualResult;
      const currentNotes = latestExec ? latestExec.notes : refreshedCase?.notes;
      const nextStatus = payload.status !== undefined ? payload.status : currentStatus;
      const nextActual =
        payload.actualResult !== undefined ? payload.actualResult : currentActual;
      const nextNotes = payload.notes !== undefined ? payload.notes : currentNotes;
      const executionChanged =
        nextStatus !== currentStatus ||
        normalizeExecText(nextActual) !== normalizeExecText(currentActual) ||
        normalizeExecText(nextNotes) !== normalizeExecText(currentNotes);

      if (
        executionChanged &&
        ["passed", "failed", "blocked", "skipped", "pending", "not_run"].includes(nextStatus)
      ) {
        const actorRes = await client.query("SELECT name FROM users WHERE id = $1", [actorId]);
        const actorName = actorRes.rows[0]?.name || null;
        await client.query(
          `INSERT INTO test_executions("testCaseId","projectId","testerId","testerName",status,"actualResult",notes,environment,"executedAt",snapshot,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'compatibility')`,
          [
            refreshedCase.id,
            refreshedCase.projectId ?? null,
            actorId,
            actorName,
            nextStatus === "pending" ? "not_run" : nextStatus,
            nextActual || null,
            nextNotes || null,
            null,
            ["pending", "not_run"].includes(nextStatus) ? null : new Date().toISOString(),
            JSON.stringify(refreshedCase),
          ],
        );
      }
    }

    const fromRelation = hasCurrentView ? "test_cases_current" : "test_cases";
    const rowRes = await client.query(
      `SELECT tc.*, u_up.id AS updated_by_id, u_up.name AS updated_by_name, u_up.email AS updated_by_email, p.id AS project_id, p.name AS project_name
       FROM ${fromRelation} tc
       LEFT JOIN users u_up ON tc."updatedById" = u_up.id
       LEFT JOIN projects p ON tc."projectId" = p.id
       WHERE tc.id = $1`,
      [id],
    );
    await client.query("COMMIT");
    began = false;

    const row = rowRes.rows[0];
    if (!row) {
      return null;
    }

    const {
      updated_by_id,
      updated_by_name,
      updated_by_email,
      project_id,
      project_name,
      ...base
    } = row;
    delete base.tester;
    delete base.testerId;
    delete base.userId;
    delete base.createdAt;

    return {
      ok: true,
      data: {
        ...base,
        steps: parseStepsColumn(base.steps),
        updatedById: updated_by_id || null,
        updatedBy: updated_by_id
          ? {
              id: updated_by_id,
              userId: updated_by_id,
              name: updated_by_name,
              email: updated_by_email,
            }
          : null,
        project: project_id ? { id: project_id, name: project_name } : null,
      } as TestCaseItem,
    };
  } catch (dbFallbackErr) {
    if (client && began) {
      await client.query("ROLLBACK").catch(() => {});
    }
    console.warn("Direct DB fallback for updateTestCase failed:", dbFallbackErr);
    return null;
  } finally {
    if (client && typeof client.release === "function") {
      client.release();
    }
  }
}

export async function getTestCases(params?: TestCaseQueryParams): Promise<TestCaseListResponse> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) {
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
      };
    }

    const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`);

    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.status && params.status !== "all") url.searchParams.set("status", params.status);
    if (params?.priority && params.priority !== "all") url.searchParams.set("priority", params.priority);
    if (params?.module && params.module !== "all") url.searchParams.set("module", params.module);
    if (params?.projectId && Number(params.projectId) > 0) {
      url.searchParams.set("projectId", String(params.projectId));
    }
    if (params?.search && params.search.trim() !== "") {
      url.searchParams.set("search", params.search.trim());
    }

    // Partition cache URL by userId & userRole for Next.js Data Cache
    if (sessionUser?.id) {
      url.searchParams.set("userId", String(sessionUser.id));
      url.searchParams.set("userRole", sessionUser.role);
    }
    url.searchParams.set("cv", "20261019_v3");

    const fetchPromise = appFetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["test-cases", "dashboard"] },
    });

    const res = await raceBackendFetch(fetchPromise, 2000);

    if (res && res.ok) {
      const json = await res.json();
      return {
        data: Array.isArray(json?.data) ? json.data : [],
        meta: json?.meta || {
          total: json?.data?.length || 0,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
    }

    // Render Cold-Start Fallback: read directly from PostgreSQL pool (~80ms)
    return await queryTestCasesFromDb(params, sessionUser);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in getTestCases:", error);
    return {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    };
  }
}

export async function deleteTestCase(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getUserToken();
    if (!token) {
      return {
        success: false,
        message: "يرجى تسجيل الدخول أولاً",
      };
    }

    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) {
      return {
        success: false,
        message: "تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى",
      };
    }

    const res = await fetchWithWakeRetry(
      appFetch,
      `${baseUrl}/api/test-cases/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
      {
        maxAttempts: 3,
        timeoutsMs: [20000, 25000, 20000],
        retryOnTimeout: true,
        baseUrl,
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        message: extractBackendErrorMessage(res.status, data, "فشل حذف حالة الاختبار"),
      };
    }

    updateTag("test-cases");
    updateTag("dashboard-stats");
    updateTag("dashboard");
    updateTag("projects");
    updateTag("users");
    revalidatePath("/test-cases");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    await Promise.resolve(
      recordSystemAuditLog({
        action: "حذف حالة اختبار",
        actionCategory: "TEST_CASES",
        description: `حذف حالة الاختبار نهائياً #${id}`,
        endpoint: `/api/test-cases/${id}`,
        method: "DELETE",
      }),
    ).catch(() => {});

    return {
      success: true,
      message: "تم حذف حالة الاختبار بنجاح",
    };
  } catch (error) {
    return {
      success: false,
      message: isAbortLikeError(error)
        ? "استغرق الخادم وقتاً أطول من المعتاد أثناء الاستيقاظ، يرجى المحاولة مرة أخرى"
        : error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء الحذف",
    };
  }
}

export async function updateTestCase(
  id: number,
  data: Partial<TestCaseItem>
): Promise<{ success: boolean; message: string; data?: TestCaseItem }> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) {
      return {
        success: false,
        message: "يرجى تسجيل الدخول أولاً",
      };
    }

    const payload: Record<string, any> = {};
    if (data.testId !== undefined && data.testId !== null) {
      const trimmedTestId = String(data.testId).trim();
      if (trimmedTestId) {
        payload.testId = trimmedTestId;
      }
    }
    if (data.module !== undefined && data.module !== null) {
      const trimmedModule = String(data.module).trim();
      if (trimmedModule) {
        payload.module = trimmedModule.slice(0, 200).trim();
      }
    }
    if (data.pageName !== undefined) {
      payload.pageName = data.pageName === null ? "" : String(data.pageName).trim();
    }
    if (data.scenario !== undefined && data.scenario !== null) {
      const trimmedScenario = String(data.scenario).trim();
      if (trimmedScenario) {
        payload.scenario = trimmedScenario;
      }
    }
    if (data.preConditions !== undefined) {
      payload.preConditions = data.preConditions === null ? "" : String(data.preConditions).trim();
    }
    if (data.steps !== undefined && data.steps !== null) {
      payload.steps = Array.isArray(data.steps)
        ? data.steps
            .map((s) => (typeof s === "string" ? s.trim() : String(s)))
            .filter(Boolean)
        : [];
    }
    if (data.expectedResult !== undefined && data.expectedResult !== null) {
      payload.expectedResult = String(data.expectedResult).trim();
    }
    if (data.actualResult !== undefined && data.actualResult !== null) {
      payload.actualResult = String(data.actualResult).trim();
    }
    if (data.priority !== undefined && data.priority !== null && ["critical", "high", "medium", "low"].includes(data.priority)) {
      payload.priority = data.priority;
    }
    if (
      data.status !== undefined &&
      data.status !== null &&
      ["passed", "failed", "pending", "blocked", "skipped"].includes(data.status)
    ) {
      payload.status = data.status;
    }
    if (
      data.severity !== undefined &&
      data.severity !== null &&
      ["critical", "high", "medium", "low"].includes(data.severity)
    ) {
      payload.severity = data.severity;
    }
    if (data.notes !== undefined && data.notes !== null) {
      payload.notes = String(data.notes).trim();
    }
    if (data.projectId !== undefined && data.projectId !== null && Number(data.projectId) > 0) {
      payload.projectId = Number(data.projectId);
    }

    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    let res: Response | null = null;
    let networkError: unknown = null;

    if (baseUrl) {
      try {
        res = await fetchWithWakeRetry(
          appFetch,
          `${baseUrl}/api/test-cases/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
          },
          {
            maxAttempts: 2,
            timeoutsMs: [15000, 18000],
            retryOnTimeout: true,
            baseUrl,
          },
        );
      } catch (err) {
        networkError = err;
      }
    }

    let responseData: any = null;
    let usedDirectDbFallback = false;

    if (res && res.ok) {
      responseData = await res.json().catch(() => ({}));
    } else if (!res || GATEWAY_RETRY_STATUSES.has(res.status)) {
      const fallbackResult = await updateTestCaseDirectDbFallback(id, payload, sessionUser);
      if (fallbackResult && fallbackResult.ok) {
        responseData = fallbackResult.data;
        usedDirectDbFallback = true;
      } else if (fallbackResult && !fallbackResult.ok) {
        return {
          success: false,
          message: fallbackResult.message,
        };
      } else if (res) {
        const errorBody = await res.json().catch(() => ({}));
        return {
          success: false,
          message: extractBackendErrorMessage(res.status, errorBody, "فشل تحديث حالة الاختبار"),
        };
      } else {
        return {
          success: false,
          message: isAbortLikeError(networkError)
            ? "استغرق الخادم وقتاً أطول من المعتاد أثناء الاستيقاظ، يرجى المحاولة مرة أخرى"
            : "تعذر الاتصال بالخادم أثناء تحديث حالة الاختبار، يرجى المحاولة مرة أخرى",
        };
      }
    } else {
      const errorBody = await res.json().catch(() => ({}));
      return {
        success: false,
        message: extractBackendErrorMessage(res.status, errorBody, "فشل تحديث حالة الاختبار"),
      };
    }

    // Persist updater ID directly in DB to guarantee audit tracking
    if (!usedDirectDbFallback && sessionUser?.id) {
      try {
        await pool.query('UPDATE test_cases SET "updatedById" = $1, "updatedAt" = NOW() WHERE id = $2', [Number(sessionUser.id), id]);
      } catch (dbErr) {
        console.warn("Could not update updatedById in DB:", dbErr);
      }
    }

    // Safety: ensure response data never overwrites the original creator or creation time with the updater
    if (responseData && typeof responseData === "object") {
      delete responseData.tester;
      delete responseData.testerId;
      delete responseData.userId;
      delete responseData.createdAt;
    }

    updateTag("test-cases");
    updateTag("dashboard-stats");
    updateTag("dashboard");
    updateTag("projects");
    updateTag("users");
    revalidatePath("/test-cases");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    await Promise.resolve(
      recordSystemAuditLog({
        action: "تعديل حالة اختبار",
        actionCategory: "TEST_CASES",
        description: `تعديل حالة الاختبار #${id} - الموديول: ${payload.module || "بدون تغيير"} - الحالة: ${payload.status || "بدون تغيير"}`,
        endpoint: `/api/test-cases/${id}`,
        method: "PATCH",
      }),
    ).catch(() => {});

    return {
      success: true,
      message: "تم تحديث حالة الاختبار بنجاح",
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء التحديث",
    };
  }
}

export async function getTestCaseById(id: number): Promise<TestCaseItem | null> {
  try {
    const token = await getUserToken();
    if (!token) return null;

    const res = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["test-cases"] },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in getTestCaseById:", error);
    return null;
  }
}

export async function getFailedTestCases(projectId?: number): Promise<TestCaseItem[]> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) return [];

    const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`);
    url.searchParams.set("status", "failed");
    url.searchParams.set("limit", "100");
    if (projectId && Number(projectId) > 0) {
      url.searchParams.set("projectId", String(projectId));
    }
    if (sessionUser?.id) {
      url.searchParams.set("userId", String(sessionUser.id));
      url.searchParams.set("userRole", sessionUser.role);
    }

    const res = await appFetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["test-cases"] },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in getFailedTestCases:", error);
    return [];
  }
}
