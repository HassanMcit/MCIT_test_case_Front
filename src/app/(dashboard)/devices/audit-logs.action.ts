"use server";

import { getUserToken } from "@/app/myUtil";

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

export async function getAuditLogs(query?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  userId?: number;
}): Promise<AuditLogsResponse> {
  try {
    const token = await getUserToken();
    if (!token) {
      return { data: [], meta: { total: 0, page: 1, limit: 30, totalPages: 1 } };
    }

    const params = new URLSearchParams();
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));
    if (query?.search && query.search.trim()) params.append("search", query.search.trim());
    if (query?.category && query.category !== "all") params.append("category", query.category);
    if (query?.userId) params.append("userId", String(query.userId));

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/audit-logs?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      return await res.json();
    }
    return { data: [], meta: { total: 0, page: 1, limit: 30, totalPages: 1 } };
  } catch (err) {
    console.error("Failed to fetch audit logs:", err);
    return { data: [], meta: { total: 0, page: 1, limit: 30, totalPages: 1 } };
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
    if (!token) return false;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/audit-logs/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error("Failed to record client audit action:", err);
    return false;
  }
}
