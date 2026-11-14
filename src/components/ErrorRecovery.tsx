"use client";

import { useEffect, useRef, useState } from "react";

const RELOAD_GUARD_KEY = "mcit:last-auto-reload";
const MAX_AUTO_RETRIES = 3;
const RETRY_DELAYS_MS = [2500, 5000, 10000];

/**
 * Errors caused by an old browser tab talking to a newer deployment
 * (stale JS chunks or Server Action IDs). Only a full reload fixes these.
 */
function isStaleDeploymentError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|Server Action|server action|Failed to find Server Action/i.test(
    text,
  );
}

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

export default function ErrorRecovery({
  error,
  retry,
  fullPage = false,
}: {
  error: unknown;
  retry?: () => void;
  fullPage?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.error("[MCIT] Recovering from error:", error);

    if (isStaleDeploymentError(error)) {
      if (canAutoReload()) {
        window.location.reload();
        return;
      }
    }

    // Transient failures (e.g. backend waking up after idle): retry automatically.
    if (attempt < MAX_AUTO_RETRIES && retry) {
      timer.current = setTimeout(() => {
        setAttempt((n) => n + 1);
        retry();
      }, RETRY_DELAYS_MS[attempt] ?? 10000);
    } else {
      setGaveUp(true);
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [error, attempt, retry]);

  return (
    <div
      className={
        fullPage
          ? "min-h-screen flex items-center justify-center bg-[#f8f9ff] p-6"
          : "w-full flex items-center justify-center p-6 min-h-[60vh]"
      }
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {!gaveUp ? (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#00A2D2]/30 border-t-[#00A2D2]" />
            <h2 className="text-lg font-bold text-[#0b1c30]">
              جاري إعادة الاتصال بالخادم...
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Reconnecting to the server, please wait...
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#0b1c30]">
              تعذّر الاتصال بالخادم مؤقتاً
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The server is temporarily unavailable.
            </p>
          </>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {retry && (
            <button
              type="button"
              onClick={() => {
                setGaveUp(false);
                setAttempt(0);
                retry();
              }}
              className="rounded-xl bg-[#00A2D2] px-4 py-2 text-sm font-bold text-white hover:bg-[#0086ac]"
            >
              إعادة المحاولة / Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#0b1c30] hover:bg-slate-50"
          >
            تحديث الصفحة / Reload
          </button>
        </div>
      </div>
    </div>
  );
}
