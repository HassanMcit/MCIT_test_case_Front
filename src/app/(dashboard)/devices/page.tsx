"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck, ShieldAlert, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import LoginSessionsSection from "../users/LoginSessionsSection";

export default function DevicesSecurityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

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
            ? "هذه الصفحة مخصصة لمدير النظام الرئيسي (Hassan Ali) فقط لمراقبة أمان الجلسات والأجهزة المسجلة."
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
              {isRTL ? "مراقبة الأجهزة والأمان" : "Security & Devices"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              {isRTL ? "سجل تسجيل الدخول ومراقبة الأجهزة" : "Device Telemetry & Login Sessions"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            {isRTL
              ? "عرض بيانات أجهزة الدخول (عنوان الـ IP، معرّف الجهاز/MAC، الموقع الجغرافي، ونظام التشغيل والمتصفح) مع إمكانية إنهاء أي جلسة عن بُعد فورياً."
              : "Private administrator dashboard for inspecting client login telemetry and revoking active device sessions."}
          </p>
        </div>
      </div>

      {/* ── Sessions & Devices Standalone Table ───────────── */}
      <LoginSessionsSection currentUserId={Number(userId || 1)} />
    </div>
  );
}
