import NextAuth from "next-auth";
import { authConfig } from "../../../../../authjsConfig/authjsConfig";

const {handlers:{GET, POST}} = NextAuth(authConfig)

export {GET, POST}