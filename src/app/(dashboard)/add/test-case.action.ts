"use server";
import { appFetch } from "@/lib/app-fetch";
import { pool } from "@/lib/db";
import { getCurrentUserSession } from "@/app/myUtil";
import type { AddTestCaseResponse, TestCaseFormValues } from "./test-case-interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);
const isNetlifyHost = typeof process !== "undefined" && process.env?.NETLIFY === "true";
const TEST_CASE_WRITE_TIMEOUT_MS = isNetlifyHost ? 22000 : 45000;
const NEXT_ID_TIMEOUT_MS = isNetlifyHost ? 12000 : 15000;

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

async function sleepMs(ms: number): Promise<void> {
  if (typeof setTimeout === "function") {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function createTimeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

async function postTestCaseWithWakeRetry(
  token: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`;
  const maxAttempts = isNetlifyHost ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const timeoutSignal = createTimeoutSignal(TEST_CASE_WRITE_TIMEOUT_MS);
      const response = await appFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        ...(timeoutSignal ? { signal: timeoutSignal } : {}),
      });

      if (GATEWAY_RETRY_STATUSES.has(response.status) && attempt < maxAttempts) {
        await sleepMs(1500);
        continue;
      }
      return response;
    } catch (error) {
      const isAbort =
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError");
      if (isAbort || attempt >= maxAttempts) {
        throw error;
      }
      await sleepMs(1500);
    }
  }

  throw new Error("فشل الاتصال بالخادم أثناء حفظ حالة الاختبار");
}

function buildSafeTestCasePayload(
  data: TestCaseFormValues,
  sessionUserId?: string | number,
): Record<string, any> {
  const nowIso = new Date().toISOString();
  const resolvedTesterId = Number(sessionUserId) || Number(data.testerId) || undefined;
  const safePayload: Record<string, any> = {
    testId: data.testId?.trim() || "TC-0001",
    module: (data.module || "").slice(0, 50).trim(),
    scenario: (data.scenario || "").trim(),
    steps: Array.isArray(data.steps)
      ? data.steps.map((s) => (typeof s === "string" ? s.trim() : String(s))).filter(Boolean)
      : ["Initial Step"],
    expectedResult: (data.expectedResult || "").trim(),
    priority: data.priority || "medium",
    status: data.status || "pending",
    executedAt: nowIso,
  };

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
    let response = await postTestCaseWithWakeRetry(token, safePayload);

    // On duplicate testId conflict, resolve a fresh uncached ID and retry up to twice.
    for (let conflictRetry = 0; conflictRetry < 2 && response.status === 409; conflictRetry++) {
      const attemptedNum = parseTestCaseNumber(safePayload.testId);
      const freshNextId = await getNextTestCaseId(data.module, data.projectId);
      const freshNum = parseTestCaseNumber(freshNextId);
      const resolvedNum = freshNum <= attemptedNum ? attemptedNum + 1 : freshNum;
      const nextIdFormatted = formatTestCaseId(resolvedNum, data.status);

      safePayload.testId = nextIdFormatted;
      safePayload.executedAt = new Date().toISOString();
      response = await postTestCaseWithWakeRetry(token, safePayload);
    }

    const responseData: Partial<AddTestCaseResponse> = await response.json().catch(() => ({}));

    if (response.ok) {
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
      recordSystemAuditLog({
        action: "إضافة حالة اختبار جديدة",
        actionCategory: "TEST_CASES",
        description: `إضافة حالة اختبار برقم (${safePayload.testId || "جديد"}) في موديول (${safePayload.module || "العام"}) - الحالة: ${safePayload.status}`,
        endpoint: "/api/test-cases",
        method: "POST",
      }).catch(() => {});

      return {
        success: true,
        message: "Test case created successfully",
        data: responseData,
      };
    }

    const errorMsg = Array.isArray(responseData.message)
      ? responseData.message.join(" - ")
      : responseData.message ||
        (GATEWAY_RETRY_STATUSES.has(response.status) || response.status >= 500
          ? `الخادم في حالة استيقاظ أو مزدحم حالياً (${response.status})، يرجى المحاولة مرة أخرى بعد ثوانٍ`
          : `حدث خطأ أثناء إضافة حالة الاختبار (${response.status})`);

    return { success: false, message: errorMsg };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError");
    return {
      success: false,
      message: isTimeout
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

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
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
