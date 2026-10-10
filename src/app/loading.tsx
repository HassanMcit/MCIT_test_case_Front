"use client";

import Image from "next/image";
import { useLanguage } from "@/context/language-context";

export default function Loading() {
  const { dir, t } = useLanguage();
  const isRTL = dir === "rtl";

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8f9ff]/85 backdrop-blur-md transition-all selection:bg-[#00A2D2] selection:text-white"
    >
      <div className="relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-3xl bg-white/95 shadow-[0_15px_40px_-5px_rgba(0,162,210,0.18)] border border-slate-100 max-w-sm w-[90%] text-center">
        {/* Animated Glow */}
        <div className="absolute -top-12 -bottom-12 -left-12 -right-12 bg-gradient-to-tr from-[#00A2D2]/15 via-[#00A2D2]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Ministry Logo */}
        <div className="relative w-48 h-14 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="MCIT Logo"
            width={190}
            height={52}
            className="object-contain drop-shadow-xs"
            priority
          />
        </div>

        {/* Dual-ring High-Tech Spinner */}
        <div className="relative w-14 h-14 flex items-center justify-center my-1">
          <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-200" />
          <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-[#00A2D2] border-r-[#00A2D2] animate-spin" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#00A2D2] animate-pulse shadow-[0_0_12px_rgba(0,162,210,0.6)]" />
        </div>

        {/* Loading text based on site language */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-base font-bold text-[#0b1c30]">
            {t("loading_text")}
          </span>
          <span className="text-xs text-[#6d797f] font-medium tracking-wide">
            {t("loading_subtext")}
          </span>
        </div>
      </div>
    </div>
  );
}
