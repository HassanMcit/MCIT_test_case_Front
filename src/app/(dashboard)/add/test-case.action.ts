"use server";

import { getUserToken } from "@/app/myUtil";
import type { AddTestCaseResponse, TestCaseFormValues } from "./test-case-interface";
import { revalidatePath, updateTag } from "next/cache";

function computeScheduledExecutedAt(testId?: string): string {
  const match = (testId || "").match(/(\d+)$/);
  const caseNum = match ? Math.max(1, parseInt(match[1], 10)) : 1;
  // 2026-10-19 09:10:00 AM Cairo time (UTC+3) = 2026-10-19T06:10:00.000Z
  const baseUtcMs = Date.UTC(2026, 9, 19, 6, 10, 0, 0);
  const scheduledMs = baseUtcMs + (caseNum - 1) * 4 * 60 * 1000;
  return new Date(scheduledMs).toISOString();
}

export async function addNewTestCase(data: TestCaseFormValues) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى" };
    }

    const safePayload = {
      ...data,
      module: (data.module || "").slice(0, 50).trim(),
      executedAt: computeScheduledExecutedAt(data.testId),
    };

    let response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(safePayload),
      cache: "force-cache",
    });

    if (!response.ok && response.status === 409) {
      const freshNextId = await getNextTestCaseId(data.module, data.projectId);
      const nextIdFormatted =
        data.status === "failed"
          ? freshNextId.replace(/^TC-/, "BUG-")
          : freshNextId;
      response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...safePayload,
          testId: nextIdFormatted,
          executedAt: computeScheduledExecutedAt(nextIdFormatted),
        }),
        cache: "force-cache",
      });
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
      return {
        success: true,
        message: "Test case created successfully",
        data: responseData,
      };
    }

    const errorMsg = Array.isArray(responseData.message)
      ? responseData.message.join(" - ")
      : responseData.message || "حدث خطأ أثناء إضافة حالة الاختبار";

    return { success: false, message: errorMsg };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "حدث خطأ غير متوقع في الاتصال بالخادم",
    };
  }
}

export async function getNextTestCaseId(moduleName?: string, projectId?: number): Promise<string> {
  try {
    const token = await getUserToken();
    if (!token) return "TC-0001";

    const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`);
    url.searchParams.set("limit", "100");
    if (projectId && Number(projectId) > 0) {
      url.searchParams.set("projectId", String(projectId));
    } else if (moduleName && moduleName.trim() !== "") {
      url.searchParams.set("module", moduleName.trim());
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["test-cases"] },
    });

    if (!response.ok) {
      return "TC-0001";
    }

    const data = await response.json();
    const items = Array.isArray(data?.data) ? data.data : [];

    let maxNum = 0;
    for (const item of items) {
      const match = (item?.testId || "").match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    return `TC-${String(maxNum + 1).padStart(4, "0")}`;
  } catch (err) {
    console.error("Error in getNextTestCaseId:", err);
    return "TC-0001";
  }
}