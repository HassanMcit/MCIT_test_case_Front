"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { AddNewUserResponse, AddUserType } from "./adduser.interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { isAllowedAccountEmail } from "@/lib/account-email";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

export async function addNewUser(data: AddUserType) {
  if (!isAllowedAccountEmail(data.email)) throw new Error("Email domain is not allowed");
  const token = await getUserToken();
  if (!token) throw new Error("يرجى تسجيل الدخول أولاً");
  const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  if (!baseUrl) throw new Error("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");

  const response = await fetchWithWakeRetry(
    appFetch,
    `${baseUrl}/api/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    },
    {
      maxAttempts: 3,
      timeoutsMs: [25000, 25000, 20000],
      retryOnTimeout: false,
      retryStatuses: new Set([502, 503]),
      baseUrl,
    },
  );

  const result: AddNewUserResponse & { error?: string; message?: string | string[] } =
    await response.json().catch(() => ({} as AddNewUserResponse));
  if (!response.ok || result.error) {
    throw new Error(extractBackendErrorMessage(response.status, result, "فشل إضافة المستخدم"));
  }
  updateTag("users");
  updateTag("dashboard");
  updateTag("dashboard-stats");
  revalidatePath("/users");
  revalidatePath("/assign-projects");
  revalidatePath("/dashboard");

  await recordSystemAuditLog({
    action: "إضافة مستخدم جديد",
    actionCategory: "USER_MANAGEMENT",
    description: `إنشاء حساب مستخدم جديد (${data.name} - ${data.email}) بصلاحية (${data.role})`,
    endpoint: "/api/users",
    method: "POST",
  }).catch(() => {});

  return true;
}
