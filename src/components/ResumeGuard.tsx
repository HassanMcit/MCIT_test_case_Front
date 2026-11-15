"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_REFRESH_MS = 5 * 60 * 1000;
const CHECK_THROTTLE_MS = 60 * 1000;
const RELOAD_GUARD_KEY = "mcit:last-auto-reload";
const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";

function canAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function isStaleDeploymentError(reason: unknown): boolean {
  const text =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
        ? reason
        : "";
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|Failed to find Server Action/i.test(
    text,
  );
}

/**
 * Recovers open tabs smoothly when returning from laptop sleep or network drops:
 * 1. Pings /api/warmup (waking DB/Hyperdrive + Render backend) and checks the live buildId.
 * 2. If a newer deployment is live, triggers a guarded full reload so stale JS chunks /
 *    Server Action IDs never crash the UI.
 * 3. After >=5m idle or reconnect on the same deployment, refreshes RSC data after warmup.
 */
export default function ResumeGuard() {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);
  const lastActiveAt = useRef<number>(Date.now());
  const lastCheckAt = useRef<number>(0);
  const lastRefreshAt = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<boolean>(false);

  useEffect(() => {
    const scheduleRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < CHECK_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      // Stagger RSC refresh slightly so wakeup warmup & Navbar sync don't peak memory concurrently.
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        router.refresh();
      }, 250);
    };

    const resumeSync = async (forceRefresh: boolean) => {
      if (inFlight.current) return;
      const now = Date.now();
      const away = hiddenAt.current
        ? now - hiddenAt.current
        : now - lastActiveAt.current;
      hiddenAt.current = null;
      lastActiveAt.current = now;

      const longIdle = away >= IDLE_REFRESH_MS;
      if (now - lastCheckAt.current < CHECK_THROTTLE_MS) {
        return;
      }

      inFlight.current = true;
      lastCheckAt.current = now;
      let warmupOk = false;
      try {
        const res = await fetch("/api/warmup", { cache: "no-store" });
        if (res.ok) {
          warmupOk = true;
          const data: { buildId?: string } = await res.json().catch(() => ({}));
          if (CLIENT_BUILD_ID && data.buildId && data.buildId !== CLIENT_BUILD_ID) {
            if (canAutoReload()) {
              window.location.reload();
              return;
            }
          }
        }
      } catch {
        // Ignore transient offline errors; next focus/online event will retry.
      } finally {
        lastCheckAt.current = Date.now();
        inFlight.current = false;
      }

      if (!warmupOk) {
        if (!retryTimerRef.current && (forceRefresh || longIdle)) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            lastCheckAt.current = 0;
            void resumeSync(false);
          }, 2000);
        }
        return;
      }

      if (longIdle || forceRefresh) {
        scheduleRefresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const now = Date.now();
        hiddenAt.current = now;
        lastActiveAt.current = now;
        return;
      }
      void resumeSync(false);
    };

    const onFocus = () => {
      void resumeSync(false);
    };

    const onOnline = () => {
      void resumeSync(true);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isStaleDeploymentError(event.reason) && canAutoReload()) {
        event.preventDefault();
        window.location.reload();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [router]);

  return null;
}
