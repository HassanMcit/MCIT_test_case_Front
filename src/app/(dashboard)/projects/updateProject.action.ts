"use server";
import { revalidatePath, updateTag } from "next/cache";

import { getUserToken } from "@/app/myUtil";
import { appFetch } from "@/lib/app-fetch";
import { recordSystemAuditLog } from "@/lib/audit";
import { updateProjectApiSchema } from "./project-schedule.zod";

export async function updateProject(
  id: number,
  data: {
    name?: string;
    description?: string;
    environment?: string;
    status?: string;
    application?: string;
    startAt?: string;
    endAt?: string;
    assignedTesterId?: number | null;
  },
) {
  try {
    const parsed = updateProjectApiSchema.safeParse(data);
    if (!parsed.success)
      return {
        success: false,
        message:
          "Check project fields and dates / راجع بيانات المشروع والتواريخ",
      };
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "يرجى تسجيل الدخول أولاً" };
    }

    const response = await appFetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = Array.isArray(result.message)
        ? result.message.join(" - ")
        : result.message || "Failed to update project";
      return { success: false, message: errorMsg };
    }

    updateTag("notifications");
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

    recordSystemAuditLog({
      action: "تعديل مشروع",
      actionCategory: "PROJECTS",
      description: `تعديل بيانات المشروع #${id} (${data.name || ""})`,
      endpoint: `/api/projects/${id}`,
      method: "PATCH",
    }).catch(() => {});

    return { success: true, data: result };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
