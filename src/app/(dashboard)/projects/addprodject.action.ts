"use server"

import { getUserToken } from "@/app/myUtil"
import { AddProjectResponse } from "./add-project.interface";
import { revalidatePath } from "next/cache";

    export async function addNewProject(data:{name:string, description:string, environment:string, status:string}) {
        
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
            method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getUserToken()}`
        },
        body: JSON.stringify(data)
    });

    const userData:AddProjectResponse = await response.json();
    revalidatePath("/add");
    revalidatePath("/assign-projects");
    revalidatePath("/projects");
    revalidatePath("/test-cases");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    return userData;
}