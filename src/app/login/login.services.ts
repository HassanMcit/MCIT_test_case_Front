"use server"
import { appFetch } from "@/lib/app-fetch";
import { isAllowedAccountEmail } from "@/lib/account-email";

import { LoginResponseType, LoginSchemaType } from "./login.interface";

export async function sendUserLogin(userData:LoginSchemaType):Promise<LoginResponseType> {

    try {
        if (!isAllowedAccountEmail(userData.email)) {
            throw new Error("Email domain is not allowed");
        }
        const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "content-type" : "application/json",
            },
            body: JSON.stringify(userData)
        })
        const data:LoginResponseType = await response.json();

        if(response.ok) {
            return data as LoginResponseType 
        } 

        throw new Error(data.message || "Invalid credentials")

    } catch (error) {
        if(error instanceof Error) {
            throw new Error(error.message)
        } else {
            throw new Error("UnExpected Error")
        }
    }
}
