"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import {
  SlidersHorizontal,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  Play,
  Eye,
  MoreVertical,
  Bug,
  LineChart,
  Check,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { lang, t, dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [activeModule, setActiveModule] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{
    day: string;
    p: number;
    f: number;
    pe: number;
    total: number;
    x: number;
  } | null>(null);

  // Dynamic calculations based on current test execution data
  const totalTests = 1420;
  const passedTests = 1180;
  const failedTests = 145;
  const pendingTests = 95;

  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  const passedPercent = ((passedTests / totalTests) * 100).toFixed(1);
  const failedPercent = ((failedTests / totalTests) * 100).toFixed(1);
  const pendingPercent = ((pendingTests / totalTests) * 100).toFixed(1);

  const modules = [
    { id: "all", label: t("all_modules") },
    { id: "auth", label: t("module_auth") },
    { id: "payments", label: t("module_payments") },
    { id: "civil", label: t("module_civil") },
    { id: "profile", label: t("module_profile") },
  ];

  const testCasesData = [
    {
      id: "TC-8492",
      module: lang === "ar" ? "المصادقة" : "Authentication",
      title:
        lang === "ar"
          ? "التحقق من صحة توكن الدخول الموحد (SSO) عبر الرسائل النصية"
          : "Portal SSO Token Validation via SMS 2FA Gateway",
      subtext:
        lang === "ar"
          ? "اختبار تراجعي • مؤتمت بواسطة Playwright • معرف: #auth-sec-otp"
          : "Regression • Automated Playwright • ID: #auth-sec-otp",
      priority: lang === "ar" ? "حرجة" : "Critical",
      priorityType: "critical",
      status: lang === "ar" ? "ناجح" : "Passed",
      statusType: "passed",
      tester: lang === "ar" ? "أحمد الشناوي" : "Ahmed El-Shenawy",
      testerInitials: "AS",
      date: "Oct 24, 14:20",
    },
    {
      id: "TC-8493",
      module: lang === "ar" ? "المدفوعات" : "Payments",
      title:
        lang === "ar"
          ? "اختبار مهلة معالجة معاملات بوابة سداد والدفع الإلكتروني"
          : "Payment Gateway Transaction Timeout & Auto-Reversal",
      subtext:
        lang === "ar"
          ? "بوابة الدفع • محاكاة تأخر الاستجابة عبر Chaos Mesh"
          : "Payment Gateway • Chaos Mesh simulated latency",
      priority: lang === "ar" ? "عالية" : "High",
      priorityType: "high",
      status: lang === "ar" ? "راسب" : "Failed",
      statusType: "failed",
      tester: lang === "ar" ? "سارة فؤاد" : "Sara Fouad",
      testerInitials: "SF",
      date: "Oct 24, 13:45",
    },
    {
      id: "TC-8494",
      module: lang === "ar" ? "السجل المدني" : "Civil Registry",
      title:
        lang === "ar"
          ? "التحقق من عدم تكرار قيد الرقم القومي في قاعدة البيانات الموحدة"
          : "Citizen National ID Duplicate Record Constraint Trigger",
      subtext:
        lang === "ar"
          ? "تكامل الخدمات • اختبار واجهات برمجة التطبيقات REST Assured"
          : "Integration • REST Assured • Egyptian ID Verifier v2",
      priority: lang === "ar" ? "حرجة" : "Critical",
      priorityType: "critical",
      status: lang === "ar" ? "ناجح" : "Passed",
      statusType: "passed",
      tester: lang === "ar" ? "محمود حسن" : "Mahmoud Hassan",
      testerInitials: "MH",
      date: "Oct 24, 11:15",
    },
    {
      id: "TC-8495",
      module: lang === "ar" ? "الملف الشخصي" : "Profile",
      title:
        lang === "ar"
          ? "قيود رفع صور المستندات الشخصية بأحجام أكبر من 10MB"
          : "User Profile Image Upload Size Limit & Format Check",
      subtext:
        lang === "ar"
          ? "واجهة المستخدم • فحص توافق التنسيقات وامتدادات الصور"
          : "Localization UI • Visual Regression Puppeteer",
      priority: lang === "ar" ? "متوسطة" : "Medium",
      priorityType: "medium",
      status: lang === "ar" ? "معلق" : "Pending",
      statusType: "pending",
      tester: lang === "ar" ? "منى زكي" : "Mona Zaki",
      testerInitials: "MZ",
      date: "Oct 23, 17:30",
    },
    {
      id: "TC-8496",
      module: lang === "ar" ? "المصادقة" : "Authentication",
      title:
        lang === "ar"
          ? "اختبار سرعة استلام كود OTP الفوري في ساعات الذروة"
          : "Real-time SMS OTP Delivery Latency Under High Load",
      subtext:
        lang === "ar"
          ? "أداء الشبكة • محاكاة 5000 طلب متزامن في الثانية"
          : "Security • Redis Token Revocation test",
      priority: lang === "ar" ? "منخفضة" : "Low",
      priorityType: "low",
      status: lang === "ar" ? "ناجح" : "Passed",
      statusType: "passed",
      tester: lang === "ar" ? "خالد العمري" : "Khaled El-Amry",
      testerInitials: "KA",
      date: "Oct 23, 16:10",
    },
  ];

  // Search & module filtering
  const filteredTestCases = testCasesData.filter((tc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      tc.id.toLowerCase().includes(q) ||
      tc.title.toLowerCase().includes(q) ||
      tc.module.toLowerCase().includes(q) ||
      tc.tester.toLowerCase().includes(q);

    const matchModule =
      activeModule === "all" ||
      (activeModule === "auth" &&
        (tc.module === "Authentication" || tc.module === "المصادقة")) ||
      (activeModule === "payments" &&
        (tc.module === "Payments" || tc.module === "المدفوعات")) ||
      (activeModule === "civil" &&
        (tc.module === "Civil Registry" || tc.module === "السجل المدني")) ||
      (activeModule === "profile" &&
        (tc.module === "Profile" || tc.module === "الملف الشخصي"));

    return matchSearch && matchModule;
  });

  const trendData = [
    { day: "Oct 11", dayAr: "11 أكتوبر", x: 52, p: 60, f: 10, pe: 6 },
    { day: "Oct 12", dayAr: "12 أكتوبر", x: 102, p: 67, f: 10, pe: 6 },
    { day: "Oct 13", dayAr: "13 أكتوبر", x: 152, p: 77, f: 10, pe: 4 },
    { day: "Oct 14", dayAr: "14 أكتوبر", x: 202, p: 71, f: 12, pe: 6 },
    { day: "Oct 15", dayAr: "15 أكتوبر", x: 252, p: 85, f: 12, pe: 6 },
    { day: "Oct 16", dayAr: "16 أكتوبر", x: 302, p: 93, f: 10, pe: 6 },
    { day: "Oct 17", dayAr: "17 أكتوبر", x: 352, p: 103, f: 10, pe: 4 },
    { day: "Oct 18", dayAr: "18 أكتوبر", x: 402, p: 97, f: 12, pe: 6 },
    { day: "Oct 19", dayAr: "19 أكتوبر", x: 452, p: 107, f: 12, pe: 6 },
    { day: "Oct 20", dayAr: "20 أكتوبر", x: 502, p: 115, f: 10, pe: 4 },
    { day: "Oct 21", dayAr: "21 أكتوبر", x: 552, p: 120, f: 10, pe: 6 },
    { day: "Oct 22", dayAr: "22 أكتوبر", x: 602, p: 127, f: 9, pe: 4 },
    { day: "Oct 23", dayAr: "23 أكتوبر", x: 652, p: 131, f: 9, pe: 4 },
    { day: "Today", dayAr: "اليوم", x: 702, p: 137, f: 8, pe: 4, isToday: true },
  ];

  const handleTriggerRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 1200);
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
              Active Sprint • v2.4.1-rc3
            </span>
            <span className="font-mono text-xs text-[#6d797f] hidden sm:inline">
              • Cairo Sync Zone
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b1c30]">
            {t("dashboard_title")}
          </h1>
          <p className="text-sm text-[#565e74] mt-1 font-normal">
            {t("dashboard_subtitle")}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sprint Filter Dropdown */}
          <div className="inline-flex items-center gap-2 bg-white shadow-xs rounded-xl px-3.5 py-2 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all border border-slate-200/80 text-xs font-medium text-[#0b1c30]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#006685]" />
            <span className="font-semibold text-[#0b1c30]">Sprint 14</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#565e74]">
              {isRTL ? "آخر 30 يوماً" : "Last 30 Days"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6d797f]" />
          </div>

          {/* Trigger Run Button */}
          <button
            type="button"
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0b1c30] text-xs font-semibold shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all border border-slate-200/80 disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#565e74] ${
                isRunning ? "animate-spin text-[#006685]" : ""
              }`}
            />
            <span>{isRunning ? (isRTL ? "جاري التشغيل..." : "Running...") : t("trigger_run")}</span>
          </button>

          {/* New Test Case Button */}
          <Link
            href="/add"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00aee0] hover:bg-[#009ac7] text-white text-xs font-bold shadow-xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
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
              <span className="inline-flex items-center gap-0.5 text-[#006c49] font-bold bg-[#6ffbbe]/25 px-1.5 py-0.5 rounded text-[11px]">
                <TrendingUp className="w-3 h-3" />
                +12%
              </span>
              <span className="text-[#6d797f] text-[11px] font-medium">
                {t("from_last_cycle")}
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
            <div className="absolute flex items-center justify-center text-[#006685]">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Visual Analytics (70% / 30% Desktop Grid) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Execution Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/70 flex flex-col justify-between">
          <div>
            {/* Header + Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 gap-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[#006685]" />
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
                  <span className="text-[#3d484f]">{t("passed")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                  <span className="text-[#3d484f]">{t("failed")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#bec6e0]" />
                  <span className="text-[#3d484f]">{t("pending")}</span>
                </div>
              </div>
            </div>

            {/* Hover Tooltip Info Bar */}
            <div className="h-6 mt-2 flex items-center text-xs">
              {hoveredBar ? (
                <div className="flex items-center gap-3 font-medium text-[#0b1c30] bg-[#eff4ff] px-2.5 py-0.5 rounded-lg border border-[#00aee0]/30 animate-in fade-in duration-150">
                  <span className="font-bold text-[#006685]">{hoveredBar.day}:</span>
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
                    ({Math.round((hoveredBar.p / hoveredBar.total) * 100)}% Pass)
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
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
                {/* Horizontal Dashed Grid Lines */}
                <line stroke="#F1F5F9" strokeDasharray="3,3" strokeWidth="1" x1="35" x2="750" y1="20" y2="20" />
                <line stroke="#F1F5F9" strokeDasharray="3,3" strokeWidth="1" x1="35" x2="750" y1="65" y2="65" />
                <line stroke="#F1F5F9" strokeDasharray="3,3" strokeWidth="1" x1="35" x2="750" y1="110" y2="110" />
                <line stroke="#F1F5F9" strokeDasharray="3,3" strokeWidth="1" x1="35" x2="750" y1="155" y2="155" />
                <line stroke="#E2E8F0" strokeWidth="1.2" x1="35" x2="750" y1="185" y2="185" />

                {/* Y-Axis Labels */}
                <text className="text-[10px] font-mono" fill="#94A3B8" x="5" y="24">150</text>
                <text className="text-[10px] font-mono" fill="#94A3B8" x="5" y="69">100</text>
                <text className="text-[10px] font-mono" fill="#94A3B8" x="5" y="114">60</text>
                <text className="text-[10px] font-mono" fill="#94A3B8" x="5" y="159">20</text>
                <text className="text-[10px] font-mono" fill="#94A3B8" x="12" y="189">0</text>

                {/* 14 Daily Stacked Bars */}
                {trendData.map((bar) => {
                  const yBase = 185;
                  const yP = yBase - bar.p;
                  const yF = yP - bar.f;
                  const yPe = yF - bar.pe;
                  const total = bar.p + bar.f + bar.pe;
                  const isHovered = hoveredBar?.day === bar.day;

                  return (
                    <g
                      key={bar.day}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() =>
                        setHoveredBar({
                          day: isRTL ? bar.dayAr : bar.day,
                          p: bar.p,
                          f: bar.f,
                          pe: bar.pe,
                          total,
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

                      {/* Stacked bars: Passed (Green), Failed (Red), Pending (Slate) */}
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

                      {/* X-Axis day label */}
                      <text
                        className={`text-[10px] font-mono ${
                          bar.isToday || isHovered ? "font-bold" : ""
                        }`}
                        fill={bar.isToday ? "#006685" : isHovered ? "#0b1c30" : "#64748B"}
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
              {t("mean_runtime")}
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
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 font-bold text-[#006685] border border-slate-200/60">
                {t("open_defects")}
              </span>
            </div>
            <p className="text-xs text-[#6d797f] mt-2 mb-4">
              {t("defect_subtitle")}
            </p>

            {/* Severity Bars List */}
            <div className="flex flex-col gap-4">
              {/* 1. Critical */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-rose-200 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                    <span className="font-bold text-[#0b1c30]">{t("critical")}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#ba1a1a] text-sm">12</span>
                    <span className="text-[#6d797f] text-[11px]">(8.2%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: "8.2%" }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#6d797f]">
                  <span>Resolution SLA: &lt; 4 hrs</span>
                  <span className="text-[#006c49] font-bold">
                    {isRTL ? "9 قيد الفرز" : "9 in triage"}
                  </span>
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
                    <span className="font-extrabold text-[#0b1c30] text-sm">24</span>
                    <span className="text-[#6d797f] text-[11px]">(16.5%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#00aee0] h-full rounded-full" style={{ width: "16.5%" }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#6d797f]">
                  <span>Resolution SLA: &lt; 24 hrs</span>
                  <span className="text-[#565e74] font-bold">
                    {isRTL ? "18 تم إسنادها" : "18 assigned"}
                  </span>
                </div>
              </div>

              {/* 3. Medium */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#565e74]" />
                    <span className="font-bold text-[#0b1c30]">{t("medium")}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-extrabold text-[#0b1c30] text-sm">48</span>
                    <span className="text-[#6d797f] text-[11px]">(33.1%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#565e74] h-full rounded-full" style={{ width: "33.1%" }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#6d797f]">
                  <span>Resolution SLA: Sprint End</span>
                  <span className="text-[#6d797f] font-bold">
                    {isRTL ? "32 في قائمة الانتظار" : "32 in backlog"}
                  </span>
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
                    <span className="font-extrabold text-[#0b1c30] text-sm">61</span>
                    <span className="text-[#6d797f] text-[11px]">(42.2%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#6d797f] h-full rounded-full" style={{ width: "42.2%" }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#6d797f]">
                  <span>{isRTL ? "تجميلية / نصوص ثانوية" : "Cosmetic / Minor Copy"}</span>
                  <span className="text-[#6d797f] font-bold">
                    {isRTL ? "50 تم التحقق منها" : "50 verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Jira / Matrix CTA Button */}
          <button
            type="button"
            className="w-full mt-4 py-2.5 px-3 rounded-xl bg-[#eff4ff] text-[#006685] hover:bg-[#dce9ff] text-xs font-bold flex items-center justify-center gap-2 border border-[#00aee0]/20 hover:border-[#00aee0]/40 transition-all active:scale-[0.98]"
          >
            <span>{t("explore_jira")}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Section 4: High-Density Test Cases Data Table ────────── */}
      <div className="bg-white rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/70">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input Bar with ⌘K Badge */}
            <div className="relative w-full max-w-sm">
              <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-[#6d797f] w-4 h-4 pointer-events-none`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className={`w-full ${
                  isRTL ? "pr-9 pl-16" : "pl-9 pr-16"
                } py-2 rounded-xl bg-[#f8f9ff] text-[#0b1c30] text-xs font-medium border border-slate-200/80 placeholder:text-[#6d797f] focus:outline-none focus:ring-2 focus:ring-[#00aee0]/30 focus:border-[#00aee0] transition-all`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`absolute ${isRTL ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-[#6d797f]`}
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

            {/* Module Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {modules.map((m) => {
                const isSelected = activeModule === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveModule(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-[#00aee0] text-white shadow-xs"
                        : "bg-[#eff4ff] text-[#3d484f] hover:bg-[#dce9ff]"
                    }`}
                  >
                    {m.label}
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
              {filteredTestCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-6 h-6 text-slate-300" />
                      <p className="text-sm font-medium">
                        {isRTL ? "لا توجد نتائج مطابقة لبحثك" : "No test cases matched your filter"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveModule("all");
                        }}
                        className="text-xs text-[#006685] font-bold hover:underline"
                      >
                        {isRTL ? "إعادة تعيين الفلاتر" : "Reset filters"}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTestCases.map((row) => {
                  // Priority badge styles
                  const priorityBadge =
                    row.priorityType === "critical"
                      ? "bg-rose-50 text-rose-700 border-rose-200/80"
                      : row.priorityType === "high"
                      ? "bg-sky-50 text-sky-700 border-sky-200/80"
                      : row.priorityType === "medium"
                      ? "bg-amber-50 text-amber-700 border-amber-200/80"
                      : "bg-slate-50 text-slate-700 border-slate-200/80";

                  // Status badge styles
                  const statusBadge =
                    row.statusType === "passed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : row.statusType === "failed"
                      ? "bg-rose-50 text-rose-700 border-rose-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80";

                  const statusDotColor =
                    row.statusType === "passed"
                      ? "bg-emerald-500"
                      : row.statusType === "failed"
                      ? "bg-rose-500"
                      : "bg-amber-500 animate-pulse";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#f8faff] transition-colors group"
                    >
                      {/* TC ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[#006685]">
                        <span className="hover:underline cursor-pointer">
                          {row.id}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#eff4ff] text-[#3d484f] border border-slate-200/60">
                          {row.module}
                        </span>
                      </td>

                      {/* Scenario Title + Subtext */}
                      <td className="py-3 px-4 max-w-sm lg:max-w-md">
                        <div className="font-semibold text-[#0b1c30] truncate">
                          {row.title}
                        </div>
                        <div className="text-[11px] text-[#6d797f] truncate mt-0.5">
                          {row.subtext}
                        </div>
                      </td>

                      {/* Priority Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border inline-block ${priorityBadge}`}
                        >
                          {row.priority}
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
                          {row.status}
                        </span>
                      </td>

                      {/* Tester */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#dae2fd] text-[#006685] font-bold text-[10px] flex items-center justify-center ring-1 ring-slate-200">
                            {row.testerInitials}
                          </div>
                          <span className="font-medium text-[#3d484f]">
                            {row.tester}
                          </span>
                        </div>
                      </td>

                      {/* Executed Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-[#6d797f] whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#006685] transition-colors"
                            title="Run Test"
                          >
                            <Play className="w-3.5 h-3.5 fill-[#006685]" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#3d484f] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#6d797f] transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
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
            {t("showing_text")} •{" "}
            <span className="text-[#006685] font-semibold">
              {isRTL ? "مصفاة حسب سبرنت 14" : "Filtered by Sprint 14"}
            </span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#3d484f] font-medium opacity-50 cursor-not-allowed text-xs"
            >
              {t("prev")}
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-[#00aee0] text-white font-bold flex items-center justify-center text-xs shadow-2xs"
            >
              1
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-lg hover:bg-[#eff4ff] text-[#0b1c30] font-medium flex items-center justify-center text-xs transition-colors"
            >
              2
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-lg hover:bg-[#eff4ff] text-[#0b1c30] font-medium flex items-center justify-center text-xs transition-colors"
            >
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button
              type="button"
              className="w-7 h-7 rounded-lg hover:bg-[#eff4ff] text-[#0b1c30] font-medium flex items-center justify-center text-xs transition-colors"
            >
              284
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] font-medium text-xs transition-colors"
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
