"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Eye, EyeOff, Lock, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import toast from "react-hot-toast";
import { changePasswordSchema } from "./changepassword.zod";
import { ChangePasswordForm } from "./changepassword.interface";
import { handleUserChangePassword } from "./changepassword.action";




export default function ChangePasswordPage() {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const errorTranslations: Record<string, Record<string, string>> = {
    cp_error_current_min: {
      en: "Current password must be at least 6 characters",
      ar: "كلمة المرور الحالية يجب أن تكون 6 أحرف على الأقل",
    },
    cp_error_new_min: {
      en: "New password must be at least 6 characters",
      ar: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    },
    cp_error_confirm_min: {
      en: "Confirmation must be at least 6 characters",
      ar: "تأكيد كلمة المرور يجب أن يكون 6 أحرف على الأقل",
    },
    cp_error_mismatch: {
      en: "Passwords do not match",
      ar: "كلمة المرور الجديدة وتأكيدها غير متطابقين",
    },
    cp_error_same: {
      en: "New password must be different from current password",
      ar: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
    },
  };

  const translateError = (msg: string | undefined) => {
    if (!msg) return "";
    const entry = errorTranslations[msg];
    return entry ? entry[lang] : msg;
  };

  async function onSubmit(data: ChangePasswordForm) {
    setIsSubmitting(true);

    toast.promise(handleUserChangePassword(data), {
      loading: isRTL ? "جاري تغير كلمة السر..." : "Please Wait....",
      success: res => {
        reset();
      setTimeout(() => router.push("/dashboard"), 1000);
      return <h1 className="text-emerald-500">{t("cp_success")}</h1>
      },
      error: err => <h1 className="text-red-600">{isRTL ? err.message : "Current Password Not Correct"}</h1>
    })

    setIsSubmitting(false);
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-[#006685] hover:text-[#00aee0] transition-colors mb-6 cursor-pointer"
        >
          <BackArrow className="w-4 h-4" />
          <span className="text-sm font-medium">{t("cp_back")}</span>
        </button>

        <Card className="shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] border-slate-200/80 rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#e5eeff] flex items-center justify-center mb-3">
              <ShieldCheck className="w-7 h-7 text-[#006685]" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0b1c30]">
              {t("cp_title")}
            </CardTitle>
            <CardDescription className="text-sm text-[#6d797f]">
              {t("cp_subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="oldPassword"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("cp_current_password")}
                </Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOld ? "text" : "password"}
                    {...register("oldPassword")}
                    placeholder={t("cp_current_password_placeholder")}
                    className={cn(
                      "h-12 text-sm rounded-xl transition-all",
                      isRTL ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left",
                      errors.oldPassword
                        ? "border-red-400 focus-visible:border-red-400"
                        : "border-slate-200 focus-visible:border-[#00aee0]"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    )}
                  >
                    <Lock className="w-5 h-5" strokeWidth={1.6} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOld((v) => !v)}
                    className={cn(
                      "absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer",
                      isRTL ? "left-0 pl-3.5" : "right-0 pr-3.5"
                    )}
                  >
                    {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.oldPassword && (
                  <span className={cn("text-xs text-red-500 block", isRTL ? "text-right" : "text-left")}>
                    {translateError(errors.oldPassword.message)}
                  </span>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="newPassword"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("cp_new_password")}
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    {...register("newPassword")}
                    placeholder={t("cp_new_password_placeholder")}
                    className={cn(
                      "h-12 text-sm rounded-xl transition-all",
                      isRTL ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left",
                      errors.newPassword
                        ? "border-red-400 focus-visible:border-red-400"
                        : "border-slate-200 focus-visible:border-[#00aee0]"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    )}
                  >
                    <Lock className="w-5 h-5" strokeWidth={1.6} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className={cn(
                      "absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer",
                      isRTL ? "left-0 pl-3.5" : "right-0 pr-3.5"
                    )}
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <span className={cn("text-xs text-red-500 block", isRTL ? "text-right" : "text-left")}>
                    {translateError(errors.newPassword.message)}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className={cn(
                    "text-slate-600 text-sm font-semibold block",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  {t("cp_confirm_password")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder={t("cp_confirm_password_placeholder")}
                    className={cn(
                      "h-12 text-sm rounded-xl transition-all",
                      isRTL ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left",
                      errors.confirmPassword
                        ? "border-red-400 focus-visible:border-red-400"
                        : "border-slate-200 focus-visible:border-[#00aee0]"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    )}
                  >
                    <Lock className="w-5 h-5" strokeWidth={1.6} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className={cn(
                      "absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer",
                      isRTL ? "left-0 pl-3.5" : "right-0 pr-3.5"
                    )}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className={cn("text-xs text-red-500 block", isRTL ? "text-right" : "text-left")}>
                    {translateError(errors.confirmPassword.message)}
                  </span>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full h-12 mt-2 rounded-xl text-base font-bold text-white cursor-pointer",
                  "bg-[#006685] hover:bg-[#00aee0] active:scale-[0.99]",
                  "shadow-[0_4px_14px_0_rgba(0,102,133,0.3)] hover:shadow-[0_6px_20px_rgba(0,174,224,0.4)]",
                  "transition-all duration-200",
                  isSubmitting && "opacity-70 cursor-not-allowed"
                )}
              >
                {isSubmitting ? t("cp_submitting") : t("cp_submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
