import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function getUserToken() {
    const cookie =  await cookies()
    const sessionToken = cookie.get('authjs.session-token')?.value;
    
    const token = await decode({salt: "authjs.session-token", secret: process.env.AUTH_SECRET as string, token: sessionToken})

    return token!.credentialToken
}