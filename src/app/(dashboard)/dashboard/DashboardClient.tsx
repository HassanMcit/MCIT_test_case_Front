"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import {
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  Eye,
  Bug,
  LineChart,
  Check,
  X,
  Sparkles,
  FolderGit2,
  Users,
  Layers,
  FileText,
  AlertCircle,
  Mail,
  Filter,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import type { DashboardDataPayload } from "./dashboard.interface";
import type { TestCaseItem } from "../test-cases/test-cases.interface";
import { revalidateDashboardAction } from "./dashboard.action";

interface DashboardClientProps {
  data: DashboardDataPayload;
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();
  const { lang, t, dir } = useLanguage();
  const isRTL = dir === "rtl";

  const isAdmin = data.currentUser?.role === "admin";

  // Interactive Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedDefect, setSelectedDefect] = useState<TestCaseItem | null>(null);

  const [hoveredBar, setHoveredBar] = useState<{
    day: string;
    p: number;
    f: number;
    pe: number;
    total: number;
    x: number;
  } | null>(null);

  const pageSize = 8;

  // Determine the selected user object (Admin filter)
  const selectedUserObj = useMemo(() => {
    if (selectedUserId === "all") return null;
    return data.usersOverview.find((u) => String(u.id) === selectedUserId) || null;
  }, [selectedUserId, data.usersOverview]);

  // Projects visible under current user filter
  const visibleProjects = useMemo(() => {
    if (!selectedUserObj) return data.projects;
    const assignedIds = new Set(
      selectedUserObj.assignedProjects.map((ap) => ap.projectId || ap.id)
    );
    const assignedNames = new Set(
      selectedUserObj.assignedProjects.map((ap) => ap.name?.trim().toLowerCase())
    );
    return data.projects.filter(
      (p) =>
        assignedIds.has(p.id) ||
        (p.name && assignedNames.has(p.name.trim().toLowerCase()))
    );
  }, [data.projects, selectedUserObj]);

  // Selected project object
  const selectedProjectObj = useMemo(() => {
    if (selectedProjectId === "all") return null;
    return (
      data.projects.find((p) => String(p.id) === selectedProjectId) || null
    );
  }, [selectedProjectId, data.projects]);

  // Test cases scoped by Selected User + Selected Project (drives KPIs, Chart, Severity, and Table)
  const scopedTestCases = useMemo(() => {
    return data.testCases.filter((tc) => {
      // 1. If Admin filtered by a specific User:
      if (selectedUserObj) {
        const userProjIds = new Set(
          selectedUserObj.assignedProjects.map((ap) => ap.projectId || ap.id)
        );
        const userProjNames = new Set(
          selectedUserObj.assignedProjects
            .map((ap) => ap.name?.trim().toLowerCase())
            .filter(Boolean)
        );
        const inUserProjects =
          (tc.projectId && userProjIds.has(tc.projectId)) ||
          (tc.module && userProjNames.has(tc.module.trim().toLowerCase()));
        const isAuthoredByUser =
          tc.testerId === selectedUserObj.id ||
          tc.tester?.id === selectedUserObj.id;

        if (!inUserProjects && !isAuthoredByUser) {
          return false;
        }
      }

      // 2. If filtered by a specific Project:
      if (selectedProjectId !== "all" && selectedProjectObj) {
        const matchId =
          tc.projectId && String(tc.projectId) === String(selectedProjectObj.id);
        const matchName =
          tc.module &&
          selectedProjectObj.name &&
          tc.module.trim().toLowerCase() ===
            selectedProjectObj.name.trim().toLowerCase();
        if (!matchId && !matchName) {
          return false;
        }
      }

      return true;
    });
  }, [data.testCases, selectedUserObj, selectedProjectId, selectedProjectObj]);

  // Dynamic KPI Calculations from scopedTestCases
  const totalTests = scopedTestCases.length;
  const passedTests = scopedTestCases.filter((c) => c.status === "passed").length;
  const failedTests = scopedTestCases.filter((c) => c.status === "failed").length;
  const pendingTests = scopedTestCases.filter(
    (c) =>
      c.status === "pending" || c.status === "skipped" || c.status === "blocked"
  ).length;

  const passRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0.0";
  const passedPercent =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0.0";
  const failedPercent =
    totalTests > 0 ? ((failedTests / totalTests) * 100).toFixed(1) : "0.0";
  const pendingPercent =
    totalTests > 0 ? ((pendingTests / totalTests) * 100).toFixed(1) : "0.0";

  // Dynamic Severity Breakdown from scopedTestCases
  const severityBreakdown = useMemo(() => {
    const failedList = scopedTestCases.filter((c) => c.status === "failed");
    const totalF = failedList.length;
    const countFor = (lvl: string) =>
      failedList.filter((c) => (c.severity || c.priority || "medium") === lvl)
        .length;

    const crit = countFor("critical");
    const high = countFor("high");
    const med = countFor("medium");
    const low = countFor("low");

    return {
      totalFailed: totalF,
      critical: {
        count: crit,
        percent: totalF > 0 ? ((crit / totalF) * 100).toFixed(1) : "0.0",
      },
      high: {
        count: high,
        percent: totalF > 0 ? ((high / totalF) * 100).toFixed(1) : "0.0",
      },
      medium: {
        count: med,
        percent: totalF > 0 ? ((med / totalF) * 100).toFixed(1) : "0.0",
      },
      low: {
        count: low,
        percent: totalF > 0 ? ((low / totalF) * 100).toFixed(1) : "0.0",
      },
    };
  }, [scopedTestCases]);

  // Dynamic 14-Day Execution Trend Data
  const trendData = useMemo(() => {
    const daysCount = 14;
    const result: Array<{
      dateKey: string;
      day: string;
      dayAr: string;
      x: number;
      rawP: number;
      rawF: number;
      rawPe: number;
      p: number;
      f: number;
      pe: number;
      isToday?: boolean;
    }> = [];

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const isToday = i === 0;
      const dayEn = isToday
        ? "Today"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayAr = isToday
        ? "اليوم"
        : d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });

