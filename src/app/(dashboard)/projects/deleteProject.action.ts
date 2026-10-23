"use server";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";

export async function deleteProject(id: number) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "يرجى تسجيل الدخول أولاً" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "force-cache",
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

    return { success: true, message: result?.message || "تم حذف المشروع بنجاح" };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
