import { LoginResponseType } from "@/app/login/login.interface";
import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import * as crypto from "node:crypto";

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
    } & import("next-auth").DefaultSession["user"];
  }
}

export const authConfig: NextAuthConfig = {
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(credential),
        });

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

        return { name, email, image: photo, access_token, role, id: String(id), sid: sessionId };
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
        if (newImage) {
          token.picture = newImage;
        }
      }

      return token;
    },

    session: function ({ session, token }) {
      session.user.role = token.role as string;
      session.user.image = (token.picture as string) || session.user?.image;
      session.user.loginAt = token.loginAt as number;
      session.user.loginDate = token.loginDate as string;
      session.user.id = token.id as string;
      session.user.sid = token.sid as string | undefined;
      return session;
    },
  },
};
