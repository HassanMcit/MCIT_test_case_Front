"use server";
import { appFetch } from "@/lib/app-fetch";

import { getUserToken } from "@/app/myUtil";
import { ChangeProfileResponseType, UserDataResponse } from "./changeProfile.interface";
import { updateTag } from "next/cache";

export async function changeProfileImage(data: FormData) {
  const token = await getUserToken();
  const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: data,
    cache: "no-store",
  });

  const resData: ChangeProfileResponseType = await response.json();

  updateTag("user-me");
  updateTag("users");
  updateTag("dashboard");
  return { message: resData.message, photo: resData.photo };
}

export async function getUserData(): Promise<UserDataResponse> {
  const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${await getUserToken()}`,
    },
    cache: "no-store",
  });

  const resData: UserDataResponse = await response.json();
  return resData;
}
