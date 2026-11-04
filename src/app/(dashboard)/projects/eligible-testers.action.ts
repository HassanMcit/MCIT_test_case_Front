"use server";
import { getUserToken } from "@/app/myUtil";
import { appFetch } from "@/lib/app-fetch";
import type { EligibleTester } from "./ProjectScheduleFields";
export async function getEligibleTesters(): Promise<EligibleTester[]> {
  const token = await getUserToken();
  if (!token) throw new Error("Authentication required");
  const res = await appFetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/testers`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "force-cache",
      next: { tags: ["users"], revalidate: 60 },
    },
  );
  if (!res.ok) throw new Error("Could not load testers");
  return res.json();
}
