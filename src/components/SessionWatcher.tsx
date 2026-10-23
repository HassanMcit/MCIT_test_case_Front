"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function SessionWatcher() {
  const pathname = usePathname();
  const checkingRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Skip checking on login / auth pages
    if (
      pathname === "/login" ||
      pathname === "/forget-password" ||
      pathname === "/forgot-password"
    ) {
      return;
    }

    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const purgeCookiesAndRedirect = () => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      if (interval) clearInterval(interval);

      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        const cookieNames = [
          "__Secure-authjs.session-token",
          "authjs.session-token",
          "__Secure-next-auth.session-token",
          "next-auth.session-token",
        ];
        for (const name of cookieNames) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          for (let i = 0; i < 7; i++) {
            document.cookie = `${name}.${i}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          }
        }
      } catch {}

      window.location.replace("/login?revoked=true");
    };

    const verifySession = async () => {
      if (checkingRef.current || redirectedRef.current) return;
      checkingRef.current = true;

      try {
        const res = await fetch("/api/auth/check-session", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!isMounted) return;

        if (res.status === 401 || !res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.valid === false) {
            purgeCookiesAndRedirect();
          }
        }
      } catch {
        // network issue, do not disconnect prematurely
      } finally {
        checkingRef.current = false;
      }
    };

    // 1. Initial check
    verifySession();

    // 2. Poll every 5 seconds for real-time remote logout
    interval = setInterval(verifySession, 5000);

    // 3. Check immediately when window gains focus or visibility changes
    const handleFocus = () => verifySession();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [pathname]);

  return null;
}
