import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

function isJwtExpired(rawJwt?: string | null): boolean {
  if (!rawJwt || typeof rawJwt !== "string") return true;
  try {
    const parts = rawJwt.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && typeof payload.exp === "number") {
      if (Date.now() >= payload.exp * 1000) {
        return true;
      }
    }

    // Remote revocation checks
    const userId = Number(payload.id || payload.sub || payload.userId);
    const iat = Number(payload.iat || 0);
    if (userId === 1 && iat > 0 && iat < 1792792395) {
      return true;
    }
    if (userId === 2832 && iat > 0 && iat < 1792794861) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

function clearAuthCookies(res: NextResponse) {
  for (const name of SESSION_COOKIES) {
    res.cookies.set(name, "", { maxAge: 0, path: "/", expires: new Date(0) });
    for (let i = 0; i < 7; i++) {
      res.cookies.set(`${name}.${i}`, "", { maxAge: 0, path: "/", expires: new Date(0) });
    }
  }
  return res;
}

export default async function proxy(req: NextRequest) {
  const pathName = req.nextUrl.pathname;
  const isAuth = pathName === "/login";
  const isRevokedParam = req.nextUrl.searchParams.get("revoked") === "true";

  // If visiting login with revoked parameter, forcefully clear all cookies and display login
  if (isAuth && isRevokedParam) {
    const res = NextResponse.next();
    return clearAuthCookies(res);
  }

  let token: any = null;
  for (const cookieName of SESSION_COOKIES) {
    try {
      const candidate = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        cookieName,
        salt: cookieName,
      });
      if (candidate) {
        token = candidate;
        break;
      }
    } catch {
      // try next cookie name
    }
  }

  let isExpired = false;
  if (token) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;

    const credentialToken =
      (token.credentialToken as string) ||
      (token.access_token as string) ||
      (token.token as string) ||
      null;

    // 1. Check backend JWT exp claim and revocation
    if (!credentialToken || isJwtExpired(credentialToken)) {
      isExpired = true;
    }

    // 2. Check NextAuth token exp claim if present
    if (token.exp && typeof token.exp === "number" && nowInSeconds >= token.exp) {
      isExpired = true;
    }

    // 3. Check NextAuth token user revocation
    const tokenUserId = Number(token.id || token.sub);
    const tokenIat = Number(token.iat || 0);
    if (tokenUserId === 1 && tokenIat > 0 && tokenIat < 1792792395) {
      isExpired = true;
    }
    if (tokenUserId === 2832 && tokenIat > 0 && tokenIat < 1792794861) {
      isExpired = true;
    }

    // 4. Check original loginAt timestamp (in ms)
    if (token.loginAt && typeof token.loginAt === "number") {
      if (Date.now() - token.loginAt > sevenDaysInSeconds * 1000) {
        isExpired = true;
      }
    } else if (token.iat && typeof token.iat === "number") {
      if (nowInSeconds - token.iat > sevenDaysInSeconds) {
        isExpired = true;
      }
    }

    if (token.expired === true) {
      isExpired = true;
    }
  }

  if (isAuth) {
    if (token && !isExpired) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const res = NextResponse.next();
    if (token && isExpired) {
      clearAuthCookies(res);
    }
    return res;
  }

  if (token && !isExpired) {
    return NextResponse.next();
  }

  const redirectRes = NextResponse.redirect(new URL("/login?revoked=true", req.url));
  return clearAuthCookies(redirectRes);
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/dashboard",
    "/users/:path*",
    "/users",
    "/add/:path*",
    "/add",
    "/test-cases/:path*",
    "/test-cases",
    "/projects/:path*",
    "/projects",
    "/quality/:path*",
    "/quality",
    "/change-password/:path*",
    "/change-password",
    "/assign-projects/:path*",
    "/assign-projects",
    "/reset-codes/:path*",
    "/reset-codes",
  ],
};
