import * as zod from "zod";
import { getChangePasswordSchema } from "./changepassword.zod";

export type ChangePasswordForm = zod.infer<ReturnType<typeof getChangePasswordSchema>>;

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
