"use server";

import { unstable_cache, updateTag } from "next/cache";
import { getUserToken } from "@/app/myUtil";
import { pool } from "@/lib/db";

export interface AuditLogItem {
  id: number;
  userId: number | null;
  userName: string | null;
  email: string | null;
  role: string | null;
  action: string;
  actionCategory: string;
  description: string | null;
  method: string | null;
  endpoint: string | null;
  ip: string;
  macAddress: string;
  location: string;
  deviceInfo: string;
  userAgent: string;
  status: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const getCachedAuditLogs = unstable_cache(
  async (query?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    userId?: number;
  }): Promise<AuditLogsResponse> => {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pidx = 1;

    if (query?.userId) {
      conditions.push(`"userId" = $${pidx++}`);
      params.push(Number(query.userId));
    }

    if (query?.category && query.category !== "all") {
      conditions.push(`"actionCategory" = $${pidx++}`);
      params.push(query.category);
    }

    if (query?.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(`(
        "userName" ILIKE $${pidx} OR
        email ILIKE $${pidx} OR
        action ILIKE $${pidx} OR
        description ILIKE $${pidx} OR
        ip ILIKE $${pidx} OR
        "macAddress" ILIKE $${pidx} OR
        location ILIKE $${pidx}
      )`);
      params.push(term);
      pidx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const dataRes = await pool.query(
      `SELECT * FROM audit_logs
       ${whereClause}
       ORDER BY "createdAt" DESC, id DESC
       LIMIT $${pidx++} OFFSET $${pidx++}`,
      [...params, limit, offset]
    );

    const formattedData: AuditLogItem[] = dataRes.rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName || "",
      email: r.email || "",
      role: r.role || "user",
      action: r.action || "",
      actionCategory: r.actionCategory || "GENERAL",
      description: r.description || "",
      method: r.method || "ACTION",
      endpoint: r.endpoint || "",
      ip: r.ip || "Unknown IP",
      macAddress: r.macAddress || "02:00:00:00:00:01",
      location: r.location || "Egypt",
      deviceInfo: r.deviceInfo || "Browser",
      userAgent: r.userAgent || "",
      status: r.status || "success",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },
  ["audit-logs-query"],
  {
    tags: ["audit-logs"],
    revalidate: false,
  }
);

export async function getAuditLogs(query?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  userId?: number;
}): Promise<AuditLogsResponse> {
  try {
    return await getCachedAuditLogs(query);
  } catch (err) {
    console.error("Direct Postgres query failed for audit logs:", err);
    return { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 } };
  }
}

export async function recordClientAuditAction(payload: {
  action: string;
  actionCategory?: string;
  description?: string;
  method?: string;
  endpoint?: string;
  status?: string;
  ip?: string;
  macAddress?: string;
  location?: string;
  deviceInfo?: string;
  userAgent?: string;
}): Promise<boolean> {
  try {
    const token = await getUserToken();
    let userId: number | null = null;
    let userName: string | null = null;
    let email: string | null = null;
    let role: string | null = null;

    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadObj = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = Number(payloadObj.id || payloadObj.userId || payloadObj.sub) || null;
          userName = payloadObj.name || null;
          email = payloadObj.email || null;
          role = payloadObj.role || null;
        }
      } catch {}
    }

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
        payload.action,
        payload.actionCategory || "CLIENT_ACTION",
        payload.description || null,
        payload.method || "UI_ACTION",
        payload.endpoint || null,
        payload.ip || "Unknown IP",
        payload.macAddress || "02:00:00:00:00:01",
        payload.location || "Egypt",
        payload.deviceInfo || "Browser",
        payload.userAgent || "",
        payload.status || "success",
      ]
    );

    updateTag("audit-logs");
    return true;
  } catch (err) {
    console.error("Failed to record client audit action to DB:", err);
    return false;
  }
}
