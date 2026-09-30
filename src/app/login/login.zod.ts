import * as zod from "zod";

export const getLoginSchema = (t: (key: string) => string) =>
  zod.object({
    email: zod.string().regex(
      /^[a-zA-Z0-9._%+-]+@mcit\.gov\.eg$/,
      t("error_email_regex")
    ),
    password: zod.string().regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
      t("error_password_regex")
    ),
  });