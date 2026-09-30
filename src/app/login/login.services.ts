"use server"

import { LoginResponseType, LoginSchemaType } from "./login.interface";

export async function sendUserLogin(userData:LoginSchemaType):Promise<LoginResponseType> {

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login`, {
            method: "POST",
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