"use server";

import { getUserToken } from "@/app/myUtil";
import { AddNewUserResponse, AddUserType } from "./adduser.interface";
import { revalidatePath } from "next/cache";

export async function addNewUser(data: AddUserType) {
  const token = await getUserToken();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: "force-cache"
  });

  const result: AddNewUserResponse = await response.json();
  if(result.error) {
    throw new Error(result.message)
  }
  revalidatePath('/users')
  revalidatePath('/assign-projects')
  return true
//   return result;
}