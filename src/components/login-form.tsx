"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Globe } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { LoginSchemaType } from "@/app/login/login.interface";
import { zodResolver } from "@hookform/resolvers/zod";
import { getLoginSchema } from "@/app/login/login.zod";
import { sendUserLogin } from "@/app/login/login.services";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/language-context";
import { signIn } from "next-auth/react";
import { GeometricBackground } from "@/components/geometric-background";

/* ─── Login Form Inner Component ─────────────────────────────────────── */
function LoginFormInner() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { lang, setLanguage, dir, t } = useLanguage();
  const isRTL = dir === "rtl";

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "all",
    resolver: zodResolver(getLoginSchema(t)),
  });

  

  function handleUserLogin(data: LoginSchemaType) {
    async function loginResponse() {
      const res = await signIn('credentials', {...data, redirect: false, redirectTo: '/dashboard'})
      // console.log(res)
      
      if(!res.error) {
        return true
      }
throw new Error("Incorrect Email or Password");
     }
     

    toast.promise(loginResponse, {
      loading: t("login_loading"),
      success: (_) => {
         router.refresh(); 

         setTimeout(() => {
            router.push("/dashboard");
          }, 100);
        return (
          <h1 className="text-green-500 font-bold">{t("login_success")}</h1>
        );
      },
      error: (err) =>  <h1 className="text-red-500 font-bold" >{err.message}</h1>,
    });
  }

  return (
    <div
      dir={dir}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#F8FAFC] bg-grid-pattern selection:bg-[#00C3F3] selection:text-white"
    >
      <GeometricBackground />

      {/* ── Language Switcher Fixed at Top-Right of the Screen ───────── */}
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
        <Globe className="w-4 h-4 text-[#0096cc] mx-1 shrink-0" />
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

            <CardTitle className="text-[#1E293B] text-[20px] sm:text-[22px] font-extrabold leading-snug font-[family-name:var(--font-almarai),sans-serif]">
              {t("login_system_title")}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium tracking-wide">
              {t("login_system_subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit(handleUserLogin)}
              noValidate
            >
              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("login_email_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    autoComplete="off"
                    dir={isRTL ? "rtl" : "ltr"}
                    placeholder={t("login_email_placeholder")}
                    required
                    className={cn(
                      "h-12 text-sm text-slate-800 rounded-xl transition-all",
                      isRTL
                        ? "pr-11 pl-4 text-right placeholder:text-right"
                        : "pl-11 pr-4 text-left placeholder:text-left",
                      errors.email
                        ? "border-[#F00] focus-visible:border-[#F00] focus-visible:ring-[#F00]/15"
                        : "border-[#E2E8F0] focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25",
                      "placeholder:text-slate-400"
                    )}
                  />
                  {errors.email && (
                    <span
                      className={cn(
                        "text-xs text-red-500 block mt-1",
                        isRTL ? "text-right" : "text-left"
                      )}
                    >
                      {errors.email?.message}
                    </span>
                  )}
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

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("login_password_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    dir={isRTL ? "rtl" : "ltr"}
                    autoComplete="off"
                    placeholder={t("login_password_placeholder")}
                    required
                    className={cn(
                      "h-12 text-sm text-slate-800 rounded-xl transition-all",
                      isRTL
                        ? "pr-11 pl-11 text-right placeholder:text-right"
                        : "pl-11 pr-11 text-left placeholder:text-left",
                      errors.password
                        ? "border-[#F00] focus-visible:border-[#F00] focus-visible:ring-[#F00]/15"
                        : "border-[#E2E8F0] focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25",
                      "placeholder:text-slate-400"
                    )}
                  />

                  {/* Lock icon */}
                  <span
                    className={cn(
                      "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    )}
                  >
                    <Lock className="w-5 h-5" strokeWidth={1.6} />
                  </span>

                  {/* Toggle visibility */}
                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? t("login_hide_password")
                        : t("login_show_password")
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className={cn(
                      "absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer",
                      isRTL ? "left-0 pl-3.5" : "right-0 pr-3.5"
                    )}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.6} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.6} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span
                    className={cn(
                      "text-xs text-red-500 block mt-1",
                      isRTL ? "text-right" : "text-left"
                    )}
                  >
                    {errors.password?.message}
                  </span>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className={cn("flex -mt-1", isRTL ? "justify-start" : "justify-end")}>
                <Link
                  href="/forget-password"
                  className="text-xs font-semibold text-[#38CAF0] hover:text-[#00C3F3] transition-colors hover:underline"
                >
                  {t("login_forgot_password")}
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className={cn(
                  "w-full cursor-pointer h-12 mt-2 rounded-[10px] text-base font-bold text-white",
                  "bg-[#00A2D2] hover:bg-[#008eb8] active:scale-[0.99]",
                  "shadow-[0_4px_14px_0_rgba(0,162,210,0.35)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.45)]",
                  "transition-all duration-200"
                )}
              >
                {t("login_btn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/* ─── Exported LoginForm ─────────────────────────────────────────────── */
export function LoginForm() {
  return <LoginFormInner />;
}
