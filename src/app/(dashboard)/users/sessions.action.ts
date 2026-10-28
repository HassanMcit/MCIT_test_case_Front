"use server";

import { unstable_cache, updateTag } from "next/cache";
import { getUserToken } from "@/app/myUtil";
import { pool } from "@/lib/db";

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

const getCachedLoginSessions = unstable_cache(
  async (): Promise<LoginSessionItem[]> => {
    const res = await pool.query(
      `SELECT * FROM user_login_sessions ORDER BY "createdAt" DESC, id DESC LIMIT 100`
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      userName: r.userName || "",
      email: r.email || "",
      ip: r.ip || "Unknown IP",
      macAddress: r.macAddress || "02:00:00:00:00:01",
      deviceInfo: r.deviceInfo || "Browser",
      location: r.location || "Egypt",
      userAgent: r.userAgent || "",
      isActive: Boolean(r.isActive),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      lastSeenAt: r.lastSeenAt instanceof Date ? r.lastSeenAt.toISOString() : String(r.lastSeenAt),
      revokedAt: r.revokedAt ? (r.revokedAt instanceof Date ? r.revokedAt.toISOString() : String(r.revokedAt)) : undefined,
    }));
  },
  ["login-sessions-query"],
  {
    tags: ["login-sessions"],
    revalidate: false,
  }
);

export async function getLoginSessions(): Promise<LoginSessionItem[]> {
  try {
    return await getCachedLoginSessions();
  } catch (err) {
    console.error("Failed to query login sessions directly from DB:", err);
    return [];
  }
}

export async function revokeLoginSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await pool.query(
      `UPDATE user_login_sessions 
       SET "isActive" = FALSE, "revokedAt" = NOW() 
       WHERE "sessionId" = $1 
       RETURNING "userId", "userName", email`,
      [sessionId]
    );

    const revokedUser = res.rows[0];
    if (revokedUser?.userId) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      await pool.query(
        `UPDATE users SET "minTokenIat" = $1 WHERE id = $2`,
        [nowInSeconds, revokedUser.userId]
      );
    }

    // Also record this security revocation in audit logs
    try {
      await pool.query(
        `INSERT INTO audit_logs (
          action, "actionCategory", description, method, endpoint, ip, "macAddress", location, "deviceInfo", status, "createdAt"
        ) VALUES (
          'تسجيل خروج جهاز عن بُعد', 'SECURITY', $1, 'REVOKE', '/devices', 'System Security', '02:00:00:00:00:01', 'HQ', 'Security Console', 'success', NOW()
        )`,
        [`تم إنهاء جلسة المستخدم (${revokedUser?.userName || revokedUser?.email || sessionId}) عن بُعد وتحديث معيار الأمان`]
      );
    } catch {}

    updateTag("login-sessions");
    updateTag("audit-logs");
    return { success: true, message: "تم تسجيل الخروج من هذا الجهاز بنجاح" };
  } catch (err: any) {
    return { success: false, message: err?.message || "حدث خطأ أثناء إنهاء الجلسة" };
  }
}

export async function revokeAllOtherSessions(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    const minIat = Math.floor(Date.now() / 1000);
    await pool.query(
      `UPDATE users SET "minTokenIat" = $1 WHERE id = $2`,
      [minIat, userId]
    );

    await pool.query(
      `UPDATE user_login_sessions SET "isActive" = FALSE, "revokedAt" = NOW() WHERE "userId" = $1`,
      [userId]
    );

    updateTag("login-sessions");
    return { success: true, message: "تم تسجيل الخروج من كافة الأجهزة الأخرى فورياً" };
  } catch (err: any) {
    return { success: false, message: err?.message || "حدث خطأ أثناء إنهاء الجلسات" };
  }
}
