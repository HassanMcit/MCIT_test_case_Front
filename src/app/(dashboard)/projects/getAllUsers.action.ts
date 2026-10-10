"use server"

import { getUserToken } from "@/app/myUtil"
import { GetAllUsersResponse } from "./getAllUsers.interface";

export async function getAllTester() {
    const token = await getUserToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "force-cache",
        next: { tags: ["users"] },
    });
    const data : GetAllUsersResponse[] = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
}