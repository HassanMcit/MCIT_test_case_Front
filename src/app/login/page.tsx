import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import MySession from "@/components/MySession/MySession";

export const metadata: Metadata = {
  title: "تسجيل الدخول | نظام إدارة اختبارات الجودة",
  description: "Quality Assurance Management Portal – Login",
};

export default function LoginPage() {
  return <LoginForm />
  ;
}
