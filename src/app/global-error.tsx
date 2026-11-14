"use client"; // Error boundaries must be Client Components

import ErrorRecovery from "@/components/ErrorRecovery";

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <ErrorRecovery error={error} retry={retry ?? reset} fullPage />
      </body>
    </html>
  );
}
