"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowLeft, Home, Compass, Globe } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const { lang, dir, setLanguage, t } = useLanguage();
  const isRTL = dir === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f9ff] px-4 selection:bg-[#00A2D2] selection:text-white overflow-hidden"
    >
      {/* Floating Language Switcher */}
      <div
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          direction: "ltr",
        }}
        className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-lg border border-slate-200/90"
      >
        <Globe className="w-4 h-4 text-[#00A2D2] mx-1 shrink-0" />
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            lang === "en"
              ? "bg-[#00A2D2] text-white shadow-xs"
              : "text-[#565e74] hover:text-[#0b1c30] hover:bg-slate-100"
          )}
        >
          English (EN)
        </button>
        <button
          type="button"
          onClick={() => setLanguage("ar")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-[family-name:var(--font-almarai),sans-serif]",
            lang === "ar"
              ? "bg-[#00A2D2] text-white shadow-xs"
              : "text-[#565e74] hover:text-[#0b1c30] hover:bg-slate-100"
          )}
        >
          العربية (AR)
        </button>
      </div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00A2D2]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#00A2D2]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main 404 Card */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center p-8 sm:p-11 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)]">
        {/* Ministry Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="MCIT"
            width={190}
            height={54}
            className="h-12 sm:h-14 w-auto object-contain drop-shadow-xs"
            priority
          />
        </div>

        {/* 404 Display */}
        <div className="relative flex items-center justify-center my-3">
          <span className="text-8xl sm:text-9xl font-black text-slate-100 select-none tracking-widest">
            {t("not_found_code")}
          </span>
          <div className="absolute flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#e5eeff] flex items-center justify-center text-[#00A2D2] shadow-xs ring-1 ring-[#00A2D2]/20">
              <Compass className="w-8 h-8 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Titles & Message */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] mt-3 mb-2.5 font-[family-name:var(--font-almarai),sans-serif]">
          {t("not_found_title")}
        </h1>
        <p className="text-sm text-[#6d797f] max-w-sm mx-auto leading-relaxed mb-8">
          {t("not_found_desc")}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] transition-all shadow-[0_4px_14px_0_rgba(0,162,210,0.35)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.45)] active:scale-[0.99] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t("not_found_back_dashboard")}</span>
          </Link>
          <Link
            href="/test-cases"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-[#0b1c30] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span>{t("not_found_test_cases")}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
