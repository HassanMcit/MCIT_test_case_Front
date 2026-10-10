"use server";

import { getUserToken } from "@/app/myUtil";

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
    const token = await getUserToken();
    if (!token) return [];

    const query = new URLSearchParams();
    if (params?.environment) query.set("environment", params.environment);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.assignedToMe) query.set("assignedToMe", "true");
    if (params?.assignedToUserId) query.set("assignedToUserId", String(params.assignedToUserId));

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
