"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Globe, ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

import { GeometricBackground } from "@/components/geometric-background";

/* ─── Forget Password Form ───────────────────────────────────────────── */
export function ForgetPasswordForm() {
  const { lang, dir, setLanguage, t } = useLanguage();
  const isRTL = dir === "rtl";
  const [email, setEmail] = useState("");

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Design only as requested
  };

  return (
    <div
      dir={dir}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#F8FAFC] bg-grid-pattern selection:bg-[#00C3F3] selection:text-white"
    >
      <GeometricBackground />

      {/* Floating Language Switcher - Fixed Top Right */}
      <div
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          direction: "ltr",
        }}
        className="flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-full p-1 text-xs"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer",
            lang === "en"
              ? "bg-[#00C3F3] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          English (EN)
        </button>
        <button
          type="button"
          onClick={() => setLanguage("ar")}
          className={cn(
            "px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer",
            lang === "ar"
              ? "bg-[#00C3F3] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          العربية (AR)
        </button>
      </div>

      <main className="relative z-10 w-105 max-w-[92vw]">
        <Card className="shadow-[0_10px_30px_-5px_rgba(15,23,42,0.06),0_20px_40px_-15px_rgba(0,195,243,0.07)] border-slate-100 rounded-2xl p-2 sm:p-4 bg-white/95 backdrop-blur-sm">
          <CardHeader className="items-center text-center gap-2 pb-0">
            {/* Ministry logo */}
            <div className="flex justify-center mb-2">
              <Image
                src="/logo.png"
                alt="التحول الرقمي - الإدارة المركزية لنظم المعلومات"
                width={200}
                height={56}
                className="h-14 sm:h-16 w-auto max-w-60 object-contain drop-shadow-sm"
                priority
              />
            </div>

            {/* Icon decoration */}
            <div className="w-12 h-12 rounded-2xl bg-[#e5eeff] flex items-center justify-center mb-1 text-[#38CAF0] shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>

            <CardTitle className="text-[#1E293B] text-[20px] sm:text-[22px] font-extrabold leading-snug font-[family-name:var(--font-almarai),sans-serif]">
              {t("fp_title")}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium tracking-wide max-w-xs">
              {t("fp_subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("fp_email_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    dir={isRTL ? "rtl" : "ltr"}
                    placeholder={t("fp_email_placeholder")}
                    required
                    className={cn(
                      "h-12 text-sm text-slate-800 rounded-xl transition-all",
                      isRTL
                        ? "pr-11 pl-4 text-right placeholder:text-right"
                        : "pl-11 pr-4 text-left placeholder:text-left",
                      "border-[#E2E8F0] focus-visible:border-[#00C3F3] focus-visible:ring-[#00C3F3]/15",
                      "placeholder:text-slate-400"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    )}
                  >
                    <Mail className="w-5 h-5" strokeWidth={1.6} />
                  </span>
                </div>
              </div>

              {/* Get Verified Code Button */}
              <Button
                type="submit"
                className={cn(
                  "w-full cursor-pointer h-12 mt-1 rounded-[10px] text-base font-bold text-white",
                  "bg-[#00C3F3] hover:bg-[#00ade1] active:scale-[0.99]",
                  "shadow-[0_4px_14px_0_rgba(0,195,243,0.35)] hover:shadow-[0_6px_20px_rgba(0,195,243,0.45)]",
                  "transition-all duration-200"
                )}
              >
                get verfied Code
              </Button>

              {/* Back to Login Link */}
              <div className="flex justify-center pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-xs font-semibold text-[#38CAF0] hover:text-[#00C3F3] transition-colors"
                >
                  <BackArrow className="w-3.5 h-3.5" />
                  <span>{t("fp_back_to_login")}</span>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
