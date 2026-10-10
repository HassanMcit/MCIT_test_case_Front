"use server";

import { getUserToken } from "@/app/myUtil";
import {
  ChangePasswordActionResult,
  ChangePasswordForm,
} from "./changepassword.interface";

export async function handleUserChangePassword(
  data: ChangePasswordForm
): Promise<ChangePasswordActionResult> {
  const token = await getUserToken();

  if (!token) {
    return {
      success: false,
      status: 401,
      message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
      messageEn: "Session expired. Please log in again.",
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "https://mcit-test-case-backend.onrender.com";

  try {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    let result: any = null;
    try {
      result = await res.json();
    } catch {
      result = { message: res.statusText };
    }

    if (res.ok) {
      return {
        success: true,
        status: 200,
        message: result?.message || "تم تغيير كلمة المرور بنجاح",
        messageEn: "Password changed successfully",
      };
    }

    // Determine descriptive error message in both languages
    let errorAr = "فشل تغيير كلمة المرور";
    let errorEn = "Failed to change password";

    if (Array.isArray(result?.message)) {
      errorAr = result.message.join(" - ");
      errorEn = errorAr;
    } else if (typeof result?.message === "string") {
      errorAr = result.message;
      if (result.message.includes("كلمة المرور الحالية غير صحيحة")) {
        errorEn = "Current password is not correct";
      } else if (result.message.includes("غير متطابقين")) {
        errorEn = "New passwords do not match";
      } else if (result.message.includes("مختلفة")) {
        errorEn = "New password must be different from current password";
      } else {
        errorEn = result.message;
      }
    }

    if (res.status === 401) {
      errorAr = "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى";
      errorEn = "Session expired. Please log in again.";
    }

    return {
      success: false,
      status: res.status,
      message: errorAr,
      messageEn: errorEn,
    };
  } catch (error: any) {
    console.error("[changePasswordAction] Network error:", error);
    return {
      success: false,
      status: 500,
      message: "حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً",
      messageEn: "Connection error with server. Please try again later.",
    };
  }
}