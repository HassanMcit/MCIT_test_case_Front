import "server-only";
import { getCurrentUserSession } from "@/app/myUtil";

const FRESH_ENDPOINT =
  /^\/api\/(?:auth(?:\/|$)|users\/(?:notifications|profile|sessions)(?:\/|$)|audit-logs(?:\/|$)|health(?:\/|$))|\/(?:export|report)(?:\/|$)/;

/** Cache only authorized GETs. Authorization is checked before every cache lookup. */
export async function appFetch(
  input: string,
  init: RequestInit & {
    next?: { tags?: string[]; revalidate?: number | false };
  } = {},
) {
  const method = (init.method || "GET").toUpperCase();
  if (
    method !== "GET" ||
    FRESH_ENDPOINT.test(new URL(input).pathname) ||
    init.cache === "no-store"
  ) {
    const { next: _next, ...fresh } = init;
    return fetch(input, { ...fresh, cache: "no-store" });
  }
  const user = await getCurrentUserSession();
  if (!user?.token) throw new Error("Authentication required");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${user.token}`);
  // URL + ALL headers are part of the Next.js fetch cache key. The revision is
  // transactionally changed by business writes across both applications.
  headers.set(
    "X-MCIT-Cache-Scope",
    `${user.id}:${user.role}:${user.cacheRevision}`,
  );
  return fetch(input, {
    ...init,
    headers,
    cache: "force-cache",
    next: { ...init.next, revalidate: 60 },
  });
}
