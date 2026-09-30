"use server";

import { getUserToken } from "@/app/myUtil";
import { GetAllUsersResponse } from "./user.interface";
import { revalidatePath, updateTag } from "next/cache";

export async function getAllUsers() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/users`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${await getUserToken()}`,
      },
      cache: "force-cache",
      next: { tags: ["users"] },
    },
  );

  const resData: GetAllUsersResponse[] = await response.json();
  console.log("res", resData);
  return resData;
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
