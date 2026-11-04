"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";

export async function deleteProject(id: number) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "يرجى تسجيل الدخول أولاً" };
    }

    const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: result?.message || "فشل حذف المشروع",
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

    recordSystemAuditLog({
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
      message: err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
