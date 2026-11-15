import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/app/myUtil";
import {
  extractSafeDataUrl,
  isBackendPhotoProxyUrl,
  isDummyOrDefaultPhoto,
  parseSafeDataUrl,
} from "@/lib/avatar";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

function hasAnySessionCookie(req: NextRequest): boolean {
  if (typeof req.cookies?.has !== "function") return true;
  return SESSION_COOKIE_NAMES.some(
    (name) => req.cookies.has(name) || req.cookies.has(`${name}.0`),
  );
}

function decodeBase64ToBytes(base64Body: string): Uint8Array | null {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(base64Body, "base64");
    }
    const binary = atob(base64Body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasAnySessionCookie(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: Awaited<ReturnType<typeof getCurrentUserSession>> = null;
  try {
    session = await getCurrentUserSession();
  } catch (err) {
    console.error("[avatar route] Session verification error:", err);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "1" } },
    );
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const res = await pool.query(
      'SELECT photo, "profileImage" FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    const row = res.rows[0];
    if (row) {
      const safeDataUrl = extractSafeDataUrl(row.photo, row.profileImage);
      const versionParam = ((req.nextUrl ?? new URL(req.url)).searchParams.get("v") || "").trim();
      const hasStrongVersion = versionParam.length > 0 && versionParam !== "1";
      const cacheControl = hasStrongVersion
        ? "private, max-age=604800, immutable"
        : versionParam
          ? "private, max-age=300, stale-while-revalidate=600"
          : "private, no-cache, must-revalidate";

      if (safeDataUrl) {
        const parsed = parseSafeDataUrl(safeDataUrl);
        if (parsed) {
          const bytes = decodeBase64ToBytes(parsed.base64Body);
          if (bytes && bytes.byteLength > 0) {
            return new NextResponse(new Uint8Array(bytes), {
              status: 200,
              headers: {
                "Content-Type": parsed.mimeType,
                "Content-Length": String(bytes.byteLength),
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": cacheControl,
              },
            });
          }
        }
      }

      for (const candidate of [row.photo, row.profileImage]) {
        if (typeof candidate !== "string") continue;
        const trimmed = candidate.trim();
        if (!trimmed || isDummyOrDefaultPhoto(trimmed) || isBackendPhotoProxyUrl(trimmed)) {
          continue;
        }
        if (trimmed.startsWith("https://")) {
          return NextResponse.redirect(trimmed, {
            status: 302,
            headers: { "Cache-Control": cacheControl },
          });
        }
      }
    }
  } catch (err) {
    console.error("[avatar route] DB read error:", err);
  }

  return NextResponse.redirect(new URL("/avatar.png", req.url), {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
