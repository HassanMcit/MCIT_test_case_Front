"use server";

import { getUserToken, getCurrentUserSession } from "@/app/myUtil";

export interface ProjectApiItem {
  id: number;
  name: string;
  description: string | null;
  environment: "production" | "staging";
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  stats?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  assignedUsers?: Array<{
    id: number;
    userId: number;
    name: string;
    email: string;
    role: string;
    photo: string;
    profileImage: string;
    assignedAt: string;
  }>;
}

export async function getProjects(params?: {
  environment?: string;
  status?: string;
  search?: string;
  assignedToMe?: boolean;
  assignedToUserId?: number;
}): Promise<ProjectApiItem[]> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) return [];

    const query = new URLSearchParams();
    if (params?.environment) query.set("environment", params.environment);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);

    // If assignedToMe is requested OR user is not admin, filter projects assigned to current user
    const shouldFilterToMe = params?.assignedToMe || (sessionUser && sessionUser.role !== "admin");
    if (shouldFilterToMe) {
      query.set("assignedToMe", "true");
    }
    if (params?.assignedToUserId) {
      query.set("assignedToUserId", String(params.assignedToUserId));
    }

    // Partition cache URL by role and userId so Next.js force-cache doesn't leak between users
    if (sessionUser?.id) {
      query.set("cacheUser", `${sessionUser.role}_${sessionUser.id}`);
    }

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { tags: ["projects"] },
      cache: "force-cache",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}
