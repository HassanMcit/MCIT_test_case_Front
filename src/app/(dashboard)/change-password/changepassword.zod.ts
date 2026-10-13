import * as zod from "zod";

export const getChangePasswordSchema = (t: (key: string) => string) =>
  zod
    .object({
      oldPassword: zod.string().regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        t("error_password_regex")
      ),
      newPassword: zod.string().regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        t("error_password_regex")
      ),
      confirmPassword: zod.string().regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        t("error_password_regex")
      ),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("cp_error_mismatch"),
      path: ["confirmPassword"],
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
      message: t("cp_error_same"),
      path: ["newPassword"],
    });