"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function SessionWatcher() {
  const pathname = usePathname();
  const checkingRef = useRef(false);

  useEffect(() => {
    // Skip checking on login / auth pages
    if (pathname === "/login" || pathname === "/forget-password" || pathname === "/forgot-password") {
      return;
    }

    let isMounted = true;

    const verifySession = async () => {
      if (checkingRef.current) return;
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
            // Invalidate local storage tokens and force immediate redirect to login
            try {
              localStorage.removeItem("access_token");
              localStorage.removeItem("user");
            } catch {}
            window.location.replace("/login?revoked=true");
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

    // 2. Poll every 4 seconds for real-time remote logout
    const interval = setInterval(verifySession, 4000);

    // 3. Check immediately when window gains focus or visibility changes
    const handleFocus = () => verifySession();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [pathname]);

  return null;
}
