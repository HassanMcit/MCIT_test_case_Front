"use server";

import { getUserToken } from "@/app/myUtil";
import { GetAllUsersResponse } from "./user.interface";
import { updateTag, revalidatePath } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { queryAllUsersFromDb, raceBackendFetch } from "@/lib/fast-read";

export async function getAllUsers() {
  try {
    const token = await getUserToken();
    if (!token) return [];

    const fetchPromise = fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { tags: ["users"] },
        cache: "force-cache",
      },
    );

    const response = await raceBackendFetch(fetchPromise, 2000);
    if (response && response.ok) {
      const resData = await response.json();
      return Array.isArray(resData) ? resData : [];
    }

    // Render Cold-Start Fallback: read directly from PostgreSQL pool (~80ms)
    return await queryAllUsersFromDb();
  } catch (error) {
    return [];
  }
}

export async function deleteThisUser(id: number) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${await getUserToken()}`,
    },
    cache: "force-cache",
  });

  updateTag("users");
  updateTag("projects");
  updateTag("dashboard");
  updateTag("dashboard-stats");
  revalidatePath("/users");
  revalidatePath("/assign-projects");
  revalidatePath("/dashboard");

  recordSystemAuditLog({
    action: "حذف مستخدم",
    actionCategory: "USER_MANAGEMENT",
    description: `حذف المستخدم #${id} نهائياً من النظام`,
    endpoint: `/api/users/${id}`,
    method: "DELETE",
  }).catch(() => {});

  return true;
}
