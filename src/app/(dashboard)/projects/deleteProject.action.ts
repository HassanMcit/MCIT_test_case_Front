"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  isAbortLikeError,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

export async function deleteProject(id: number) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "يرجى تسجيل الدخول أولاً" };
    }

    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) {
      return { success: false, message: "تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى" };
    }

    const response = await fetchWithWakeRetry(
      appFetch,
      `${baseUrl}/api/projects/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: extractBackendErrorMessage(response.status, result, "فشل حذف المشروع"),
      };
    }

    updateTag("projects");
    updateTag("dashboard-stats");
    updateTag("dashboard");
    updateTag("users");
    updateTag("test-cases");
    revalidatePath("/projects");
    revalidatePath("/assign-projects");
    revalidatePath("/add");
    revalidatePath("/test-cases");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    await recordSystemAuditLog({
      action: "حذف مشروع",
      actionCategory: "PROJECTS",
      description: `حذف المشروع نهائياً #${id}`,
      endpoint: `/api/projects/${id}`,
      method: "DELETE",
    }).catch(() => {});

    return { success: true, message: result?.message || "تم حذف المشروع بنجاح" };
  } catch (err: any) {
    return {
      success: false,
      message: isAbortLikeError(err)
        ? "استغرق الخادم وقتاً أطول من المعتاد أثناء الاستيقاظ، يرجى المحاولة مرة أخرى"
        : err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
