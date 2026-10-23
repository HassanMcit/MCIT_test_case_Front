"use server";

import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";

export interface AppNotification {
  id: number;
  userId: number;
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
}

export async function getClientToken(): Promise<string | null> {
  return getUserToken();
}

export async function refreshNotifications(): Promise<NotificationsResponse> {
  try {
    updateTag("notifications");
    return getMyNotifications();
  } catch (err) {
    console.error("Error refreshing notifications:", err);
    return getMyNotifications();
  }
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

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
        next: { tags: ["notifications"] },
      }
    );

    if (res.status === 401) {
      return { notifications: [], unreadCount: 0, unauthorized: true };
    }

    if (!res.ok) {
      return { notifications: [], unreadCount: 0 };
    }

    const data = await res.json();
    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      unreadCount: Number(data.unreadCount) || 0,
    };
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    const token = await getUserToken();
    if (!token) return { success: false };

    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications/${id}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
      }
    );

    updateTag("notifications");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const token = await getUserToken();
    if (!token) return { success: false };

    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/notifications/read-all`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
      }
    );

    updateTag("notifications");
    return { success: true };
  } catch {
    return { success: false };
  }
}
