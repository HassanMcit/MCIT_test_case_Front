"use server";
import { appFetch } from "@/lib/app-fetch";
import { getUserToken } from "@/app/myUtil";
import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  extractBackendErrorMessage,
  fetchWithWakeRetry,
  sanitizeBackendOrigin,
} from "@/lib/backend-wake";

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
    const baseUrl = sanitizeBackendOrigin(process.env.NEXT_PUBLIC_BASE_URL);
    if (!baseUrl) throw new Error("Backend service is not configured");
    const requestUrl = `${baseUrl}/api/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const response =
      method === "GET"
        ? await appFetch(requestUrl, {
            method,
            cache: "force-cache",
            next: {
              tags: ["test-cases", "dashboard", "dashboard-stats", "projects"],
            },
            headers,
          })
        : await fetchWithWakeRetry(
            appFetch,
            requestUrl,
            {
              method,
              cache: "no-store",
              headers,
              ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            },
            method === "PATCH"
              ? {
                  maxAttempts: 3,
                  timeoutsMs: [20000, 25000, 20000],
                  retryOnTimeout: true,
                  baseUrl,
                }
              : {
                  maxAttempts: 3,
                  timeoutsMs: [25000, 25000, 20000],
                  retryOnTimeout: false,
                  retryStatuses: new Set([502, 503]),
                  baseUrl,
                },
          );
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        extractBackendErrorMessage(response.status, data, `Request failed (${response.status})`),
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
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}
