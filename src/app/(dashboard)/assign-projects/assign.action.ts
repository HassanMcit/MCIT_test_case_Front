"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { getAllUsers } from "../users/user.action";
import { getProjects } from "../projects/getProjects.action";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  isAbortLikeError,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

export async function fetchAssignData() {
  try {
    const token = await getUserToken();
    if (!token) {
      throw new Error("Unauthorized");
    }

    // Fetch users and projects in parallel (with force-cache + instant PostgreSQL cold-start fallback)
    const [users, projects] = await Promise.all([
      getAllUsers(),
      getProjects(),
    ]);

    return { success: true, users: users as any[], projects: projects as any[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignProjectToUser(userId: number, projectId: number) {
  try {
    const token = await getUserToken();
    if (!token) return { success: false, error: "يرجى تسجيل الدخول أولاً" };
    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) return { success: false, error: "تعذر الاتصال بالخادم" };

    const res = await fetchWithWakeRetry(
      appFetch,
      `${baseUrl}/api/users/${userId}/assign-project`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
        cache: "no-store",
      },
      {
        maxAttempts: 3,
        timeoutsMs: [25000, 25000, 20000],
        retryOnTimeout: false,
        retryStatuses: new Set([502, 503]),
        baseUrl,
      },
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: extractBackendErrorMessage(res.status, data, "Failed to assign project"),
      };
    }

    updateTag("projects");
    updateTag("users");
    updateTag("dashboard-stats");
    updateTag("dashboard");
    updateTag("test-cases");
    updateTag("notifications");
    revalidatePath("/projects");
    revalidatePath("/assign-projects");
    revalidatePath("/add");
    revalidatePath("/test-cases");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    await recordSystemAuditLog({
      action: "إسناد مشروع لمستخدم",
      actionCategory: "PROJECTS",
      description: `إسناد المستخدم #${userId} إلى المشروع #${projectId}`,
      endpoint: `/api/users/${userId}/assign-project`,
      method: "POST",
    }).catch(() => {});

    return { success: true, message: data.message };
  } catch (error: any) {
    return {
      success: false,
      error: isAbortLikeError(error)
        ? "استغرق الخادم وقتاً أطول من المعتاد أثناء الاستيقاظ، يرجى المحاولة مرة أخرى"
        : "Network error",
    };
  }
}

export async function unassignProjectFromUser(userId: number, projectId: number) {
  try {
    const token = await getUserToken();
    if (!token) return { success: false, error: "يرجى تسجيل الدخول أولاً" };
    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) return { success: false, error: "تعذر الاتصال بالخادم" };

    const res = await fetchWithWakeRetry(
      appFetch,
      `${baseUrl}/api/users/${userId}/assign-project/${projectId}`,
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
        error: extractBackendErrorMessage(res.status, data, "Failed to unassign project"),
      };
    }

    updateTag("projects");
    updateTag("users");
    updateTag("dashboard-stats");
    updateTag("dashboard");
    updateTag("test-cases");
    revalidatePath("/projects");
    revalidatePath("/assign-projects");
    revalidatePath("/add");
    revalidatePath("/test-cases");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    await recordSystemAuditLog({
      action: "إلغاء إسناد مشروع",
      actionCategory: "PROJECTS",
      description: `إلغاء إسناد المشروع #${projectId} من المستخدم #${userId}`,
      endpoint: `/api/users/${userId}/assign-project/${projectId}`,
      method: "DELETE",
    }).catch(() => {});

    return { success: true, message: data.message };
  } catch (error: any) {
    return {
      success: false,
      error: isAbortLikeError(error)
        ? "استغرق الخادم وقتاً أطول من المعتاد أثناء الاستيقاظ، يرجى المحاولة مرة أخرى"
        : "Network error",
    };
  }
}
