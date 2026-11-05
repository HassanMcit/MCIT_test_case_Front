"use client";

import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import Loading from "@/app/loading";

function SessionRevocationGuard({ children }: { children?: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const account = session?.user?.id || session?.user?.email;
  const identity =
    status === "authenticated" && account
      ? `${account}:${session?.user?.sid || ""}:${session?.user?.role || ""}`
      : null;
  const [scope, setScope] = useState<{
    initialized: boolean;
    identity: string | null;
    epoch: number;
  }>({ initialized: false, identity: null, epoch: 0 });
  const [isChangingIdentity, startIdentityTransition] = useTransition();
  const isRevokedHandledRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!scope.initialized) {
      // Learn the initial session without refetching or remounting the SSR tree.
      setScope({ initialized: true, identity, epoch: 0 });
    } else if (scope.identity !== identity) {
      // Auth.js can announce another tab's account change without a reload.
      // Drop old route payloads and private component state at that boundary.
      startIdentityTransition(() => {
        setScope({ initialized: true, identity, epoch: scope.epoch + 1 });
        router.refresh();
      });
    }
  }, [identity, status, scope, router]);

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
    if (
      pathname === "/login" ||
      pathname === "/forget-password" ||
      pathname === "/forgot-password"
    ) {
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

  const changedIdentity =
    scope.initialized && status !== "loading" && scope.identity !== identity;
  if (changedIdentity || isChangingIdentity || session?.user?.isRevoked)
    return <Loading />;
  return <React.Fragment key={scope.epoch}>{children}</React.Fragment>;
}

function MySession({ children }: { children?: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={true}>
      <SessionRevocationGuard>{children}</SessionRevocationGuard>
    </SessionProvider>
  );
}

export default MySession;
