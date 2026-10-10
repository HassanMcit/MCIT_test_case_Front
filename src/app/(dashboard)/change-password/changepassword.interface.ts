import * as z from "zod";
import { changePasswordSchema } from "./changepassword.zod";

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export interface ChangePasswordResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
  userId?: number;
}

export interface ChangePasswordActionResult {
  success: boolean;
  status: number;
  message: string;
  messageEn: string;
}
