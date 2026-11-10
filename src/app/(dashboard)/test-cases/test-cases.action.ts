"use server";
import { appFetch } from "@/lib/app-fetch";
import { unstable_rethrow } from "next/navigation";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import type { TestCaseItem, TestCaseListResponse, TestCaseQueryParams } from "./test-cases.interface";
import { recordSystemAuditLog } from "@/lib/audit";
import { queryTestCasesFromDb, raceBackendFetch } from "@/lib/fast-read";

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
      throw new Error("يرجى تسجيل الدخول أولاً");
    }

    const res = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        message: Array.isArray(data.message)
          ? data.message.join(" - ")
          : data.message || "فشل حذف حالة الاختبار",
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

    recordSystemAuditLog({
      action: "حذف حالة اختبار",
      actionCategory: "TEST_CASES",
      description: `حذف حالة الاختبار نهائياً #${id}`,
      endpoint: `/api/test-cases/${id}`,
      method: "DELETE",
    }).catch(() => {});

    return {
      success: true,
      message: "تم حذف حالة الاختبار بنجاح",
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء الحذف");
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
    if (data.module !== undefined && data.module !== null) {
      payload.module = String(data.module).slice(0, 200).trim();
    }
    if (data.pageName !== undefined) {
      payload.pageName = data.pageName ? String(data.pageName).trim() : null;
    }
    if (data.scenario !== undefined && data.scenario !== null) {
      payload.scenario = String(data.scenario).trim();
    }
    if (data.preConditions !== undefined) {
      payload.preConditions = data.preConditions ? String(data.preConditions).trim() : null;
    }
    if (data.steps !== undefined) {
      payload.steps = Array.isArray(data.steps)
        ? data.steps
            .map((s) => (typeof s === "string" ? s.trim() : String(s)))
            .filter(Boolean)
        : [];
    }
    if (data.expectedResult !== undefined && data.expectedResult !== null) {
      payload.expectedResult = String(data.expectedResult).trim();
    }
    if (data.actualResult !== undefined) {
      payload.actualResult = data.actualResult ? String(data.actualResult).trim() : null;
    }
    if (data.priority !== undefined && ["critical", "high", "medium", "low"].includes(data.priority)) {
      payload.priority = data.priority;
    }
    if (
      data.status !== undefined &&
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
    if (data.notes !== undefined) {
      payload.notes = data.notes ? String(data.notes).trim() : null;
    }
    if (data.projectId !== undefined && data.projectId !== null && Number(data.projectId) > 0) {
      payload.projectId = Number(data.projectId);
    }
    if (sessionUser?.id) {
      payload.updatedById = Number(sessionUser.id);
    }

    const res = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = Array.isArray(responseData.message)
        ? responseData.message.join(" - ")
        : responseData.message || "فشل تحديث حالة الاختبار";
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Safety: ensure response data never overwrites the original creator with the updater
    if (responseData && typeof responseData === "object") {
      delete responseData.tester;
      delete responseData.testerId;
      delete responseData.userId;
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

    recordSystemAuditLog({
      action: "تعديل حالة اختبار",
      actionCategory: "TEST_CASES",
      description: `تعديل حالة الاختبار #${id} - الموديول: ${payload.module || "بدون تغيير"} - الحالة: ${payload.status || "بدون تغيير"}`,
      endpoint: `/api/test-cases/${id}`,
      method: "PATCH",
    }).catch(() => {});

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
