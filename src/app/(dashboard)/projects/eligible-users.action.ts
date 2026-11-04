"use server";

import { getUserToken } from "@/app/myUtil";
import type { AssignableProjectUser } from "@/components/ui/project-user-combobox";
import { appFetch } from "@/lib/app-fetch";

export async function getEligibleProjectUsers(): Promise<
  AssignableProjectUser[]
> {
  const token = await getUserToken();
  if (!token) throw new Error("Authentication required");
  const res = await appFetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/assignable`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "force-cache",
      next: { tags: ["users"], revalidate: 60 },
    },
  );
  if (!res.ok) throw new Error("Could not load assignable users");
  return res.json();
}
