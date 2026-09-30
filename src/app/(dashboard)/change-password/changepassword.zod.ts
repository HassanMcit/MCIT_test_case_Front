import * as z from "zod";

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, "cp_error_current_min"),
  newPassword: z.string().min(6, "cp_error_new_min"),
  confirmPassword: z.string().min(6, "cp_error_confirm_min"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "cp_error_mismatch",
  path: ["confirmPassword"],
}).refine((data) => data.oldPassword !== data.newPassword, {
  message: "cp_error_same",
  path: ["newPassword"],
});