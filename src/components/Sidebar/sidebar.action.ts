"use server";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { getProjects } from "@/app/(dashboard)/projects/getProjects.action";
import { getTestCases } from "@/app/(dashboard)/test-cases/test-cases.action";

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

    const isAdmin = sessionUser?.role === "admin";
    const qs = sessionUser?.id
      ? `?userId=${sessionUser.id}&role=${sessionUser.role}`
      : "";

    const [res, projects, testCasesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/stats${qs}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
        next: { tags: ["dashboard", "dashboard-stats", "test-cases", "projects"] },
      }).catch(() => null),
      getProjects(),
      getTestCases({ limit: 500 }),
    ]);

    const allTestCases = testCasesRes?.data || [];
    const scopedTestCases = isAdmin
      ? allTestCases
      : allTestCases.filter((tc) =>
          projects.some(
            (p) =>
              (tc.projectId && p.id === tc.projectId) ||
              (p.name &&
                tc.module &&
                tc.module.trim().toLowerCase() === p.name.trim().toLowerCase())
          )
        );

    if (scopedTestCases.length > 0 || projects.length > 0) {
      const total = scopedTestCases.length;
      const passed = scopedTestCases.filter((c) => c.status === "passed").length;
      const failed = scopedTestCases.filter((c) => c.status === "failed").length;
      const pending = scopedTestCases.filter(
        (c) =>
          c.status === "pending" || c.status === "skipped" || c.status === "blocked"
      ).length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        total,
        passed,
        failed,
        pending,
        passRate,
        totalProjects: projects.length,
      };
    }

    if (!res || !res.ok) {
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
