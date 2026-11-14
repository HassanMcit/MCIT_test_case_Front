import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/app/myUtil";
import { extractSafeDataUrl, parseSafeDataUrl } from "@/lib/avatar";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

function decodeBase64ToBytes(base64Body: string): Uint8Array | null {
  try {
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
  const session = await getCurrentUserSession();
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
      if (safeDataUrl) {
        const parsed = parseSafeDataUrl(safeDataUrl);
        if (parsed) {
          const bytes = decodeBase64ToBytes(parsed.base64Body);
          if (bytes && bytes.byteLength > 0) {
            const hasVersion = Boolean(req.nextUrl.searchParams.get("v"));
            return new NextResponse(new Uint8Array(bytes), {
              status: 200,
              headers: {
                "Content-Type": parsed.mimeType,
                "Content-Length": String(bytes.byteLength),
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": hasVersion
                  ? "private, max-age=300, stale-while-revalidate=600"
                  : "private, no-cache, must-revalidate",
              },
            });
          }
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
