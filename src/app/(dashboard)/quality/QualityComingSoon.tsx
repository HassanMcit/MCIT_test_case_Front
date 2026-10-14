"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/language-context";
import {
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Activity,
  Layers,
  Lock,
} from "lucide-react";

export default function QualityComingSoon() {
  const { lang, dir } = useLanguage();
  const isRTL = dir === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8"
      dir={dir}
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-10 text-center space-y-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00A2D2]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#006685]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#eff4ff] text-[#006685] border border-[#bfe9ff]">
          <Sparkles className="w-3.5 h-3.5 text-[#00A2D2] animate-pulse" />
          <span>{isRTL ? "مبادرة التحول الرقمي • MCIT Quality Operations" : "MCIT Quality Operations"}</span>
        </div>

        {/* Big Animated Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-linear-to-tr from-[#006685] to-[#00A2D2] p-1 shadow-lg shadow-[#00A2D2]/20 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center">
            <div className="relative">
              <ShieldCheck className="w-12 h-12 text-[#006685]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00A2D2] ring-4 ring-white flex items-center justify-center">
                <Lock className="w-2.5 h-2.5 text-white" />
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider bg-amber-100 text-amber-800 uppercase">
            {isRTL ? "قريباً جداً • Coming Soon" : "Coming Soon"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">
            {isRTL ? "مراقبة جودة تطبيقات وأنظمة الوزارة" : "Quality Assurance & Application Portfolios"}
          </h1>
          <p className="text-xs sm:text-sm text-[#565e74] max-w-lg mx-auto leading-relaxed">
            {isRTL
              ? "هذه الصفحة قيد التجهيز والتدقيق النهائي حالياً من قِبل فريق إدارة الجودة، وسيتم إطلاقها لجميع فرق العمل والمختبرين قريباً."
              : "This module is currently undergoing final quality audit and preparation by the QA team. It will be launched to all teams shortly."}
          </p>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-start">
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-slate-100 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#006685] flex items-center justify-center mb-1.5">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#0b1c30]">
              {isRTL ? "16 تطبيقاً وزارياً" : "16 Monitored Apps"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isRTL ? "متابعة شاملة لكافة أنظمة التحول الرقمي" : "Holistic coverage across platforms"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-slate-100 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#0b1c30]">
              {isRTL ? "فحص الوظائف الحي" : "Functions Checklist"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isRTL ? "تحقق فوري من توفر واستقرار كل وظيفة" : "Real-time verify up/down & features"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-slate-100 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#0b1c30]">
              {isRTL ? "مؤشر الاستقرار" : "Stability Calculator"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isRTL ? "حساب أوتوماتيكي لنسبة الأداء والاستقرار" : "Auto-computed stability score"}
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#006685] hover:bg-[#00516a] active:scale-[0.99] shadow-[0_4px_14px_0_rgba(0,102,133,0.3)] transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{isRTL ? "العودة للوحة المؤشرات الرئيسية" : "Back to Dashboard"}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
