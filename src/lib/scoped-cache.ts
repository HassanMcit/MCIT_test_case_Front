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
  const cached =
    options.revalidate === 0
      ? async (_scope: string, ...args: A) => read(...args)
      : unstable_cache(
          async (_scope: string, ...args: A) => read(...args),
          keyParts,
          { ...options, revalidate: options.revalidate ?? 60 },
        );
  return async (...args: A): Promise<R> => {
    const user = await getCurrentUserSession();
    if (!user?.id) throw new Error("Authentication required");
    return cached(`${user.id}:${user.role}:${user.cacheRevision}`, ...args);
  };
}

/** Only for read models that every authenticated role is allowed to see.
 * Never put sessions, directories, assignments, or assessment notes here.
 * Authentication stays outside the persistent cache, including on a cache hit.
 */
export function authenticatedSharedCache<A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
  keyParts: string[],
  options: { tags?: string[]; revalidate?: number | false } = {},
) {
  const cached =
    options.revalidate === 0
      ? async (_revision: string, ...args: A) => read(...args)
      : unstable_cache(
          async (_revision: string, ...args: A) => read(...args),
          ["authenticated-shared-v1", ...keyParts],
          { ...options, revalidate: options.revalidate ?? 60 },
        );
  return async (...args: A): Promise<R> => {
    const user = await getCurrentUserSession();
    if (!user?.id) throw new Error("Authentication required");
    return cached(user.cacheRevision, ...args);
  };
}
