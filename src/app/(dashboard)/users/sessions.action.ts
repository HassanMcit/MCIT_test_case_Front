"use server";

import { getUserToken } from "@/app/myUtil";

export interface LoginSessionItem {
  id: number;
  sessionId: string;
  userId: number;
  userName: string;
  email: string;
  ip: string;
  macAddress: string;
  deviceInfo: string;
  location: string;
  userAgent: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}

export async function getLoginSessions(): Promise<LoginSessionItem[]> {
  try {
    const token = await getUserToken();
    if (!token) return [];
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/sessions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch login sessions:", err);
    return [];
  }
}

export async function revokeLoginSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getUserToken();
    if (!token) return { success: false, message: "انتهت صلاحية الجلسة" };
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || "تم تسجيل الخروج من هذا الجهاز" };
  } catch (err: any) {
    return { success: false, message: err?.message || "حدث خطأ أثناء إنهاء الجلسة" };
  }
}

export async function revokeAllOtherSessions(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getUserToken();
    if (!token) return { success: false, message: "انتهت صلاحية الجلسة" };
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/sessions/revoke-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, keepCurrent: true }),
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || "تم إنهاء جميع الجلسات الأخرى بنجاح" };
  } catch (err: any) {
    return { success: false, message: err?.message || "حدث خطأ" };
  }
}
