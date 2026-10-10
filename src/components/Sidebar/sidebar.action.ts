"use server";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";

export interface DashboardStatsResponse {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: number;
  totalProjects: number;
}

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) {
      return { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, totalProjects: 0 };
    }

    const qs = sessionUser?.id
      ? `?userId=${sessionUser.id}&role=${sessionUser.role}`
      : "";

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/stats${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
      next: { tags: ["dashboard-stats", "test-cases"] },
    });

    if (!res.ok) {
      return { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, totalProjects: 0 };
    }

    const data = await res.json();
    return {
      total: Number(data.total) || 0,
      passed: Number(data.passed) || 0,
      failed: Number(data.failed) || 0,
      pending: Number(data.pending) || 0,
      passRate: Number(data.passRate) || 0,
      totalProjects: Number(data.totalProjects) || 0,
    };
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, totalProjects: 0 };
  }
}
