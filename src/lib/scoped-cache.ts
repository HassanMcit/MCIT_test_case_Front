import "server-only";
import { unstable_cache } from "next/cache";
import { getCurrentUserSession } from "@/app/myUtil";

// Existing app uses the non-Cache-Components mode; unstable_cache remains
// supported in that mode. Never read cookies inside its persistent cache scope.
export function scopedCache<A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
  keyParts: string[] = [],
  options: { tags?: string[]; revalidate?: number | false } = {},
) {
  const cached = unstable_cache(
    async (_scope: string, ...args: A) => read(...args),
    keyParts,
    { ...options, revalidate: 60 },
  );
  return async (...args: A): Promise<R> => {
    const user = await getCurrentUserSession();
    if (!user?.id) throw new Error("Authentication required");
    return cached(`${user.id}:${user.role}:${user.cacheRevision}`, ...args);
  };
}
