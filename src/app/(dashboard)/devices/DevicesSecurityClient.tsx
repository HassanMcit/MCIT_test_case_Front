"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  ArrowLeft,
  Activity,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import LoginSessionsSection from "../users/LoginSessionsSection";
import AuditLogsTable from "./AuditLogsTable";

export default function DevicesSecurityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [activeTab, setActiveTab] = useState<"audit_logs" | "sessions">("audit_logs");

  if (status === "loading") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Strictly check that this page is accessible ONLY by Hassan Ali
  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  const userId = String(session?.user?.id || "");
  const isHassan =
    userEmail === "h.ali@mcit.gov.eg" ||
    userId === "1" ||
    (session?.user?.role === "admin" && userEmail.startsWith("h.ali"));

  if (!isHassan) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0b1c30] mb-2">
          {isRTL ? "غير مصرح بالدخول" : "Access Restricted"}
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {isRTL
            ? "هذه الصفحة مخصصة لمدير النظام الرئيسي (Hassan Ali) فقط لمراقبة أمان الجلسات وسجل تدقيق العمليات والأجهزة المسجلة."
            : "This security audit page is strictly restricted to the primary system administrator."}
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="h-10 px-5 rounded-xl bg-[#006685] hover:bg-[#00aee0] text-white text-xs font-bold gap-2 cursor-pointer"
        >
          <BackArrow className="w-4 h-4" />
          <span>{isRTL ? "العودة للوحة المؤشرات" : "Back to Dashboard"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* ── Breadcrumb & Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isRTL ? "لوحة المؤشرات" : "Dashboard"}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-indigo-600">
              {isRTL ? "مراقبة العمليات والأجهزة" : "Security & Audit"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              {isRTL ? "سجل العمليات والرقابة الأمنية للأجهزة" : "Audit Trail & Device Telemetry"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            {isRTL
              ? "متابعة لحظية وشاملة لكل عملية وإجراء يتم على النظام (إضافة، تعديل، حذف، تسجيل دخول) مع تسجيل عنوان الـ IP، معرّف الجهاز (MAC)، الموقع الجغرافي، ونظام التشغيل."
              : "Real-time enterprise audit trail tracking every user action with client IP, hardware MAC address, geographical location, and browser telemetry."}
          </p>
        </div>

        {/* Action / Back to Dash */}
        <div className="shrink-0">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="h-9 px-3.5 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 gap-1.5 hover:bg-slate-50 cursor-pointer"
          >
            <BackArrow className="w-4 h-4" />
            <span>{isRTL ? "اللوحة الرئيسية" : "Dashboard"}</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("audit_logs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "audit_logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isRTL ? "سجل تدقيق الأنشطة والعمليات" : "Activity Audit Log"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "sessions"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>{isRTL ? "جلسات تسجيل الدخول والأجهزة" : "Login Sessions & Devices"}</span>
        </button>
      </div>

      {/* ── Active Tab Content ────────────────────────────── */}
      {activeTab === "audit_logs" ? (
        <AuditLogsTable />
      ) : (
        <LoginSessionsSection currentUserId={Number(userId || 1)} />
      )}
    </div>
  );
}
