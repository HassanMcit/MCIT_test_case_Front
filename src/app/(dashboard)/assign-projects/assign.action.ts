"use server"

import { getUserToken } from "@/app/myUtil";

export async function fetchAssignData() {
    try {
        const token = await getUserToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch users and projects in parallel
        const [usersRes, projectsRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users`, { headers, cache: "force-cache" }),
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, { headers, cache: "force-cache" })
        ]);

        if (!usersRes.ok || !projectsRes.ok) {
            throw new Error("Failed to fetch data");
        }

        const users = await usersRes.json();
        const projects = await projectsRes.json();

        return { success: true, users, projects };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignProjectToUser(userId: number, projectId: number) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${userId}/assign-project`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await getUserToken()}`
            },
            body: JSON.stringify({ projectId })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { success: false, error: data.message || "Failed to assign project" };
        
        return { success: true, message: data.message };
    } catch (error: any) {
        return { success: false, error: "Network error" };
    }
}

export async function unassignProjectFromUser(userId: number, projectId: number) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${userId}/assign-project/${projectId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${await getUserToken()}`
            }
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { success: false, error: data.message || "Failed to unassign project" };
        
        return { success: true, message: data.message };
    } catch (error: any) {
        return { success: false, error: "Network error" };
    }
}
