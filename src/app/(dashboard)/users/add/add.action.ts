"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { AddNewUserResponse, AddUserType } from "./adduser.interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { isAllowedAccountEmail } from "@/lib/account-email";

export async function addNewUser(data: AddUserType) {
  if (!isAllowedAccountEmail(data.email)) throw new Error("Email domain is not allowed");
  const token = await getUserToken();
  const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: "no-store"
  });

  const result: AddNewUserResponse = await response.json();
  if(result.error) {
    throw new Error(result.message)
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
