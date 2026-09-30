"use client";

import { SessionProvider } from "next-auth/react";

function MySession({ children }: { children?: React.ReactNode }) {
  return <SessionProvider >{children}</SessionProvider>;
}

export default MySession;
