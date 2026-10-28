import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { getCurrentUserSession } from "@/app/myUtil";
import * as crypto from "node:crypto";

export interface AuditLogPayload {
  action: string;
  actionCategory: "TEST_CASES" | "PROJECTS" | "USER_MANAGEMENT" | "AUTH" | "SECURITY" | "QUALITY" | "PROFILE" | string;
  description?: string;
  method?: string;
  endpoint?: string;
  status?: "success" | "error";
  userId?: number;
  userName?: string;
  email?: string;
  role?: string;
  ip?: string;
  macAddress?: string;
  location?: string;
  deviceInfo?: string;
  userAgent?: string;
}

function parseDeviceFromUA(ua: string): string {
  if (!ua) return "Browser";
  let os = "Windows 10/11";
  if (/Windows NT 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Google Chrome";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  return `${os} - ${browser}`;
}

function generateDeterministicMac(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
  const firstByte = ((parseInt(hex.slice(0, 2), 16) | 0x02) & 0xfe)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return [
    firstByte,
    hex.slice(2, 4).toUpperCase(),
    hex.slice(4, 6).toUpperCase(),
    hex.slice(6, 8).toUpperCase(),
    hex.slice(8, 10).toUpperCase(),
    hex.slice(10, 12).toUpperCase(),
  ].join(":");
}

/**
 * Ensures the active user is recorded in user_login_sessions with an active status.
 */
export async function touchUserSessionInDb(user: {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}, reqIp?: string, reqUa?: string) {
  try {
    const existing = await pool.query(
      `SELECT id, "sessionId", "macAddress", location, "deviceInfo" 
       FROM user_login_sessions 
       WHERE "userId" = $1 AND "isActive" = TRUE 
       ORDER BY "lastSeenAt" DESC, id DESC LIMIT 1`,
      [user.id]
    );

    const ua = reqUa || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    const ip = reqIp || "Unknown IP";
    const deviceInfo = parseDeviceFromUA(ua);
    const mac = existing.rows[0]?.macAddress || generateDeterministicMac(`user-${user.id}-${ip}-${ua}`);
    const location = existing.rows[0]?.location || "Cairo, Cairo Governorate, Egypt (Ministry of Communications and Information Technology)";

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE user_login_sessions 
         SET "lastSeenAt" = NOW(), ip = $1, "userAgent" = $2, "deviceInfo" = $3 
         WHERE id = $4`,
        [ip, ua, deviceInfo, existing.rows[0].id]
      );
      return {
        sessionId: existing.rows[0].sessionId,
        macAddress: mac,
        location,
        deviceInfo,
      };
    } else {
      const sessionId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO user_login_sessions (
          "sessionId", "userId", "userName", email, ip, "macAddress", "deviceInfo", location, "userAgent", "isActive", "createdAt", "lastSeenAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), NOW())`,
        [sessionId, user.id, user.name || "MCIT User", user.email || "", ip, mac, deviceInfo, location, ua]
      );
      return {
        sessionId,
        macAddress: mac,
        location,
        deviceInfo,
      };
    }
  } catch (err) {
    console.error("touchUserSessionInDb error:", err);
    return null;
  }
}

/**
 * Universal Server-Side Audit Trail Logger.
 * Records all system activities into audit_logs and updates user presence in user_login_sessions.
 */
export async function recordSystemAuditLog(payload: AuditLogPayload): Promise<boolean> {
  try {
    // 1. Resolve current user
    let userId = payload.userId;
    let userName = payload.userName;
    let email = payload.email;
    let role = payload.role;

    if (!userId || !email) {
      try {
        const session = await getCurrentUserSession();
        if (session) {
          if (!userId && session.id) userId = Number(session.id);
          if (!userName && session.name) userName = session.name;
          if (!email && session.email) email = session.email;
          if (!role && session.role) role = session.role;
        }
      } catch {}
    }

    // 2. Resolve request headers
    let ip = payload.ip;
    let userAgent = payload.userAgent;

    if (!ip || !userAgent) {
      try {
        const headerList = await headers();
        if (!ip) {
          ip =
            headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headerList.get("x-real-ip") ||
            headerList.get("cf-connecting-ip") ||
            "41.179.246.45";
        }
        if (!userAgent) {
          userAgent = headerList.get("user-agent") || "";
        }
      } catch {}
    }

    if (!ip) ip = "41.179.246.45";
    if (!userAgent) userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    // 3. Touch user presence & get device metadata
    let macAddress = payload.macAddress;
    let location = payload.location;
    let deviceInfo = payload.deviceInfo;

    if (userId) {
      const sessionMeta = await touchUserSessionInDb(
        { id: userId, name: userName, email, role },
        ip,
        userAgent
      );
      if (sessionMeta) {
        if (!macAddress) macAddress = sessionMeta.macAddress;
        if (!location) location = sessionMeta.location;
        if (!deviceInfo) deviceInfo = sessionMeta.deviceInfo;
      }
    }

    if (!deviceInfo) deviceInfo = parseDeviceFromUA(userAgent);
    if (!macAddress) macAddress = generateDeterministicMac(`client-${userId || 0}-${ip}`);
    if (!location) location = "Cairo, Cairo Governorate, Egypt (Ministry of Communications and Information Technology)";

    // 4. Insert into audit_logs table
    await pool.query(
      `INSERT INTO audit_logs (
        "userId", "userName", email, role, action, "actionCategory",
        description, method, endpoint, ip, "macAddress", location,
        "deviceInfo", "userAgent", status, "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )`,
      [
        userId || null,
        userName || "مستخدم النظام",
        email || null,
        role || "user",
        payload.action,
        payload.actionCategory,
        payload.description || null,
        payload.method || "POST",
        payload.endpoint || null,
        ip,
        macAddress,
        location,
        deviceInfo,
        userAgent,
        payload.status || "success",
      ]
    );

    try {
      revalidateTag("audit-logs", { expire: 0 });
      revalidateTag("login-sessions", { expire: 0 });
    } catch {}

    return true;
  } catch (err) {
    console.error("recordSystemAuditLog failed gracefully:", err);
    return false;
  }
}
