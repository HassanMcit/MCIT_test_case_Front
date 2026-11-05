"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { updateTag } from "next/cache";
import { raceBackendFetch } from "@/lib/fast-read";

export interface AppNotification {
  id: number;
  userId: number;
  titleEn?: string | null;
  messageEn?: string | null;
  link?: string | null;
  title: string;
  message: string;
  projectId?: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  unauthorized?: boolean;
  unavailable?: boolean;
}

export async function getClientToken(): Promise<string | null> {
  return getUserToken();
}

export async function refreshNotifications(): Promise<NotificationsResponse> {
  // Reads are already no-store. Invalidating a tag here also invalidates the
  // invoking browser's Router Cache, discarding unrelated ready page payloads.
  return getMyNotifications();
}

export async function revalidateNotificationsTag() {
  try {
    updateTag("notifications");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getMyNotifications(): Promise<NotificationsResponse> {
  try {
    const token = await getUserToken();
    if (!token) return { notifications: [], unreadCount: 0 };

    const fetchPromise = appFetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const res = await raceBackendFetch(fetchPromise, 2000);
    if (!res) {
      return { notifications: [], unreadCount: 0, unavailable: true };
    }

    if (res.status === 401) {
      return { notifications: [], unreadCount: 0, unauthorized: true };
    }

    if (!res.ok) {
      return { notifications: [], unreadCount: 0, unavailable: true };
    }

    const data = await res.json();
    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      unreadCount: Number(data.unreadCount) || 0,
    };
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return { notifications: [], unreadCount: 0, unavailable: true };
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    const token = await getUserToken();
    if (!token) return { success: false };

    await appFetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications/${id}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const token = await getUserToken();
    if (!token) return { success: false };

    await appFetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications/read-all`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}
