import { pool } from "./db";
import { getCurrentUserSession } from "@/app/myUtil";

export async function recordServerAuditLog({
  action,
  category = "GENERAL",
  description,
  method = "ACTION",
  endpoint = "",
  status = "success",
  clientIp,
  macAddress,
  location,
  deviceInfo,
  userAgent,
}: {
  action: string;
  category?: string;
  description?: string;
  method?: string;
  endpoint?: string;
  status?: string;
  clientIp?: string;
  macAddress?: string;
  location?: string;
  deviceInfo?: string;
  userAgent?: string;
}) {
  try {
    const sessionUser = await getCurrentUserSession().catch(() => null);
    const userId = sessionUser?.id ? Number(sessionUser.id) : null;
    const userName = sessionUser?.name || null;
    const email = sessionUser?.email || null;
    const role = sessionUser?.role || null;

    await pool.query(
      `INSERT INTO audit_logs (
        "userId", "userName", email, role, action, "actionCategory",
        description, method, endpoint, ip, "macAddress", location,
        "deviceInfo", "userAgent", status, "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )`,
      [
        userId,
        userName,
        email,
        role,
        action,
        category,
        description || null,
        method,
        endpoint,
        clientIp || "Unknown IP",
        macAddress || "02:00:00:00:00:01",
        location || "Egypt",
        deviceInfo || "Browser",
        userAgent || "",
        status,
      ]
    );
  } catch (err) {
    console.error("Failed to write audit log to DB:", err);
  }
}
