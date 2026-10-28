"use server";
import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";

export async function workflowRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const [resource] = path.split("?");
    if (
      !/^(projects\/\d+\/releases(?:\/\d+)?|test-cycles(?:\/\d+(?:\/(?:candidates|items)(?:\/\d+(?:\/executions)?)?)?)?|test-cases\/\d+\/executions|dashboard\/executions)$/.test(
        resource,
      )
    )
      throw new Error("Invalid workflow resource");
    const token = await getUserToken();
    if (!token) throw new Error("Please sign in / يرجى تسجيل الدخول");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/${path}`,
      {
        method,
        cache: "force-cache",
        ...(method === "GET"
          ? {
              next: {
                tags: ["test-cases", "dashboard", "dashboard-stats", "projects"],
              },
            }
          : {}),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        Array.isArray(data.message)
          ? data.message.join(" · ")
          : data.message || `Request failed (${response.status})`,
      );
    if (method !== "GET") {
      for (const tag of [
        "test-cases",
        "dashboard",
        "dashboard-stats",
        "projects",
        "users",
      ])
        updateTag(tag);
      revalidatePath("/test-cycles");
      revalidatePath("/dashboard");
      revalidatePath("/test-cases");
      revalidatePath("/test-cycles/[id]", "page");
      revalidatePath("/test-cases/[id]/history", "page");
    }
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}