      const dayCases = scopedTestCases.filter((tc) => {
        const rawDate = tc.executedAt || tc.createdAt;
        if (!rawDate) return false;
        return rawDate.startsWith(dateKey);
      });

      const rawP = dayCases.filter((c) => c.status === "passed").length;
      const rawF = dayCases.filter((c) => c.status === "failed").length;
      const rawPe = dayCases.filter(
        (c) =>
          c.status === "pending" ||
          c.status === "skipped" ||
          c.status === "blocked"
      ).length;

      const idx = daysCount - 1 - i;
      result.push({
        dateKey,
        day: dayEn,
        dayAr,
        x: 52 + idx * 50,
        rawP,
        rawF,
        rawPe,
        p: 0,
        f: 0,
        pe: 0,
        isToday,
      });
    }

    // Scale bar heights nicely within SVG max height (150px)
    const maxDailyTotal = Math.max(
      1,
      ...result.map((r) => r.rawP + r.rawF + r.rawPe)
    );
    const maxPx = 145;

    return result.map((r) => {
      const totalRaw = r.rawP + r.rawF + r.rawPe;
      if (totalRaw === 0) {
        return { ...r, p: 0, f: 0, pe: 0 };
      }
      const scale = maxPx / maxDailyTotal;
      return {
        ...r,
        p: Math.max(r.rawP > 0 ? 6 : 0, Math.round(r.rawP * scale)),
        f: Math.max(r.rawF > 0 ? 6 : 0, Math.round(r.rawF * scale)),
        pe: Math.max(r.rawPe > 0 ? 6 : 0, Math.round(r.rawPe * scale)),
      };
    });
  }, [scopedTestCases]);

  const maxChartScale = useMemo(() => {
    return Math.max(
      5,
      ...trendData.map((d) => d.rawP + d.rawF + d.rawPe)
    );
  }, [trendData]);

  // Table Filtering (Search + Status filter on top of scopedTestCases)
  const filteredTestCases = useMemo(() => {
    return scopedTestCases
      .filter((tc) => {
        if (statusFilter !== "all" && tc.status !== statusFilter) {
          return false;
        }
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const displayId =
          tc.status === "failed" && tc.testId?.startsWith("TC-")
            ? tc.testId.replace(/^TC-/, "BUG-")
            : tc.testId || "";
        return (
          displayId.toLowerCase().includes(q) ||
          (tc.testId && tc.testId.toLowerCase().includes(q)) ||
          (tc.scenario && tc.scenario.toLowerCase().includes(q)) ||
          (tc.module && tc.module.toLowerCase().includes(q)) ||
          (tc.pageName && tc.pageName.toLowerCase().includes(q)) ||
          (tc.tester?.name && tc.tester.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.id - a.id);
  }, [scopedTestCases, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTestCases.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTestCases = filteredTestCases.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Trigger Refresh & Revalidate Cache
  const handleRefreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await revalidateDashboardAction();
      router.refresh();
      toast.success(
        isRTL
          ? "تم تحديث بيانات لوحة المؤشرات بنجاح"
          : "Dashboard metrics refreshed successfully"
      );
    } catch {
      toast.error(
        isRTL ? "حدث خطأ أثناء التحديث" : "Failed to refresh dashboard"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const priorityMap: Record<
    string,
    { labelAr: string; labelEn: string; badgeClass: string }
  > = {
    critical: {
      labelAr: "حرجة",
      labelEn: "Critical",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    },
    high: {
      labelAr: "عالية",
      labelEn: "High",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    },
    medium: {
      labelAr: "متوسطة",
      labelEn: "Medium",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    },
    low: {
      labelAr: "منخفضة",
      labelEn: "Low",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80",
    },
  };

  const severityMap: Record<
    string,
    { labelAr: string; labelEn: string; badgeClass: string }
  > = {
    critical: {
      labelAr: "حرجة جداً",
      labelEn: "Critical",
      badgeClass: "bg-red-100 text-red-800 border-red-300 font-bold",
    },
    high: {
      labelAr: "عالية",
      labelEn: "High",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    },
    medium: {
      labelAr: "متوسطة",
      labelEn: "Medium",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    },
    low: {
      labelAr: "منخفضة",
      labelEn: "Low",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative">
      {/* ── Ambient Background Glow Accents ──────────────────────── */}
      <div className="absolute -top-10 right-20 w-96 h-96 bg-[#00aee0]/8 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-72 left-10 w-80 h-80 bg-[#08b77f]/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Section 1: Hero / Header Area ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#bfe9ff]/60 text-[#006685] border border-[#00aee0]/30 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00aee0] animate-pulse" />
              {isAdmin
                ? isRTL
                  ? "لوحة تحكم مدير النظام • جميع المشاريع والمختبرين"
                  : "Admin View • All Projects & Users"
                : isRTL
                ? "لوحة المختبر • المشاريع المسندة إليك"
                : "Tester View • Your Assigned Projects"}
            </span>
            {data.currentUser?.name && (
              <span className="font-mono text-xs text-[#6d797f]">
                • {data.currentUser.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b1c30]">
            {t("dashboard_title")}
          </h1>
          <p className="text-sm text-[#565e74] mt-1 font-normal">
            {isAdmin
              ? isRTL
                ? "متابعة شاملة لجميع المشاريع وحالات الاختبار وإحصائيات كل مستخدم في النظام"
                : "Comprehensive overview of all projects, test cases, and per-user execution metrics"
              : isRTL
              ? "إحصائيات ونتائج حالات الاختبار الخاصة بالمشاريع المسندة إليك"
              : "Live test execution metrics and defect reports across your assigned projects"}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Scope Pill */}
          {(selectedProjectId !== "all" || selectedUserId !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId("all");
                setSelectedUserId("all");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>
                {isRTL ? "إلغاء التصفية" : "Clear Filter"}
              </span>
            </button>
          )}

          {/* Revalidate / Sync Button */}
          <button
            type="button"
            onClick={handleRefreshDashboard}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0b1c30] text-xs font-semibold shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all border border-slate-200/80 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#565e74] ${
                isRefreshing ? "animate-spin text-[#00A2D2]" : ""
              }`}
            />
            <span>
              {isRefreshing
                ? isRTL
                  ? "جاري التحديث..."
                  : "Syncing..."
                : isRTL
                ? "تحديث البيانات"
                : "Sync Data"}
            </span>
          </button>

          {/* New Test Case Button */}
          <Link
            href="/add"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00A2D2] hover:bg-[#008eb8] text-white text-xs font-bold shadow-xs hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("new_test_case")}</span>
          </Link>
        </div>
      </div>

      {/* ── Section 2: Top 5 Primary KPI Cards (5-Column Grid) ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Tests Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/70 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
              {t("total_tests")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#bfe9ff]/50 text-[#006685] flex items-center justify-center border border-[#00aee0]/20 transition-transform group-hover:scale-105">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#0b1c30]">
              {totalTests.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[#006685] font-bold bg-[#eff4ff] px-2 py-0.5 rounded text-[11px]">
                <FolderGit2 className="w-3 h-3" />
                {visibleProjects.length}{" "}
                {isRTL ? "مشاريع نشطة" : "Projects"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Passed Tests Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/70 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
              {t("passed")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 transition-transform group-hover:scale-105">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#0b1c30]">
                {passedTests.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold">
                {passedPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
              <div
                className="bg-[#08b77f] h-full rounded-full transition-all duration-500"
                style={{ width: `${passedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Failed Tests Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/70 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
              {t("failed")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60 transition-transform group-hover:scale-105">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#0b1c30]">
                {failedTests.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-[11px] font-bold">
                {failedPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
              <div
                className="bg-[#ba1a1a] h-full rounded-full transition-all duration-500"
                style={{ width: `${failedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. Pending Tests Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/70 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
              {t("pending")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#565e74] flex items-center justify-center border border-slate-200 transition-transform group-hover:scale-105">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#0b1c30]">
                {pendingTests.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#565e74] border border-slate-200/80 text-[11px] font-bold">
                {pendingPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
              <div
                className="bg-[#bec6e0] h-full rounded-full transition-all duration-500"
                style={{ width: `${pendingPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5. Pass Rate Gauge Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/70 flex items-center justify-between relative overflow-hidden group">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
              {t("pass_rate")}
            </span>
            <div className="text-3xl font-extrabold tracking-tight text-[#0b1c30] mt-1">
              {passRate}%
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#006685] mt-1.5">
              <Sparkles className="w-3 h-3 text-[#00aee0]" />
              <span>{t("goal_rate")}</span>
            </div>
          </div>
          {/* Circular SVG Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-[#00aee0] transition-all duration-700 ease-out"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${passRate}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <div className="absolute flex items-center justify-center text-[#00A2D2]">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2.5: Projects Breakdown Cards (Per-User / Admin) ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#006685] flex items-center justify-center border border-[#00aee0]/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">
                {isAdmin
                  ? isRTL
                    ? "إحصائيات جميع المشاريع وحالات الاختبار"
                    : "All Projects & Test Case Metrics"
                  : isRTL
                  ? "مشاريعي المسندة وإحصائيات الاختبار"
                  : "My Assigned Projects & Test Case Metrics"}
              </h2>
              <p className="text-xs text-[#6d797f]">
                {isRTL
                  ? "اضغط على أي مشروع لتصفية لوحة المؤشرات والرسوم البيانية وحالات الاختبار الخاصة به"
                  : "Click any project card to filter the dashboard KPIs, charts, and test cases"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedProjectId !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("all");
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#eff4ff] text-[#006685] hover:bg-[#dce9ff] transition-colors cursor-pointer"
              >
                {isRTL ? "عرض كل المشاريع" : "Show All Projects"}
              </button>
            )}
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-xs text-[#006685] font-bold hover:text-[#00aee0] transition-colors"
            >
              <span>{isRTL ? "إدارة المشاريع" : "Manage Projects"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {visibleProjects.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            {isRTL
              ? "لا توجد مشاريع مسندة حالياً."
              : "No assigned projects found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {visibleProjects.map((proj) => {
              const isSelected = String(proj.id) === selectedProjectId;
              const pTotal = proj.stats?.total || 0;
              const pPassed = proj.stats?.passed || 0;
              const pFailed = proj.stats?.failed || 0;
              const pPending = proj.stats?.pending || 0;
              const pRate = proj.stats?.successRate || 0;

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(isSelected ? "all" : String(proj.id));
                    setCurrentPage(1);
                  }}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-[#eff4ff]/70 border-[#00A2D2] ring-2 ring-[#00A2D2]/25 shadow-sm"
                      : "bg-[#f8f9ff]/60 border-slate-200/80 hover:border-[#00aee0]/60 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#0b1c30] truncate">
                        {proj.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                          proj.environment === "production"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {proj.environment === "production"
                          ? isRTL
                            ? "إنتاج"
                            : "PROD"
                          : isRTL
                          ? "تجريبي"
                          : "STAGE"}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-[#6d797f] line-clamp-1 mt-1">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Test Case Counts Row */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200/60 text-center">
                    <div className="bg-white rounded-lg py-1.5 px-1 border border-slate-100">
                      <span className="block text-[10px] text-[#6d797f]">
                        {isRTL ? "الكل" : "Total"}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#0b1c30]">
                        {pTotal}
                      </span>
                    </div>
                    <div className="bg-emerald-50/60 rounded-lg py-1.5 px-1 border border-emerald-100">
                      <span className="block text-[10px] text-emerald-700">
                        {isRTL ? "ناجح" : "Pass"}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-emerald-700">
                        {pPassed}
                      </span>
                    </div>
                    <div className="bg-rose-50/60 rounded-lg py-1.5 px-1 border border-rose-100">
                      <span className="block text-[10px] text-rose-700">
                        {isRTL ? "فاشل" : "Fail"}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-rose-700">
                        {pFailed}
                      </span>
                    </div>
                    <div className="bg-slate-100/80 rounded-lg py-1.5 px-1 border border-slate-200/60">
                      <span className="block text-[10px] text-[#565e74]">
                        {isRTL ? "معلق" : "Pend"}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#565e74]">
                        {pPending}
                      </span>
                    </div>
                  </div>

                  {/* Pass rate bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6d797f] font-medium">
                        {isRTL ? "نسبة النجاح" : "Pass Rate"}
                      </span>
                      <span className="font-mono font-bold text-[#006685]">
                        {pRate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#08b77f] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2.8: ADMIN ONLY — Users & Assigned Projects Matrix ── */}
      {isAdmin && data.usersOverview.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#bfe9ff]/50 text-[#006685] flex items-center justify-center border border-[#00aee0]/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#0b1c30]">
                    {isRTL
                      ? "مشاريع المستخدمين وإحصائيات حالات الاختبار (خاص بمدير النظام)"
                      : "Users & Assigned Projects Test Case Matrix (Admin Overview)"}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#006685] border border-[#00aee0]/20">
                    {data.usersOverview.length}{" "}
                    {isRTL ? "مستخدمين" : "Users"}
                  </span>
                </div>
                <p className="text-xs text-[#6d797f]">
                  {isRTL
                    ? "عرض تفصيلي لكل مستخدم والمشاريع المسندة إليه وعدد حالات الاختبار (الكل / ناجح / فاشل / معلق) في كل مشروع"
                    : "Complete breakdown of every user, their assigned projects, and test case counts per project"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedUserId !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("all");
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#eff4ff] text-[#006685] hover:bg-[#dce9ff] transition-colors cursor-pointer"
                >
                  {isRTL ? "عرض كل المستخدمين" : "Show All Users"}
                </button>
              )}
              <Link
                href="/assign-projects"
                className="inline-flex items-center gap-1.5 text-xs text-[#006685] font-bold hover:text-[#00aee0] transition-colors"
              >
                <span>{isRTL ? "إسناد المشاريع" : "Assign Projects"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {data.usersOverview.map((u) => {
              const isUserSelected = String(u.id) === selectedUserId;
              const initials = u.name
                ? u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "U";

              const uTotal = u._count?.testCases || 0;
              const uPassed = u._count?.passed || 0;
              const uFailed = u._count?.failed || 0;
              const uPending = u._count?.pending || 0;

              return (
                <div
                  key={u.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-4 ${
                    isUserSelected
                      ? "bg-[#eff4ff]/50 border-[#00A2D2] ring-2 ring-[#00A2D2]/20 shadow-sm"
                      : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {/* User Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#dae2fd] text-[#006685] font-bold text-xs flex items-center justify-center shrink-0 border border-[#00aee0]/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#0b1c30] truncate">
                              {u.name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                u.role === "admin"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-[#eff4ff] text-[#006685] border border-[#00aee0]/30"
                              }`}
                            >
                              {u.role === "admin"
                                ? isRTL
                                  ? "مدير"
                                  : "Admin"
                                : isRTL
                                ? "مختبر"
                                : "Tester"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6d797f] truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(
                            isUserSelected ? "all" : String(u.id)
                          );
                          setSelectedProjectId("all");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                          isUserSelected
                            ? "bg-[#00A2D2] text-white"
                            : "bg-white text-[#006685] border border-slate-200 hover:bg-[#eff4ff]"
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>
                          {isUserSelected
                            ? isRTL
                              ? "مُصفّى"
                              : "Filtered"
                            : isRTL
                            ? "تصفية"
                            : "Filter"}
                        </span>
                      </button>
                    </div>

                    {/* User Summary Counters */}
                    <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-200/60 text-center">
                      <div className="bg-white rounded-lg py-1 px-1 border border-slate-200/60">
                        <span className="block text-[9px] text-[#6d797f]">
                          {isRTL ? "المشاريع" : "Projects"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#006685]">
                          {u.assignedProjects.length}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg py-1 px-1 border border-slate-200/60">
                        <span className="block text-[9px] text-[#6d797f]">
                          {isRTL ? "الاختبارات" : "Cases"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#0b1c30]">
                          {uTotal}
                        </span>
                      </div>
                      <div className="bg-emerald-50/70 rounded-lg py-1 px-1 border border-emerald-100">
                        <span className="block text-[9px] text-emerald-700">
                          {isRTL ? "ناجح" : "Pass"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-emerald-700">
                          {uPassed}
                        </span>
                      </div>
                      <div className="bg-rose-50/70 rounded-lg py-1 px-1 border border-rose-100">
                        <span className="block text-[9px] text-rose-700">
                          {isRTL ? "فاشل" : "Fail"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-rose-700">
                          {uFailed}
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-lg py-1 px-1 border border-slate-200/60">
                        <span className="block text-[9px] text-[#565e74]">
                          {isRTL ? "معلق" : "Pend"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#565e74]">
                          {uPending}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Projects List with Test Case Counts */}
                    <div className="mt-3 space-y-2">
                      <span className="text-[11px] font-bold text-[#565e74] block">
                        {isRTL
                          ? `المشاريع المسندة (${u.assignedProjects.length}):`
                          : `Assigned Projects (${u.assignedProjects.length}):`}
                      </span>
                      {u.assignedProjects.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic bg-white rounded-xl p-2.5 border border-dashed border-slate-200 text-center">
                          {isRTL
                            ? "لم يتم إسناد مشاريع لهذا المستخدم بعد"
                            : "No projects assigned to this user yet"}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {u.assignedProjects.map((ap) => {
                            const projId = ap.projectId || ap.id;
                            const isProjActive =
                              String(projId) === selectedProjectId;
                            return (
                              <div
                                key={`${u.id}-${projId}`}
                                onClick={() => {
                                  setSelectedProjectId(
                                    isProjActive ? "all" : String(projId)
                                  );
                                  setCurrentPage(1);
                                }}
                                className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                  isProjActive
                                    ? "bg-[#eff4ff] border-[#00A2D2] font-bold"
                                    : "bg-white border-slate-200/70 hover:border-[#00aee0]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Layers className="w-3.5 h-3.5 text-[#006685] shrink-0" />
                                  <span className="truncate font-semibold text-[#0b1c30]">
                                    {ap.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-[#0b1c30] font-bold"
                                    title={isRTL ? "إجمالي الحالات" : "Total Cases"}
                                  >
                                    {ap.stats?.total || 0} TC
                                  </span>
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold"
                                    title={isRTL ? "ناجح" : "Passed"}
                                  >
                                    ✓{ap.stats?.passed || 0}
                                  </span>
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold"
                                    title={isRTL ? "فاشل" : "Failed"}
                                  >
                                    ✗{ap.stats?.failed || 0}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Visual Analytics (70% / 30% Desktop Grid) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Execution Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/70 flex flex-col justify-between">
          <div>
            {/* Header + Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 gap-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[#00A2D2]" />
                  <h2 className="text-base font-bold text-[#0b1c30]">
                    {t("trend_title")}
                  </h2>
                </div>
                <p className="text-xs text-[#6d797f] mt-0.5">
                  {t("trend_subtitle")}
                </p>
              </div>

              {/* Legend with counts */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#08b77f]" />
                  <span className="text-[#3d484f]">
                    {t("passed")} ({passedTests})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                  <span className="text-[#3d484f]">
                    {t("failed")} ({failedTests})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#bec6e0]" />
                  <span className="text-[#3d484f]">
                    {t("pending")} ({pendingTests})
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Tooltip Info Bar */}
            <div className="h-6 mt-2 flex items-center text-xs">
              {hoveredBar ? (
                <div className="flex items-center gap-3 font-medium text-[#0b1c30] bg-[#eff4ff] px-2.5 py-0.5 rounded-lg border border-[#00aee0]/30 animate-in fade-in duration-150">
                  <span className="font-bold text-[#006685]">
                    {hoveredBar.day}:
                  </span>
                  <span className="text-[#006c49]">
                    {isRTL ? "ناجح" : "Passed"}: {hoveredBar.p}
                  </span>
                  <span className="text-[#ba1a1a]">
                    {isRTL ? "راسب" : "Failed"}: {hoveredBar.f}
                  </span>
                  <span className="text-[#565e74]">
                    {isRTL ? "معلق" : "Pending"}: {hoveredBar.pe}
                  </span>
                  <span className="font-mono text-[#006685] font-bold">
                    (
                    {hoveredBar.total > 0
                      ? Math.round((hoveredBar.p / hoveredBar.total) * 100)
                      : 0}
                    % Pass)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-[#6d797f]">
                  {isRTL
                    ? "مرر مؤشر الفأرة فوق أي عمود يومي لعرض التفاصيل الإحصائية المباشرة"
                    : "Hover over any daily bar to view detailed execution distribution"}
                </span>
              )}
            </div>

            {/* SVG Stacked Bar Chart */}
            <div className="w-full h-64 mt-1">
              <svg
                className="w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 760 210"
              >
                {/* Horizontal Dashed Grid Lines */}
                <line
                  stroke="#F1F5F9"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  x1="35"
                  x2="750"
                  y1="20"
                  y2="20"
                />
                <line
                  stroke="#F1F5F9"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  x1="35"
                  x2="750"
                  y1="65"
                  y2="65"
                />
                <line
                  stroke="#F1F5F9"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  x1="35"
                  x2="750"
                  y1="110"
                  y2="110"
                />
                <line
                  stroke="#F1F5F9"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  x1="35"
                  x2="750"
                  y1="155"
                  y2="155"
                />
                <line
                  stroke="#E2E8F0"
                  strokeWidth="1.2"
                  x1="35"
                  x2="750"
                  y1="185"
                  y2="185"
                />

                {/* Dynamic Y-Axis Labels */}
                <text
                  className="text-[10px] font-mono"
                  fill="#94A3B8"
                  x="5"
                  y="24"
                >
                  {maxChartScale}
                </text>
                <text
                  className="text-[10px] font-mono"
                  fill="#94A3B8"
                  x="5"
                  y="69"
                >
                  {Math.round(maxChartScale * 0.75)}
                </text>
                <text
                  className="text-[10px] font-mono"
                  fill="#94A3B8"
                  x="5"
                  y="114"
                >
                  {Math.round(maxChartScale * 0.5)}
                </text>
                <text
                  className="text-[10px] font-mono"
                  fill="#94A3B8"
                  x="5"
                  y="159"
                >
                  {Math.round(maxChartScale * 0.25)}
                </text>
                <text
                  className="text-[10px] font-mono"
                  fill="#94A3B8"
                  x="12"
                  y="189"
                >
                  0
                </text>

                {/* 14 Daily Stacked Bars */}
                {trendData.map((bar) => {
                  const yBase = 185;
                  const yP = yBase - bar.p;
                  const yF = yP - bar.f;
                  const yPe = yF - bar.pe;
                  const rawTotal = bar.rawP + bar.rawF + bar.rawPe;
                  const isHovered =
                    hoveredBar?.day === (isRTL ? bar.dayAr : bar.day);

                  return (
                    <g
                      key={bar.dateKey}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() =>
                        setHoveredBar({
                          day: isRTL ? bar.dayAr : bar.day,
                          p: bar.rawP,
                          f: bar.rawF,
                          pe: bar.rawPe,
                          total: rawTotal,
                          x: bar.x,
                        })
                      }
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Background hover highlight pillar */}
                      {isHovered && (
                        <rect
                          x={bar.x - 4}
                          y="15"
                          width="30"
                          height="170"
                          rx="4"
                          fill="#eff4ff"
                          opacity="0.8"
                        />
                      )}

                      {/* Empty day subtle placeholder bar */}
                      {rawTotal === 0 && (
                        <rect
                          fill="#F1F5F9"
                          height="4"
                          rx="2"
                          width="22"
                          x={bar.x}
                          y={yBase - 4}
                        />
                      )}

                      {/* Stacked bars: Passed (Green), Failed (Red), Pending (Slate) */}
                      {bar.p > 0 && (
                        <rect
                          fill="#08B77F"
                          height={bar.p}
                          rx="3"
                          width="22"
                          x={bar.x}
                          y={yP}
                          className="transition-opacity"
                          opacity={hoveredBar && !isHovered ? "0.6" : "1"}
                        />
                      )}
                      {bar.f > 0 && (
                        <rect
                          fill="#BA1A1A"
                          height={bar.f}
                          rx="2"
                          width="22"
                          x={bar.x}
                          y={yF}
                          className="transition-opacity"
                          opacity={hoveredBar && !isHovered ? "0.6" : "1"}
                        />
                      )}
                      {bar.pe > 0 && (
                        <rect
                          fill="#BEC6E0"
                          height={bar.pe}
                          rx="2"
                          width="22"
                          x={bar.x}
                          y={yPe}
                          className="transition-opacity"
                          opacity={hoveredBar && !isHovered ? "0.6" : "1"}
                        />
                      )}

                      {/* X-Axis day label */}
                      <text
                        className={`text-[10px] font-mono ${
                          bar.isToday || isHovered ? "font-bold" : ""
                        }`}
                        fill={
                          bar.isToday
                            ? "#00A2D2"
                            : isHovered
                            ? "#0b1c30"
                            : "#64748B"
                        }
                        x={bar.x - 2}
                        y="200"
                      >
                        {isRTL ? bar.dayAr : bar.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Footer status line */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-3.5 mt-3 border-t border-slate-100 text-xs text-[#6d797f] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#08b77f] animate-pulse" />
              <span>{t("ci_footer")}</span>
            </div>
            <span className="font-mono font-medium text-[#0b1c30] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
              {isRTL
                ? `إجمالي الحالات المفلترة: ${totalTests}`
                : `Active Scoped Cases: ${totalTests}`}
            </span>
          </div>
        </div>

        {/* Right Column: Defect Severity Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/70 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/50">
                  <Bug className="w-4 h-4 text-[#ba1a1a]" />
                </div>
                <h2 className="text-base font-bold text-[#0b1c30]">
                  {t("defect_title")}
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-50 font-bold text-[#ba1a1a] border border-rose-200/60">
                {severityBreakdown.totalFailed}{" "}
                {isRTL ? "خلل مفتوح" : "Defects"}
              </span>
            </div>
            <p className="text-xs text-[#6d797f] mt-2 mb-4">
              {t("defect_subtitle")}
            </p>

            {/* Severity Bars List */}
            <div className="flex flex-col gap-3.5">
              {/* 1. Critical */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-rose-200 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                    <span className="font-bold text-[#0b1c30]">
                      {t("critical")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#ba1a1a] text-sm">
                      {severityBreakdown.critical.count}
                    </span>
                    <span className="text-[#6d797f] text-[11px]">
                      ({severityBreakdown.critical.percent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#ba1a1a] h-full rounded-full transition-all duration-500"
                    style={{ width: `${severityBreakdown.critical.percent}%` }}
                  />
                </div>
              </div>

              {/* 2. High */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-sky-200 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00aee0]" />
                    <span className="font-bold text-[#0b1c30]">{t("high")}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#0b1c30] text-sm">
                      {severityBreakdown.high.count}
                    </span>
                    <span className="text-[#6d797f] text-[11px]">
                      ({severityBreakdown.high.percent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#00aee0] h-full rounded-full transition-all duration-500"
                    style={{ width: `${severityBreakdown.high.percent}%` }}
                  />
                </div>
              </div>

              {/* 3. Medium */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#565e74]" />
                    <span className="font-bold text-[#0b1c30]">
                      {t("medium")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#0b1c30] text-sm">
                      {severityBreakdown.medium.count}
                    </span>
                    <span className="text-[#6d797f] text-[11px]">
                      ({severityBreakdown.medium.percent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#565e74] h-full rounded-full transition-all duration-500"
                    style={{ width: `${severityBreakdown.medium.percent}%` }}
                  />
                </div>
              </div>

              {/* 4. Low */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6d797f]" />
                    <span className="font-bold text-[#0b1c30]">{t("low")}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#0b1c30] text-sm">
                      {severityBreakdown.low.count}
                    </span>
                    <span className="text-[#6d797f] text-[11px]">
                      ({severityBreakdown.low.percent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#6d797f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${severityBreakdown.low.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Failed Cases CTA Button */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === "failed" ? "all" : "failed");
              setCurrentPage(1);
            }}
            className="w-full mt-4 py-2.5 px-3 rounded-xl bg-[#eff4ff] text-[#006685] hover:bg-[#dce9ff] text-xs font-bold flex items-center justify-center gap-2 border border-[#00aee0]/20 hover:border-[#00aee0]/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {statusFilter === "failed"
                ? isRTL
                  ? "عرض جميع حالات الاختبار"
                  : "Show All Test Cases"
                : isRTL
                ? "عرض حالات الفشل (BUG) فقط في الجدول"
                : "Filter Table by Failed Defects Only"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Section 4: High-Density Test Cases Data Table ────────── */}
      <div className="bg-white rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/70">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input Bar */}
            <div className="relative w-full max-w-sm">
              <Search
                className={`absolute ${
                  isRTL ? "right-3" : "left-3"
                } top-1/2 -translate-y-1/2 text-[#6d797f] w-4 h-4 pointer-events-none`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("search_placeholder")}
                className={`w-full ${
                  isRTL ? "pr-9 pl-16" : "pl-9 pr-16"
                } py-2 rounded-xl bg-[#f8f9ff] text-[#0b1c30] text-xs font-medium border border-slate-200/80 placeholder:text-[#6d797f] focus:outline-none focus:ring-2 focus:ring-[#00A2D2]/25 focus:border-[#00A2D2] transition-all`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className={`absolute ${
                    isRTL ? "left-2.5" : "right-2.5"
                  } top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-[#6d797f] cursor-pointer`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span
                  className={`absolute ${
                    isRTL ? "left-2.5" : "right-2.5"
                  } top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200/80 text-[#6d797f] font-mono text-[10px] pointer-events-none`}
                >
                  ⌘K
                </span>
              )}
            </div>

            {/* Dynamic Project Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedProjectId === "all"
                    ? "bg-[#00A2D2] text-white shadow-xs"
                    : "bg-[#eff4ff] text-[#3d484f] hover:bg-[#dce9ff]"
                }`}
              >
                {t("all_modules")} ({data.testCases.length})
              </button>
              {visibleProjects.map((proj) => {
                const isSelected = selectedProjectId === String(proj.id);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(
                        isSelected ? "all" : String(proj.id)
                      );
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#00A2D2] text-white shadow-xs"
                        : "bg-[#eff4ff] text-[#3d484f] hover:bg-[#dce9ff]"
                    }`}
                  >
                    <span>{proj.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-white text-[#006685]"
                      }`}
                    >
                      {proj.stats?.total || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* View All Link */}
          <Link
            href="/test-cases"
            className="inline-flex items-center gap-1.5 text-xs text-[#006685] font-bold hover:text-[#00aee0] transition-colors whitespace-nowrap"
          >
            <span>{t("view_all")}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" dir={dir}>
            <thead>
              <tr className="bg-[#eff4ff]/80 text-[#565e74] text-[11px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="py-3 px-4">{t("col_id")}</th>
                <th className="py-3 px-3">{t("col_module")}</th>
                <th className="py-3 px-4">{t("col_scenario")}</th>
                <th className="py-3 px-3">{t("col_priority")}</th>
                <th className="py-3 px-3">{t("col_status")}</th>
                <th className="py-3 px-4">{t("col_tester")}</th>
                <th className="py-3 px-3">{t("col_executed")}</th>
                <th className="py-3 px-4 text-center">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-normal">
              {paginatedTestCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-6 h-6 text-slate-300" />
                      <p className="text-sm font-medium">
                        {isRTL
                          ? "لا توجد حالات اختبار مطابقة للفلاتر المحددة"
                          : "No test cases matched your current filter"}
                      </p>
                      {(searchQuery ||
                        selectedProjectId !== "all" ||
                        selectedUserId !== "all" ||
                        statusFilter !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedProjectId("all");
                            setSelectedUserId("all");
                            setStatusFilter("all");
                            setCurrentPage(1);
                          }}
                          className="text-xs text-[#00A2D2] font-bold hover:underline cursor-pointer"
                        >
                          {isRTL ? "إعادة تعيين الفلاتر" : "Reset filters"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTestCases.map((row) => {
                  const isFailed = row.status === "failed";
                  const displayId =
                    isFailed && row.testId?.startsWith("TC-")
                      ? row.testId.replace(/^TC-/, "BUG-")
                      : row.testId;

                  const pInfo =
                    priorityMap[row.priority] || priorityMap.medium;

                  const statusBadge =
                    row.status === "passed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : row.status === "failed"
                      ? "bg-rose-50 text-rose-700 border-rose-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80";

                  const statusDotColor =
                    row.status === "passed"
                      ? "bg-emerald-500"
                      : row.status === "failed"
                      ? "bg-rose-500"
                      : "bg-amber-500 animate-pulse";

                  const statusLabel =
                    row.status === "passed"
                      ? isRTL
                        ? "ناجح"
                        : "Passed"
                      : row.status === "failed"
                      ? isRTL
                        ? "فاشل"
                        : "Failed"
                      : isRTL
                      ? "قيد الانتظار"
                      : "Pending";

                  const testerName = row.tester?.name || "-";
                  const testerInitials =
                    testerName !== "-"
                      ? testerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "QA";

                  const dateStr =
                    row.executedAt || row.createdAt
                      ? new Date(
                          row.executedAt || row.createdAt
                        ).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "-";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#f8faff] transition-colors group"
                    >
                      {/* TC / BUG ID */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        {isFailed ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDefect(row)}
                            className="text-rose-600 hover:underline cursor-pointer font-bold"
                            title={
                              isRTL
                                ? "عرض تقرير الخلل (Defect Report)"
                                : "View Defect Report"
                            }
                          >
                            {displayId}
                          </button>
                        ) : (
                          <span className="text-[#006685]">{displayId}</span>
                        )}
                      </td>

                      {/* Module / Project */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#eff4ff] text-[#3d484f] border border-slate-200/60">
                          {row.module || row.project?.name || "-"}
                        </span>
                      </td>

                      {/* Scenario Title + Page */}
                      <td className="py-3 px-4 max-w-sm lg:max-w-md">
                        <div className="font-semibold text-[#0b1c30] truncate">
                          {row.scenario}
                        </div>
                        {row.pageName && (
                          <div className="text-[11px] text-[#6d797f] truncate mt-0.5">
                            {row.pageName}
                          </div>
                        )}
                      </td>

                      {/* Priority Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border inline-block ${pInfo.badgeClass}`}
                        >
                          {isRTL ? pInfo.labelAr : pInfo.labelEn}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${statusBadge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`}
                          />
                          {statusLabel}
                        </span>
                      </td>

                      {/* Tester */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#dae2fd] text-[#006685] font-bold text-[10px] flex items-center justify-center ring-1 ring-slate-200">
                            {testerInitials}
                          </div>
                          <span className="font-medium text-[#3d484f]">
                            {testerName}
                          </span>
                        </div>
                      </td>

                      {/* Executed Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-[#6d797f] whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Actions — Eye Icon ONLY for Failed Test Cases */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isFailed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedDefect(row)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors cursor-pointer"
                                title={
                                  isRTL
                                    ? "عرض تقرير الخلل (Defect Report)"
                                    : "View Defect Report"
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/test-cases/email?id=${row.id}`}
                                className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors cursor-pointer"
                                title={
                                  isRTL
                                    ? "إرسال تقرير الخلل عبر Outlook"
                                    : "Send Defect Report via Outlook"
                                }
                              >
                                <Mail className="w-4 h-4" />
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6d797f]">
          <span className="font-medium">
            {isRTL
              ? `عرض ${paginatedTestCases.length} من أصل ${filteredTestCases.length} حالة اختبار`
              : `Showing ${paginatedTestCases.length} of ${filteredTestCases.length} test cases`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
            >
              {t("prev")}
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-[#00A2D2] text-white font-bold text-xs">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Defect Details View Modal (FAILED CASES ONLY) ─────────── */}
      {selectedDefect && selectedDefect.status === "failed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedDefect(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            {/* Defect Header */}
            <div className="flex items-start justify-between border-b border-red-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg ring-4 ring-red-50">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                      {isRTL ? "تقرير خلل برمجي" : "Defect Report"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {selectedDefect.testId.startsWith("TC-")
                        ? selectedDefect.testId.replace(/^TC-/, "BUG-")
                        : selectedDefect.testId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0b1c30] mt-0.5">
                    {isRTL ? "تفاصيل الخلل البرمجي" : "Defect / Bug Details"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDefect(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Defect ID */}
            <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-700 block">
                  {isRTL ? "معرّف الخلل (Defect ID)" : "Defect ID"}
                </span>
                <span className="text-lg font-mono font-black text-red-600 tracking-wider">
                  {selectedDefect.testId.startsWith("TC-")
                    ? selectedDefect.testId.replace(/^TC-/, "BUG-")
                    : selectedDefect.testId}
                </span>
              </div>
              <Badge
                variant="outline"
                className="bg-red-100 text-red-800 border-red-300 font-bold text-xs px-2.5 py-1"
              >
                {isRTL ? "فاشل / خلل" : "Failed / Defect"}
              </Badge>
            </div>

            {/* 2. Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#565e74] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#006685]" />
                <span>{isRTL ? "العنوان (Title):" : "Title:"}</span>
              </label>
              <div className="p-3.5 bg-[#f8f9ff] rounded-xl text-sm font-semibold text-[#0b1c30] leading-relaxed border border-[#e5eeff]">
                {selectedDefect.scenario}
              </div>
            </div>

            {/* 3. Module */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#565e74] flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-[#006685]" />
                <span>
                  {isRTL
                    ? "الوحدة البرمجية / المشروع (Module):"
                    : "Module:"}
                </span>
              </label>
              <div className="p-3 bg-white rounded-xl text-xs font-bold text-[#0b1c30] border border-slate-200 flex items-center justify-between">
                <span>
                  {selectedDefect.module || selectedDefect.project?.name || "-"}
                </span>
                {selectedDefect.pageName && (
                  <span className="text-[11px] text-[#6d797f] font-normal">
                    {isRTL ? "الصفحة: " : "Page: "}
                    {selectedDefect.pageName}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#565e74] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{isRTL ? "الوصف (Description):" : "Description:"}</span>
              </label>
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-[#0b1c30] border border-slate-200 space-y-3 leading-relaxed">
                {selectedDefect.actualResult && (
                  <div>
                    <span className="font-bold text-red-700 block mb-1">
                      {isRTL
                        ? "النتيجة الفعلية / الخلل الملاحظ:"
                        : "Actual Result / Observed Failure:"}
                    </span>
                    <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-red-100">
                      {selectedDefect.actualResult}
                    </p>
                  </div>
                )}
                {selectedDefect.expectedResult && (
                  <div>
                    <span className="font-bold text-emerald-700 block mb-1">
                      {isRTL ? "النتيجة المتوقعة:" : "Expected Behavior:"}
                    </span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-emerald-100">
                      {selectedDefect.expectedResult}
                    </p>
                  </div>
                )}
                {Array.isArray(selectedDefect.steps) &&
                  selectedDefect.steps.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-700 block mb-1.5">
                        {isRTL
                          ? "خطوات إعادة الإنتاج (Steps to Reproduce):"
                          : "Steps to Reproduce:"}
                      </span>
                      <div className="space-y-1.5">
                        {selectedDefect.steps.map((st, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100"
                          >
                            <span className="w-4 h-4 rounded bg-red-100 text-red-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-slate-700">{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* 5. Severity, 6. Priority, 7. Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-red-50/40 border border-red-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-red-700 block">
                  {isRTL ? "درجة الخطورة (Severity)" : "Severity"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-1 font-bold ${
                    severityMap[selectedDefect.severity || "medium"]
                      ?.badgeClass ||
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isRTL
                    ? severityMap[selectedDefect.severity || "medium"]
                        ?.labelAr || "متوسطة"
                    : severityMap[selectedDefect.severity || "medium"]
                        ?.labelEn || "Medium"}
                </Badge>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-[#565e74] block">
                  {isRTL ? "الأولوية (Priority)" : "Priority"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-1 font-bold ${
                    priorityMap[selectedDefect.priority]?.badgeClass || ""
                  }`}
                >
                  {isRTL
                    ? priorityMap[selectedDefect.priority]?.labelAr
                    : priorityMap[selectedDefect.priority]?.labelEn}
                </Badge>
              </div>

              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-red-700 block">
                  {isRTL ? "الحالة (Status)" : "Status"}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs px-2.5 py-1 font-bold bg-red-50 text-red-700 border-red-200 flex items-center gap-1.5 w-fit"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>{isRTL ? "فاشل" : "Failed"}</span>
                </Badge>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <Link
                href={`/test-cases/email?id=${selectedDefect.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>
                  {isRTL
                    ? "إرسال تقرير الخلل عبر Outlook"
                    : "Send Defect Report (Outlook)"}
                </span>
              </Link>
              <Button
                variant="outline"
                onClick={() => setSelectedDefect(null)}
                className="rounded-xl text-xs font-bold px-5 cursor-pointer"
              >
                {isRTL ? "إغلاق" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
