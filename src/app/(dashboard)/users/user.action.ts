"use server";

import { getUserToken } from "@/app/myUtil";
import { GetAllUsersResponse } from "./user.interface";
import { revalidatePath, updateTag } from "next/cache";

export async function getAllUsers() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/users`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await getUserToken()}`,
        },
        next: { tags: ["users"] },
        cache: "no-store"
      },
    );

    if (!response.ok) {
      return [];
    }

    const resData = await response.json();
    return Array.isArray(resData) ? resData : [];
  } catch (error) {
    return [];
  }
}

export async function deleteThisUser(id: number) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${await getUserToken()}`,
    },
  });

  updateTag("users");
  return true;
}
