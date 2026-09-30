import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function getUserToken() {
    const cookie = await cookies();
    
    const isProd = process.env.NODE_ENV === "production";
    const cookiePrefix = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";
    
    // محاولة جلب التوكن بكلا الاسمين للحماية
    const sessionToken = 
        cookie.get("__Secure-authjs.session-token")?.value || 
        cookie.get("authjs.session-token")?.value;
    
    if (!sessionToken) {
        return null;
    }

    const token = await decode({
        salt: cookiePrefix, 
        secret: process.env.AUTH_SECRET as string, 
        token: sessionToken
    });

    return token?.credentialToken || null;
}