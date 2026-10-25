"use server";

import { getUserToken } from "@/app/myUtil";
import { AddProjectResponse } from "./add-project.interface";
import { revalidatePath, updateTag } from "next/cache";
import { recordSystemAuditLog } from "@/lib/audit";
import { pool } from "@/lib/db";

export async function addNewProject(data: {
  name: string;
  description: string;
  environment: string;
  status: string;
  application?: string;
}) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getUserToken()}`,
    },
    body: JSON.stringify(data),
    cache: "force-cache",
  });

  const userData: AddProjectResponse = await response.json();
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
    if (data.application) {
      const createdId = userData?.id || (userData as any)?.data?.id;
      if (createdId) {
        try {
          await pool.query('UPDATE projects SET application = $1 WHERE id = $2', [data.application, createdId]);
        } catch {}
      }
    }

    recordSystemAuditLog({
      action: "إضافة مشروع جديد",
      actionCategory: "PROJECTS",
      description: `إضافة مشروع جديد (${data.name}) - التطبيق: (${data.application || "العام"}) في بيئة (${data.environment || "production"})`,
      endpoint: "/api/projects",
      method: "POST",
    }).catch(() => {});
  }

  return userData;
}
