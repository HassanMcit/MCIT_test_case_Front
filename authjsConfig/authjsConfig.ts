import { LoginResponseType } from "@/app/login/login.interface";
import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import * as crypto from "node:crypto";

function normalizeSessionAvatarUrl(raw?: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (!s || s === "null" || s === "undefined") return undefined;
  if (s.includes("default-profile.png") || s.endsWith("/avatar.png")) {
    return "/avatar.png";
  }
  const backendMatch = s.match(/\/api\/users\/(\d+)\/photo(\?[^\s#]*)?/i);
  if (backendMatch) {
    return `/api/avatar/${backendMatch[1]}${backendMatch[2] || ""}`;
  }
  if (s.startsWith("data:")) return "/avatar.png";
  return s;
}

function sanitizeEnvValue(raw?: string | null): string {
  if (typeof raw !== "string") return "";
  let value = raw.trim();
  value = value.replace(/^(?:export\s+)?(?:AUTH_URL|NEXTAUTH_URL|NEXT_PUBLIC_BASE_URL)\s*=\s*/i, "");
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function normalizeOriginUrl(raw?: string | null): string | undefined {
  const cleaned = sanitizeEnvValue(raw).replace(/\/+$/, "");
  if (!cleaned) return undefined;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    const pathPart =
      parsed.pathname && parsed.pathname !== "/"
        ? parsed.pathname.replace(/\/+$/, "")
        : "";
    return `${parsed.origin}${pathPart}`;
  } catch {
    return undefined;
  }
}

function sanitizeAuthProcessEnv(
  env: Record<string, string | undefined> = process.env,
): void {
  for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_BASE_URL"] as const) {
    const raw = env[key];
    if (typeof raw !== "string") continue;
    const normalized = normalizeOriginUrl(raw);
    if (normalized) {
      env[key] = normalized;
    } else if (key === "AUTH_URL" || key === "NEXTAUTH_URL") {
      delete env[key];
    } else {
      env[key] = sanitizeEnvValue(raw).replace(/\/+$/, "");
    }
  }
}

sanitizeAuthProcessEnv();

declare module "next-auth" {
  interface User {
    access_token: string;
    role: string;
    id?: string | number;
    sid?: string;
  }

  interface Session {
    user: {
      id?: string;
      role?: string;
      image?: string | null;
      sid?: string;
      loginAt?: number;
      loginDate?: string;
      isRevoked?: boolean;
    } & import("next-auth").DefaultSession["user"];
  }
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [
    Credentials({
      name: "Login MCIT_TEST",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        clientIp: { label: "Client IP", type: "text" },
        macAddress: { label: "MAC Address", type: "text" },
        deviceInfo: { label: "Device Info", type: "text" },
        location: { label: "Location", type: "text" },
        userAgent: { label: "User Agent", type: "text" },
      },
      authorize: async function (credential) {
        sanitizeAuthProcessEnv();
        const baseUrl =
          normalizeOriginUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
          sanitizeEnvValue(process.env.NEXT_PUBLIC_BASE_URL).replace(/\/+$/, "");
        if (!baseUrl) {
          return null;
        }

        const normalizedEmail =
          typeof credential?.email === "string"
            ? credential.email.trim().toLowerCase()
            : "";
        const loginPayload = {
          ...(credential as Record<string, unknown>),
          email: normalizedEmail,
        };
        const isNetlify = process.env.NETLIFY === "true";

        let response: Response | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const timeoutMs = isNetlify ? 20000 : attempt === 1 ? 35000 : 25000;
            const timeoutSignal =
              typeof AbortSignal !== "undefined" &&
              typeof AbortSignal.timeout === "function"
                ? AbortSignal.timeout(timeoutMs)
                : undefined;
            response = await fetch(`${baseUrl}/api/auth/login`, {
              method: "POST",
              cache: "no-store",
              ...(timeoutSignal ? { signal: timeoutSignal } : {}),
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify(loginPayload),
            });
            if (
              !isNetlify &&
              (response.status === 502 ||
                response.status === 503 ||
                response.status === 504) &&
              attempt < 2
            ) {
              if (typeof setTimeout === "function") {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
              continue;
            }
            break;
          } catch {
            if (isNetlify || attempt >= 2) {
              throw new Error("BACKEND_UNAVAILABLE");
            }
            if (typeof setTimeout === "function") {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        }

        if (!response || response.status >= 500) {
          throw new Error("BACKEND_UNAVAILABLE");
        }

        if (!response.ok) {
          return null;
        }

        const data: LoginResponseType = await response.json();
        const {
          user: { name, email, photo, role, id },
          access_token,
        } = data;

        const sessionId = (data as any).sessionId || crypto.randomUUID();
        const clientIp = (credential.clientIp as string) || "Unknown IP";
        const macAddress = (credential.macAddress as string) || "02:00:00:00:00:01";
        const deviceInfo = (credential.deviceInfo as string) || "Browser";
        const location = (credential.location as string) || "Cairo, Egypt";
        const userAgent = (credential.userAgent as string) || "";

        // Direct DB Persistence for Sessions and Audit Trail
        try {
          await pool.query(
            `INSERT INTO user_login_sessions (
              "sessionId", "userId", "userName", email, ip, "macAddress", "deviceInfo", location, "userAgent", "isActive", "createdAt", "lastSeenAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), NOW())`,
            [sessionId, id, name, email, clientIp, macAddress, deviceInfo, location, userAgent]
          );

          await pool.query(
            `UPDATE users SET "minTokenIat" = 0 WHERE id = $1`,
            [id]
          );

          await pool.query(
            `INSERT INTO audit_logs (
              "userId", "userName", email, role, action, "actionCategory",
              description, method, endpoint, ip, "macAddress", location,
              "deviceInfo", "userAgent", status, "createdAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
            )`,
            [
              id,
              name,
              email,
              role,
              "تسجيل دخول إلى النظام",
              "AUTH",
              `تسجيل دخول ناجح بالحساب (${email})`,
              "POST",
              "/login",
              clientIp,
              macAddress,
              location,
              deviceInfo,
              userAgent,
              "success",
            ]
          );
        } catch (dbErr) {
          console.error("Error persisting login session and audit log:", dbErr);
        }

        return { name, email, image: normalizeSessionAvatarUrl(photo), access_token, role, id: String(id), sid: sessionId };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: function ({ token, user, trigger, session }) {
      if (user) {
        token.credentialToken = user.access_token;
        token.picture = user.image;
        token.role = user.role;
        token.loginAt = Date.now();
        token.loginDate = new Date().toISOString();
        token.id = user.id;
        token.sid = user.sid;
      }
      if (trigger === "update") {
        const newImage = session?.image || session?.user?.image || session?.picture;
        if (typeof newImage === "string" && newImage.trim() && !newImage.trim().startsWith("data:")) {
          token.picture = newImage.trim();
        }
      }

      return token;
    },

    session: async function ({ session, token }) {
      session.user.role = token.role as string;
      session.user.image = normalizeSessionAvatarUrl(
        (token.picture as string) || session.user?.image
      );
      session.user.loginAt = token.loginAt as number;
      session.user.loginDate = token.loginDate as string;
      session.user.id = token.id as string;
      session.user.sid = token.sid as string | undefined;

      // Real-time remote revocation check
      const userId = Number(token.id || token.sub);
      const tokenIat = Number(token.iat || 0);
      const sid = token.sid as string | undefined;

      let isRevoked = false;

      const [sessRes, userRes] = await Promise.all([
        sid
          ? pool
              .query(
                'SELECT "isActive" FROM user_login_sessions WHERE "sessionId" = $1',
                [sid]
              )
              .catch(() => null)
          : Promise.resolve(null),
        userId
          ? pool
              .query('SELECT "minTokenIat" FROM users WHERE id = $1', [userId])
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      if (sessRes?.rows[0] && sessRes.rows[0].isActive === false) {
        isRevoked = true;
      }

      if (!isRevoked && userRes) {
        const minIat = Number(userRes.rows[0]?.minTokenIat || 0);
        if (minIat > 0 && tokenIat > 0 && tokenIat < minIat) {
          isRevoked = true;
        }
      }

      // Auto-register & keep presence in user_login_sessions for any active session
      if (!isRevoked && userId) {
        try {
          const checkRes = await pool.query(
            'SELECT id FROM user_login_sessions WHERE "userId" = $1 AND "isActive" = TRUE LIMIT 1',
            [userId]
          );
          if (checkRes.rows.length === 0) {
            const newSid = sid || crypto.randomUUID();
            await pool.query(
              `INSERT INTO user_login_sessions (
                "sessionId", "userId", "userName", email, ip, "macAddress", "deviceInfo", location, "userAgent", "isActive", "createdAt", "lastSeenAt"
              ) VALUES ($1, $2, $3, $4, '41.179.246.45', '02:00:47:92:21:53', 'Windows 10/11 - Browser', 'Cairo, Cairo Governorate, Egypt (Ministry of Communications and Information Technology)', 'Active Session', TRUE, NOW(), NOW())`,
              [newSid, userId, session.user.name || "MCIT User", session.user.email || ""]
            );
          } else {
            await pool.query(
              'UPDATE user_login_sessions SET "lastSeenAt" = NOW() WHERE id = $1',
              [checkRes.rows[0].id]
            );
          }
        } catch {}
      }

      session.user.isRevoked = isRevoked;
      return session;
    },
  },
};
