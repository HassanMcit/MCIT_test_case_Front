export const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);
export const DEFAULT_WRITE_TIMEOUTS_MS = [30000, 30000, 25000] as const;

export function sanitizeBackendOrigin(raw?: string | null): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\/+$/, "");
}

export function extractBackendErrorMessage(
  status: number,
  data: unknown,
  fallbackMessage: string,
): string {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const rawMessage = obj?.message;
  if (Array.isArray(rawMessage) && rawMessage.length > 0) {
    return rawMessage.map(String).join(" - ");
  }
  if (typeof rawMessage === "string" && rawMessage.trim() !== "") {
    return rawMessage;
  }
  if (status === 401) {
    return "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى";
  }
  if (status === 403) {
    return "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  }
  if (GATEWAY_RETRY_STATUSES.has(status) || status >= 500) {
    return `الخادم قيد الاستيقاظ أو مزدحم حالياً (${status})، يرجى المحاولة مرة أخرى بعد ثوانٍ`;
  }
  return fallbackMessage;
}

export function isAbortLikeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

const EN_ACTION_ERROR_EXACT: Record<string, string> = {
  "فشل تحديث حالة الاختبار": "Failed to update test case",
  "فشل حذف حالة الاختبار": "Failed to delete test case",
  "فشلت إضافة حالة الاختبار": "Failed to add test case",
  "حالة الاختبار غير موجودة": "Test case not found",
  "المشروع المحدد غير موجود": "Selected project was not found",
  "المشروع المرتبط غير موجود": "Associated project was not found",
  "يرجى اختيار مشروع مسند إليك": "Please select a project assigned to you",
  "لا يمكنك إسناد حالة الاختبار لمستخدم آخر": "You cannot assign a test case to another user",
  "لا يمكن نقل حالة اختبار لها سجل تنفيذ أو دورات اختبار":
    "Cannot move a test case that already has execution or cycle history",
  "اسم الوحدة البرمجية يجب أن يتكون من 2 إلى 200 حرف مقبولة":
    "Application / Module must be 2 to 200 valid characters",
  "سيناريو الاختبار يجب ألا يقل عن 5 أحرف": "Scenario must be at least 5 characters",
  "يجب إدخال خطوة اختبار واحدة على الأقل": "At least one test step is required",
  "النتيجة المتوقعة مطلوبة": "Expected Result is required",
  "يجب أن يطابق معرّف الاختبار النمط TC-XXXX أو BUG-XXXX (مثل TC-8492 أو BUG-8492)":
    "Test ID must match TC-XXXX or BUG-XXXX format",
  "حدث خطأ غير متوقع أثناء التحديث": "An unexpected error occurred while updating",
  "حدث خطأ غير متوقع أثناء الحذف": "An unexpected error occurred while deleting",
  "حدث خطأ غير متوقع في الاتصال بالخادم": "An unexpected server connection error occurred",
};

export function formatTestCaseActionError(
  error: unknown,
  isRTL: boolean,
  arFallback: string,
  enFallback: string,
): string {
  const rawMessage = error instanceof Error ? error.message.trim() : "";
  if (!rawMessage) {
    return isRTL ? arFallback : enFallback;
  }
  if (!isRTL) {
    if (EN_ACTION_ERROR_EXACT[rawMessage]) {
      return EN_ACTION_ERROR_EXACT[rawMessage];
    }
    if (
      rawMessage === "يرجى تسجيل الدخول أولاً" ||
      rawMessage.startsWith("انتهت صلاحية الجلسة")
    ) {
      return "Session expired, please sign in again";
    }
    if (rawMessage.startsWith("ليس لديك صلاحية")) {
      return "You do not have permission to perform this action";
    }
    if (
      rawMessage.startsWith("الخادم قيد الاستيقاظ") ||
      rawMessage.startsWith("الخادم في حالة استيقاظ") ||
      rawMessage.startsWith("استغرق الخادم وقتاً") ||
      rawMessage.startsWith("تعذر الاتصال بالخادم") ||
      rawMessage.startsWith("فشل الاتصال بالخادم")
    ) {
      return "Server is waking up or temporarily busy, please try again in a few seconds";
    }
    if (rawMessage.startsWith("حدث خطأ أثناء إضافة حالة الاختبار")) {
      return "Failed to add test case";
    }
  }
  return rawMessage;
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

async function warmBackendOrigin(origin: string): Promise<void> {
  if (!origin || typeof fetch !== "function") return;
  try {
    const signal = createTimeoutSignal(6000);
    await fetch(`${origin}/api/docs-json`, {
      method: "GET",
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch {
    // Best-effort wake ping only
  }
}

export interface BackendWakeRetryOptions {
  maxAttempts?: number;
  timeoutsMs?: readonly number[];
  retryOnTimeout?: boolean;
  retryStatuses?: ReadonlySet<number>;
  baseUrl?: string;
}

export async function fetchWithWakeRetry(
  requester: (input: string, init?: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit = {},
  options: BackendWakeRetryOptions = {},
): Promise<Response> {
  const timeouts = options.timeoutsMs?.length
    ? options.timeoutsMs
    : DEFAULT_WRITE_TIMEOUTS_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? timeouts.length);
  const retryStatuses = options.retryStatuses ?? GATEWAY_RETRY_STATUSES;
  const origin =
    sanitizeBackendOrigin(options.baseUrl) ||
    (() => {
      try {
        return new URL(url).origin;
      } catch {
        return "";
      }
    })();

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const timeoutMs = timeouts[Math.min(attempt - 1, timeouts.length - 1)];
    const signal = init.signal ?? createTimeoutSignal(timeoutMs);

    try {
      const response = await requester(url, {
        ...init,
        cache: "no-store",
        ...(signal ? { signal } : {}),
      });

      if (retryStatuses.has(response.status) && attempt < maxAttempts) {
        await Promise.all([sleepMs(attempt === 1 ? 1800 : 2500), warmBackendOrigin(origin)]);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      const canRetryError = options.retryOnTimeout ? true : !isAbortLikeError(error);
      if (!canRetryError || attempt >= maxAttempts) {
        throw error;
      }
      await Promise.all([sleepMs(attempt === 1 ? 1800 : 2500), warmBackendOrigin(origin)]);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("فشل الاتصال بالخادم أثناء تنفيذ العملية");
}
