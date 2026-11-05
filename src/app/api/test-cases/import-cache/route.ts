import { revalidatePath, revalidateTag } from "next/cache";

// Bearer authentication goes to the existing backend, never to a local DB.
// No cookie authentication: cross-origin pages cannot trigger this via CSRF.
export async function POST(request: Request) {
  const headers = { Authorization: request.headers.get("authorization") || "" };
  if (!headers.Authorization.startsWith("Bearer "))
    return Response.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base)
    return Response.json(
      { message: "Backend is not configured" },
      { status: 503 },
    );
  try {
    const me = await fetch(`${base}/api/auth/me`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!me.ok)
      return Response.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    if ((await me.json()).role !== "admin")
      return Response.json(
        { message: "Administrator access required" },
        { status: 403 },
      );
    const { batchHash } = await request.json();
    if (typeof batchHash !== "string" || !/^[a-f0-9]{64}$/.test(batchHash))
      return Response.json({ message: "Invalid batch hash" }, { status: 400 });
    const response = await fetch(
      `${base}/api/test-cases/bulk-import/garage/${batchHash}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok || !(await response.json()).verified)
      return Response.json(
        { message: "A verified persisted import is required" },
        { status: 409 },
      );
    for (const tag of [
      "test-cases",
      "dashboard-stats",
      "dashboard",
      "projects",
      "users",
    ])
      revalidateTag(tag, { expire: 0 });
    for (const path of ["/test-cases", "/dashboard", "/projects", "/users"])
      revalidatePath(path);
    return Response.json(
      { invalidated: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Unable to verify the import with the backend" },
      { status: 503 },
    );
  }
}
