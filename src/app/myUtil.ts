import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

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
  const token = await getDecodedToken();
  const credentialToken =
    (token?.credentialToken as string) ||
    (token?.access_token as string) ||
    (token?.token as string) ||
    null;
  return credentialToken;
}

export async function getCurrentUserSession() {
  const token = await getDecodedToken();
  if (!token) return null;

  return {
    id: token.id ? Number(token.id) : undefined,
    role: (token.role as string) || "tester",
    email: (token.email as string) || "",
    name: (token.name as string) || "",
    token:
      (token.credentialToken as string) ||
      (token.access_token as string) ||
      (token.token as string) ||
      null,
  };
}