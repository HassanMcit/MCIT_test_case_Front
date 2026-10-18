"use server";

import { getCurrentUserSession, getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { getProjects } from "../projects/getProjects.action";
import { getTestCases } from "../test-cases/test-cases.action";
import { getAllUsers } from "../users/user.action";
import type {
  DashboardChartItem,
  DashboardDataPayload,
  DashboardSeverityBreakdown,
  DashboardStats,
  DashboardUserOverview,
} from "./dashboard.interface";

export async function getDashboardFullData(): Promise<DashboardDataPayload> {
  const sessionUser = await getCurrentUserSession();
  const token = sessionUser?.token || (await getUserToken());

  const defaultStats: DashboardStats = {
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    passRate: 0,
    totalProjects: 0,
  };

  const defaultSeverity: DashboardSeverityBreakdown = {
    totalFailed: 0,
    breakdown: [
      { severity: "critical", count: 0, percentage: 0 },
      { severity: "high", count: 0, percentage: 0 },
      { severity: "medium", count: 0, percentage: 0 },
      { severity: "low", count: 0, percentage: 0 },
    ],
  };

  if (!token) {
    return {
      currentUser: null,
      stats: defaultStats,
      chartData: [],
      severityData: defaultSeverity,
      projects: [],
      testCases: [],
      usersOverview: [],
    };
  }

  const isAdmin = sessionUser?.role === "admin";
  const cacheParam = sessionUser?.id
    ? `cacheUser=${sessionUser.role}_${sessionUser.id}_20261019_v2`
    : "cv=20261019_v2";

  // Fetch Projects, Test Cases, Stats, Chart, Severity, and Users (if Admin) in parallel
  const [projects, testCasesRes, rawUsers, statsRes, chartRes, severityRes] =
    await Promise.all([
      getProjects(),
      getTestCases({ limit: 500 }),
      isAdmin ? getAllUsers() : Promise.resolve([]),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/stats${
          cacheParam ? `?${cacheParam}` : ""
        }`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "force-cache",
          next: { tags: ["dashboard", "dashboard-stats", "test-cases", "projects"] },
        }
      ).catch(() => null),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/chart?days=14${
          cacheParam ? `&${cacheParam}` : ""
        }`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "force-cache",
          next: { tags: ["dashboard", "test-cases"] },
        }
      ).catch(() => null),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/severity${
          cacheParam ? `?${cacheParam}` : ""
        }`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "force-cache",
          next: { tags: ["dashboard", "test-cases"] },
        }
      ).catch(() => null),
    ]);

  const allTestCases = testCasesRes?.data || [];

  // Filter test cases to user's assigned projects if tester
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

  // Enrich each project with accurate stats from scopedTestCases so legacy module-matched cases are always counted
  const enrichedProjects = projects.map((proj) => {
    const projCases = scopedTestCases.filter(
      (tc) =>
        (tc.projectId && tc.projectId === proj.id) ||
        (tc.module &&
          proj.name &&
          tc.module.trim().toLowerCase() === proj.name.trim().toLowerCase())
    );
    const total = Math.max(proj.stats?.total || 0, projCases.length);
    const passed =
      projCases.length > 0
        ? projCases.filter((c) => c.status === "passed").length
        : proj.stats?.passed || 0;
    const failed =
      projCases.length > 0
        ? projCases.filter((c) => c.status === "failed").length
        : proj.stats?.failed || 0;
    const pending =
      projCases.length > 0
        ? projCases.filter(
            (c) =>
              c.status === "pending" ||
              c.status === "skipped" ||
              c.status === "blocked"
          ).length
        : proj.stats?.pending || 0;
    const successRate =
      total > 0 ? Math.round((passed / total) * 100) : proj.stats?.successRate || 0;

    return {
      ...proj,
      stats: {
        total,
        passed,
        failed,
        pending,
        successRate,
      },
    };
  });

  // Compute accurate KPI stats
  let stats: DashboardStats = { ...defaultStats };
  if (scopedTestCases.length > 0) {
    const total = scopedTestCases.length;
    const passed = scopedTestCases.filter((c) => c.status === "passed").length;
    const failed = scopedTestCases.filter((c) => c.status === "failed").length;
    const pending = scopedTestCases.filter(
      (c) =>
        c.status === "pending" || c.status === "skipped" || c.status === "blocked"
    ).length;
    const passRate = total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0;
    stats = {
      total,
      passed,
      failed,
      pending,
      passRate,
      totalProjects: enrichedProjects.length,
    };
  } else if (statsRes && statsRes.ok) {
    const sData = await statsRes.json();
    stats = {
      total: Number(sData.total) || 0,
      passed: Number(sData.passed) || 0,
      failed: Number(sData.failed) || 0,
      pending: Number(sData.pending) || 0,
      passRate: Number(sData.passRate) || 0,
      totalProjects: enrichedProjects.length || Number(sData.totalProjects) || 0,
    };
  } else {
    stats.totalProjects = enrichedProjects.length;
  }

  // Parse or compute 14-day chart data
  let chartData: DashboardChartItem[] = [];
  if (chartRes && chartRes.ok) {
    const cJson = await chartRes.json();
    if (Array.isArray(cJson?.data)) {
      chartData = cJson.data;
    }
  }

  // Compute severity breakdown from scopedTestCases (or backend fallback)
  let severityData: DashboardSeverityBreakdown = defaultSeverity;
  const failedCases = scopedTestCases.filter((c) => c.status === "failed");
  if (failedCases.length > 0) {
    const totalFailed = failedCases.length;
    const levels: Array<"critical" | "high" | "medium" | "low"> = [
      "critical",
      "high",
      "medium",
      "low",
    ];
    severityData = {
      totalFailed,
      breakdown: levels.map((lvl) => {
        const count = failedCases.filter(
          (c) => (c.severity || c.priority || "medium") === lvl
        ).length;
        return {
          severity: lvl,
          count,
          percentage:
            totalFailed > 0 ? Number(((count / totalFailed) * 100).toFixed(1)) : 0,
        };
      }),
    };
  } else if (severityRes && severityRes.ok) {
    const sevJson = await severityRes.json();
    if (sevJson && Array.isArray(sevJson.breakdown)) {
      severityData = sevJson;
    }
  }

  // Build Users & Assigned Projects overview for Admin
  const usersOverview: DashboardUserOverview[] = isAdmin
    ? (rawUsers as any[]).map((u) => {
        const rawAssigned = Array.isArray(u.assignedProjects)
          ? u.assignedProjects
          : [];

        const enrichedAssigned = rawAssigned.map((ap: any) => {
          const projId = ap.projectId || ap.id;
          const matchedProj = enrichedProjects.find(
            (ep) =>
              ep.id === projId ||
              (ep.name &&
                ap.name &&
                ep.name.trim().toLowerCase() === ap.name.trim().toLowerCase())
          );

          const pStats = matchedProj?.stats ||
            ap.stats || {
              total: 0,
              passed: 0,
              failed: 0,
              pending: 0,
              successRate: 0,
            };

          return {
            id: ap.id || projId,
            projectId: projId,
            name: ap.name || matchedProj?.name || "-",
            description: ap.description ?? matchedProj?.description ?? null,
            environment: ap.environment || matchedProj?.environment || "staging",
            status: ap.status || matchedProj?.status || "active",
            assignedAt: ap.assignedAt || "",
            stats: pStats,
          };
        });

        // Also calculate total test cases across this user's assigned projects (plus any authored directly by this user)
        const userCases = scopedTestCases.filter((tc) => {
          const inAssignedProject = enrichedAssigned.some(
            (ap: any) =>
              (tc.projectId && tc.projectId === ap.projectId) ||
              (tc.module &&
                ap.name &&
                tc.module.trim().toLowerCase() === ap.name.trim().toLowerCase())
          );
          const isTester = tc.testerId === u.id || tc.tester?.id === u.id;
          return inAssignedProject || isTester;
        });

        const totalUserCases =
          userCases.length > 0 ? userCases.length : u._count?.testCases || 0;
        const passedUserCases =
          userCases.length > 0
            ? userCases.filter((c) => c.status === "passed").length
            : u._count?.passed || 0;
        const failedUserCases =
          userCases.length > 0
            ? userCases.filter((c) => c.status === "failed").length
            : u._count?.failed || 0;
        const pendingUserCases =
          userCases.length > 0
            ? userCases.filter(
                (c) =>
                  c.status === "pending" ||
                  c.status === "skipped" ||
                  c.status === "blocked"
              ).length
            : u._count?.pending || 0;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          photo: u.photo || u.profileImage || null,
          profileImage: u.profileImage || u.photo || null,
          createdAt: u.createdAt,
          assignedProjects: enrichedAssigned,
          _count: {
            testCases: totalUserCases,
            passed: passedUserCases,
            failed: failedUserCases,
            pending: pendingUserCases,
            assignedProjects: enrichedAssigned.length,
          },
        };
      })
    : [];

  return {
    currentUser: sessionUser
      ? {
          id: Number(sessionUser.id) || 0,
          name: sessionUser.name,
          email: sessionUser.email,
          role: sessionUser.role,
        }
      : null,
    stats,
    chartData,
    severityData,
    projects: enrichedProjects,
    testCases: scopedTestCases,
    usersOverview,
  };
}

export async function revalidateDashboardAction() {
  updateTag("dashboard");
  updateTag("dashboard-stats");
  updateTag("test-cases");
  updateTag("projects");
  updateTag("users");
  revalidatePath("/dashboard");
  revalidatePath("/test-cases");
  revalidatePath("/projects");
  return { success: true };
}
