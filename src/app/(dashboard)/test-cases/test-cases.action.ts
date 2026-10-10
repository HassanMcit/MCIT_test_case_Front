"use server";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { revalidatePath } from "next/cache";
import type { TestCaseItem, TestCaseListResponse, TestCaseQueryParams } from "./test-cases.interface";

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

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["test-cases"] },
    });

    if (!res.ok) {
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
      };
    }

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
  } catch (error) {
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

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "فشل حذف حالة الاختبار");
    }

    revalidatePath("/test-cases");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");

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
    const token = await getUserToken();
    if (!token) {
      throw new Error("يرجى تسجيل الدخول أولاً");
    }

    const payload: Record<string, any> = {};
    if (data.module !== undefined) payload.module = data.module;
    if (data.pageName !== undefined) payload.pageName = data.pageName;
    if (data.scenario !== undefined) payload.scenario = data.scenario;
    if (data.preConditions !== undefined) payload.preConditions = data.preConditions;
    if (data.steps !== undefined) {
      payload.steps = Array.isArray(data.steps)
        ? data.steps.filter((s: string) => s && s.trim() !== "")
        : [];
    }
    if (data.expectedResult !== undefined) payload.expectedResult = data.expectedResult;
    if (data.actualResult !== undefined) payload.actualResult = data.actualResult;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.status !== undefined) payload.status = data.status;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.projectId !== undefined) payload.projectId = data.projectId;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = Array.isArray(responseData.message)
        ? responseData.message.join(" - ")
        : responseData.message || "فشل تحديث حالة الاختبار";
      throw new Error(errorMsg);
    }

    revalidatePath("/test-cases");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "تم تحديث حالة الاختبار بنجاح",
      data: responseData,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء التحديث");
  }
}

export async function getTestCaseById(id: number): Promise<TestCaseItem | null> {
  try {
    const token = await getUserToken();
    if (!token) return null;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases/${id}`, {
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

    const res = await fetch(url.toString(), {
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
    console.error("Error in getFailedTestCases:", error);
    return [];
  }
}
