"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import type { AddTestCaseResponse, TestCaseFormValues } from "./test-case-interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";

export async function addNewTestCase(data: TestCaseFormValues) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى" };
    }

    const nowIso = new Date().toISOString();
    const resolvedExecutedAt = nowIso;
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
      executedAt: resolvedExecutedAt,
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
    if (data.testerId) {
      safePayload.testerId = Number(data.testerId);
    }
    if (data.userId) {
      safePayload.userId = Number(data.userId);
    }

    let response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(safePayload),
      cache: "no-store",
    });

    if (!response.ok && response.status === 409) {
      const freshNextId = await getNextTestCaseId(data.module, data.projectId);
      const nextIdFormatted =
        data.status === "failed"
          ? freshNextId.replace(/^TC-/, "BUG-")
          : freshNextId;
      response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...safePayload,
          testId: nextIdFormatted,
          executedAt: resolvedExecutedAt,
        }),
        cache: "no-store",
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

    const response = await appFetch(url.toString(), {
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