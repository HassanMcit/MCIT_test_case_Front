import * as zod from "zod";
import { getLoginSchema } from "./login.zod";

export type LoginSchemaType = zod.infer<ReturnType<typeof getLoginSchema>>;

export interface LoginResponseType {
  access_token: string;
  user: User;
  message: string;
  error: string;
  statusCode: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  photo?: string | null;
}
