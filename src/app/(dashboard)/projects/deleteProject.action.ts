"use server";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath } from "next/cache";

export async function deleteProject(id: number) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "غير مصرح لك بالعملية (Unauthorized)" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = Array.isArray(result?.message)
        ? result.message.join(", ")
        : (result?.message || "فشل حذف المشروع");
      return { success: false, message: errorMsg };
    }

    revalidatePath("/projects");
    revalidatePath("/assign-projects");
    revalidatePath("/add");
    revalidatePath("/test-cases");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");

    return { success: true, message: result?.message || "تم حذف المشروع بنجاح" };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
