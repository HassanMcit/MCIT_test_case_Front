import type { Metadata } from "next";
import { ForgetPasswordForm } from "@/components/forget-password-form";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور | نظام إدارة اختبارات الجودة",
  description: "Forget Password – Get Verification Code",
};

export default function ForgetPasswordPage() {
  return <ForgetPasswordForm />;
}
