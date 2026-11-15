"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { GetAllUsersResponse } from "./user.interface";
import { updateTag, revalidatePath } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { queryAllUsersFromDb, raceBackendFetch } from "@/lib/fast-read";
import { normalizeApiUserPhoto } from "@/lib/avatar";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

export async function getAllUsers() {
  if ((await getCurrentUserSession())?.role !== "admin") return [];
  try {
    const token = await getUserToken();
    if (!token) return [];

    const fetchPromise = appFetch(
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
      return Array.isArray(resData) ? resData.map((u: any) => { const avatar = normalizeApiUserPhoto(u.id, u.photo, u.profileImage, u.updatedAt, ""); return { ...u, photo: avatar, profileImage: avatar }; }) : [];
    }

    // Render Cold-Start Fallback: read directly from PostgreSQL pool (~80ms)
    return await queryAllUsersFromDb();
  } catch (error) {
    return [];
  }
}

export async function deleteThisUser(id: number) {
  const token = await getUserToken();
  if (!token) {
    throw new Error("يرجى تسجيل الدخول أولاً");
  }
  const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  if (!baseUrl) {
    throw new Error("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");
  }

  const response = await fetchWithWakeRetry(
    appFetch,
    `${baseUrl}/api/users/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
    {
      maxAttempts: 3,
      timeoutsMs: [20000, 25000, 20000],
      retryOnTimeout: true,
      baseUrl,
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractBackendErrorMessage(response.status, result, "فشل حذف المستخدم"));
  }

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
