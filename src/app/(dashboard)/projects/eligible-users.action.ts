"use server";

import { z } from "zod";
import { getCurrentUserSession } from "@/app/myUtil";
import type { AssignableProjectUser } from "@/components/ui/project-user-combobox";
import { appFetch } from "@/lib/app-fetch";

const directorySchema = z.array(
  z.object({
    id: z.coerce.number().int().positive(),
    name: z.string().min(1),
    role: z.string(),
  }),
);

export async function getEligibleProjectUsers(): Promise<
  AssignableProjectUser[]
> {
  // The compatibility endpoint is public on older backends. Keep a fresh admin
  // check here so this server action never exposes a directory to other roles.
  const session = await getCurrentUserSession();
  if (!session?.token) throw new Error("Authentication required");
  if (session.role !== "admin") throw new Error("Admin access required");
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Backend URL is not configured");
  const readDirectory = (path: string) =>
    appFetch(`${base}/api/users/${path}`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "force-cache",
      next: { tags: ["users"], revalidate: 60 },
    });
  let res = await readDirectory("assignable");
  // During a staggered rollout, /assignable is either absent (404) or matched
  // by the old /users/:id route, whose ParseIntPipe returns this specific 400.
  const legacyIdRoute =
    res.status === 400 &&
    (
      await res
        .clone()
        .json()
        .catch(() => null)
    )?.message === "Validation failed (numeric string is expected)";
  if (res.status === 404 || legacyIdRoute) res = await readDirectory("all");
  // Never turn authentication/authorization errors or server failures into a
  // request to the legacy public endpoint.
  if (!res.ok)
    throw new Error(`Could not load assignable users (HTTP ${res.status})`);
  const parsed = directorySchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Invalid user directory response");
  return parsed.data.filter(
    (user) => user.role === "tester" || user.role === "admin",
  );
}
