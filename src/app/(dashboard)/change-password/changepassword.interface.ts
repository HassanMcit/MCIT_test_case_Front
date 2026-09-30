import * as z from "zod";
import { changePasswordSchema } from "./changepassword.zod";

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;


export interface ChangePasswordResponse {
  message: string
  error: string
  statusCode: number
}
