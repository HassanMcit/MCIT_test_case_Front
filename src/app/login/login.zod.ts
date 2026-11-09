import * as zod from "zod";
import { accountEmailPattern, allowsSyntheticEmails } from "@/lib/account-email";

export const getLoginSchema = (t: (key: string) => string) =>
  zod.object({
    email: zod.string().regex(
      accountEmailPattern(),
      t(allowsSyntheticEmails() ? "error_email_regex_staging" : "error_email_regex")
    ),
    password: zod.string().regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
      t("error_password_regex")
    ),
  });
