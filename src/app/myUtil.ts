import { pool } from "@/lib/db";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { cache } from "react";

const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

/**
 * Reconstructs the full cookie value whether stored in a single cookie
 * or chunked by Auth.js / NextAuth (e.g. cookie.0, cookie.1, ...).
 */
function readFullCookie(cookieStore: any, baseName: string): string | null {
  const direct = cookieStore.get(baseName)?.value;
  if (direct) return direct;

  let assembled = "";
  let index = 0;
  while (true) {
    const chunk = cookieStore.get(`${baseName}.${index}`)?.value;
    if (!chunk) break;
    assembled += chunk;
    index++;
  }

  return assembled || null;
}

function isBackendJwtExpired(rawJwt?: string | null): boolean {
  if (!rawJwt || typeof rawJwt !== "string") return true;
  try {
    const parts = rawJwt.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload.exp && typeof payload.exp === "number") {
      if (Date.now() >= payload.exp * 1000) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Safely decodes session token trying all candidate cookie names and matching salts.
 */
async function getDecodedToken() {
  try {
    const cookieStore = await cookies();
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.warn("[myUtil] AUTH_SECRET is not set in environment variables!");
      return null;
    }

    for (const baseName of SESSION_COOKIE_NAMES) {
      const tokenValue = readFullCookie(cookieStore, baseName);
      if (!tokenValue) continue;

      try {
        const decoded = await decode({
          salt: baseName,
          secret,
          token: tokenValue,
        });

        if (decoded) {
          const credentialToken =
            (decoded.credentialToken as string) ||
            (decoded.access_token as string) ||
            (decoded.token as string) ||
            null;

          if (!credentialToken || isBackendJwtExpired(credentialToken)) {
            return null;
          }

          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (decoded.loginAt && typeof decoded.loginAt === "number") {
            if (Date.now() - decoded.loginAt > sevenDaysMs) {
              return null;
            }
          }

          return decoded;
        }
      } catch {
        // Salt mismatch for this candidate name, try next candidate
      }
    }
  } catch (err: any) {
    if (err?.digest?.startsWith?.("DYNAMIC_SERVER_USAGE") || err?.digest === "NEXT_REDIRECT" || err?.digest === "NEXT_NOT_FOUND") {
      throw err;
    }
    console.error("[myUtil] Error resolving session token:", err);
  }

  return null;
}

export async function getUserToken(): Promise<string | null> {
  return (await getCurrentUserSession())?.token || null;
}

// Request-local memoization only: parallel RSC reads share the authorization
// query, but a new request always checks roles, revocation, and cache revision.
export const getCurrentUserSession = cache(async function getCurrentUserSession() {
  const token = await getDecodedToken();
  if (!token) return null;
  const credential = (token.credentialToken || token.access_token || token.token) as string;
  let backend: { sub?: number; iat?: number; sid?: string };
  try { backend = JSON.parse(Buffer.from(credential.split(".")[1], "base64url").toString("utf8")); }
  catch { return null; }
  const id = Number(backend.sub || token.id);
  if (!id) return null;
  // Always fresh. Auth.js has verified/decrypted the cookie carrying this JWT.
  // A cache hit must never bypass current roles, logout, or device revocation.
  const result = await pool.query(`
    SELECT u.id,u.name,u.email,u.role,u."minTokenIat",r.revision,
      (SELECT s."isActive" FROM user_login_sessions s WHERE s."sessionId"=$2 AND s."userId"=u.id) AS "sessionActive"
    FROM users u CROSS JOIN app_cache_revision r WHERE u.id=$1 AND r.id=1
  `, [id, backend.sid || token.sid || null]);
  const user = result.rows[0];
  if (!user || user.sessionActive === false || (Number(user.minTokenIat || 0) > 0 && (!backend.iat || backend.iat < Number(user.minTokenIat)))) return null;
  return { id: Number(user.id), role: String(user.role), name: String(user.name), email: String(user.email), token: credential, cacheRevision: String(user.revision) };
});
