import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const backendBase = (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");

  const headers = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };

  if (!token) {
    return new Response(
      `data: ${JSON.stringify({ type: "UNAUTHORIZED" })}\n\n`,
      { status: 200, headers }
    );
  }

  if (!backendBase) {
    return new Response(`data: ${JSON.stringify({ type: "PING" })}\n\n`, {
      status: 200,
      headers,
    });
  }

  try {
    const upstream = await fetch(
      `${backendBase}/api/users/notifications/stream`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        signal: req.signal,
      }
    );

    if (upstream.status === 401) {
      return new Response(
        `data: ${JSON.stringify({ type: "UNAUTHORIZED" })}\n\n`,
        { status: 200, headers }
      );
    }

    if (!upstream.ok || !upstream.body) {
      return new Response(`data: ${JSON.stringify({ type: "PING" })}\n\n`, {
        status: 200,
        headers,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(`data: ${JSON.stringify({ type: "PING" })}\n\n`, {
      status: 200,
      headers,
    });
  }
}
