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

export async function getCurrentUserSession() {
    const cookie = await cookies();
    
    const isProd = process.env.NODE_ENV === "production";
    const cookiePrefix = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";
    
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

    if (!token) return null;

    return {
        id: token.id ? Number(token.id) : undefined,
        role: (token.role as string) || "tester",
        email: (token.email as string) || "",
        name: (token.name as string) || "",
        token: (token.credentialToken as string) || null,
    };
}