"use server"

import { getUserToken } from "@/app/myUtil"
import { GetAllUsersResponse } from "./getAllUsers.interface";

export async function getAllTester() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/all`);
    const data : GetAllUsersResponse[] = await res.json();
    return data
}