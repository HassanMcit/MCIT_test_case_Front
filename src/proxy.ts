import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
    const pathName = req.nextUrl.pathname;

    const isAuth = pathName === '/login';

   const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET
    });

     let isExpired = false;
    if (token && token.iat) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const sevenDaysInSeconds = 7 * 24 * 60 * 60; // 7 أيام * 24 ساعة * 60 دقيقة * 60 ثانية
        
        if (nowInSeconds - (token.iat as number) > sevenDaysInSeconds) {
            isExpired = true;
        }
    }

    if(isAuth) {
        if (token && !isExpired) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }
        return NextResponse.next()
    }

    if (token && !isExpired) {
        return NextResponse.next()
    }

    return NextResponse.redirect(new URL('/login', req.url))

}

export const config = {
  matcher: [
   "/login",
    "/dashboard/:path*",
    "/users/:path*",
    "/users",
    "/add/:path*",
    "/add",
    "/test-cases/:path*",
    "/test-cases",
    "/projects/:path*",
    "/projects",
  ],
};