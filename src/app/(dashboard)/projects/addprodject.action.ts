"use server";
import { revalidatePath, updateTag } from "next/cache";

import { getUserToken } from "@/app/myUtil";
import { appFetch } from "@/lib/app-fetch";
import { recordSystemAuditLog } from "@/lib/audit";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";
import type { AddProjectResponse } from "./add-project.interface";
import { createProjectApiSchema } from "./project-schedule.zod";

export async function addNewProject(data: {
  name: string;
  description: string;
  environment: string;
  status: string;
  application?: string;
  startAt: string;
  endAt: string;
  assignedTesterId?: number | null;
}) {
  const parsed = createProjectApiSchema.safeParse(data);
  if (!parsed.success)
    throw new Error(
      "Check project fields and dates / راجع بيانات المشروع والتواريخ",
    );
  const token = await getUserToken();
  if (!token) throw new Error("يرجى تسجيل الدخول أولاً");
  const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  if (!baseUrl) throw new Error("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");

  const response = await fetchWithWakeRetry(
    appFetch,
    `${baseUrl}/api/projects`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
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

  const userData: AddProjectResponse & { message?: string | string[] } =
    await response.json().catch(() => ({} as AddProjectResponse));
  if (!response.ok)
    throw new Error(
      extractBackendErrorMessage(response.status, userData, "Could not create project"),
    );
  updateTag("notifications");
  updateTag("projects");
  updateTag("dashboard-stats");
  updateTag("dashboard");
  updateTag("users");
  revalidatePath("/add");
  revalidatePath("/assign-projects");
  revalidatePath("/projects");
  revalidatePath("/test-cases");
  revalidatePath("/dashboard");
  revalidatePath("/users");

  if (response.ok) {
    await recordSystemAuditLog({
      action: "إضافة مشروع جديد",
      actionCategory: "PROJECTS",
      description: `إضافة مشروع جديد (${data.name}) - التطبيق: (${data.application || "العام"}) في بيئة (${data.environment || "production"})`,
      endpoint: "/api/projects",
      method: "POST",
    }).catch(() => {});
  }

  return userData;
}
