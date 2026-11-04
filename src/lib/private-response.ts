import { NextResponse } from "next/server";

/** Authenticated API output must never enter a browser/proxy shared HTTP cache. */
export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}
