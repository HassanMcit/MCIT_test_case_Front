"use client";

import React, { useEffect, useRef } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

function SessionRevocationGuard({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isRevokedHandledRef = useRef(false);

  // Periodic background warm-up ping (every 9 mins) to prevent Render backend Cold Starts
  useEffect(() => {
    const ping = () => {
      fetch("/api/warmup", { cache: "no-store" }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 9 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/forget-password" || pathname === "/forgot-password") {
      return;
    }

    if (session?.user?.isRevoked && !isRevokedHandledRef.current) {
      isRevokedHandledRef.current = true;
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      } catch {}
      signOut({ redirect: true, callbackUrl: "/login" });
    }
  }, [session, pathname]);

  return <>{children}</>;
}

function MySession({ children }: { children?: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={true}>
      <SessionRevocationGuard>{children}</SessionRevocationGuard>
    </SessionProvider>
  );
}

export default MySession;
