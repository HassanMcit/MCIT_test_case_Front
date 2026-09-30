"use server"

import { getUserToken } from "@/app/myUtil";
import { ChangePasswordForm, ChangePasswordResponse } from "./changepassword.interface";


export async function handleUserChangePassword(data: ChangePasswordForm) {
    // console.log(await getUserToken());
    try {
        const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getUserToken()}`,
          },
          body: JSON.stringify(data),
        }
      );

      const result: ChangePasswordResponse = await res.json();
      

      if(res.ok) {
        return {success: true, message: result.message}
      }

      throw new Error(result.message)
    }
    catch (error) {
        if(error instanceof Error) {
            throw new Error( error.message)
        }
    }
}