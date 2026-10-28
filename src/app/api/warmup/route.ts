import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_BASE_URL;

  // 1. Warm PostgreSQL pool in parallel (non-blocking if slow)
  pool.query("SELECT 1").catch(() => {});

  // 2. Wake up Render backend in the background; wait at most 1200ms before returning
  let backendAwake = false;
  if (backendUrl) {
    const pingPromise = fetch(`${backendUrl}/api/health`, {
      method: "GET",
      cache: "no-store",
    })
      .catch(() =>
        fetch(backendUrl, {
          method: "GET",
          cache: "no-store",
        })
      )
      .then(() => {
        backendAwake = true;
      })
      .catch(() => {});

    await Promise.race([
      pingPromise,
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  }

  return NextResponse.json(
    { ok: true, status: backendAwake ? "awake" : "warming" },
    { status: 200 }
  );
}
