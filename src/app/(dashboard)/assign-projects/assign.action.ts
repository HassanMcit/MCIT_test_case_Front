"use server";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { getAllUsers } from "../users/user.action";
import { getProjects } from "../projects/getProjects.action";

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
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${userId}/assign-project`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getUserToken()}`,
        },
        body: JSON.stringify({ projectId }),
        cache: "force-cache",
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || "Failed to assign project" };

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

    recordSystemAuditLog({
      action: "إسناد مشروع لمستخدم",
      actionCategory: "PROJECTS",
      description: `إسناد المستخدم #${userId} إلى المشروع #${projectId}`,
      endpoint: `/api/users/${userId}/assign-project`,
      method: "POST",
    }).catch(() => {});

    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, error: "Network error" };
  }
}

export async function unassignProjectFromUser(userId: number, projectId: number) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${userId}/assign-project/${projectId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await getUserToken()}`,
        },
        cache: "force-cache",
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || "Failed to unassign project" };

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

    recordSystemAuditLog({
      action: "إلغاء إسناد مشروع",
      actionCategory: "PROJECTS",
      description: `إلغاء إسناد المشروع #${projectId} من المستخدم #${userId}`,
      endpoint: `/api/users/${userId}/assign-project/${projectId}`,
      method: "DELETE",
    }).catch(() => {});

    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, error: "Network error" };
  }
}
