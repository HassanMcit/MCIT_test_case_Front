"use server";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";

export interface UpdateProjectInput {
  name: string;
  description?: string;
  environment: "production" | "staging";
  status: "active" | "archived";
}

export async function updateProject(id: number, data: UpdateProjectInput) {
  try {
    const token = await getUserToken();
    if (!token) {
      return { success: false, message: "غير مصرح لك بالعملية (Unauthorized)" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "force-cache",
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = Array.isArray(result.message)
        ? result.message.join(", ")
        : result.message || "Failed to update project";
      return { success: false, message: errorMsg };
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
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "حدث خطأ في الاتصال بالخادم",
    };
  }
}
