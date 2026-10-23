"use server";

import { getUserToken } from "@/app/myUtil";
import { AddProjectResponse } from "./add-project.interface";
import { revalidatePath, updateTag } from "next/cache";

export async function addNewProject(data: {
  name: string;
  description: string;
  environment: string;
  status: string;
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
  return userData;
}
