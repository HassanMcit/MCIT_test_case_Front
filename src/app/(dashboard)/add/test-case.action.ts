"use server"

import { getUserToken } from "@/app/myUtil"
import type { AddTestCaseResponse, TestCaseFormValues } from "./test-case-interface"
import { revalidatePath } from "next/cache";

export async function addNewTestCase(data:TestCaseFormValues) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${await getUserToken()}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(data)
    })

    const responseData: AddTestCaseResponse = await response.json();
    
    if(response.ok) {
        revalidatePath("/test-cases");
        revalidatePath("/projects");
        revalidatePath("/dashboard");
        revalidatePath("/", "layout");
        return {success: true, message: "Test case created successfully"}
    }
    
    const errorMsg = Array.isArray(responseData.message)
        ? responseData.message.join(" - ")
        : responseData.message || "حدث خطأ أثناء إضافة حالة الاختبار";

        throw new Error(errorMsg);
    }
    catch(err) {
        throw new Error(err instanceof Error ?  err.message : "حدث خطأ غير متوقع")
    }
}

export async function getNextTestCaseId(moduleName?: string, projectId?: number): Promise<string> {
    try {
        const token = await getUserToken();
        if (!token) return "TC-0001";

        const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/test-cases`);
        url.searchParams.set("limit", "100");
        if (projectId && Number(projectId) > 0) {
            url.searchParams.set("projectId", String(projectId));
        } else if (moduleName && moduleName.trim() !== "") {
            url.searchParams.set("module", moduleName.trim());
        }

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        if (!response.ok) {
            return "TC-0001";
        }

        const data = await response.json();
        const items = Array.isArray(data?.data) ? data.data : [];

        let maxNum = 0;
        for (const item of items) {
            const match = (item?.testId || "").match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }

        return `TC-${String(maxNum + 1).padStart(4, "0")}`;
    } catch (err) {
        console.error("Error in getNextTestCaseId:", err);
        return "TC-0001";
    }
}