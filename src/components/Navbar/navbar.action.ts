"use server"

import { getUserToken } from "@/app/myUtil"
import { ChangeProfileResponseType, UserDataResponse } from "./changeProfile.interface";

export async function changeProfileImage(data: FormData) {
    const token = await getUserToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: data
    })

    const resData: ChangeProfileResponseType = await response.json();

    
    return { message: resData.message, photo: resData.photo };
}


export async function getUserData():Promise<UserDataResponse> {
    // const token = ;
    // console.log(token);
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${await getUserToken()}`
        },
    })

    const resData: UserDataResponse = await response.json();

    return resData
}