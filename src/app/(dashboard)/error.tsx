"use client"; // Error boundaries must be Client Components

import ErrorRecovery from "@/components/ErrorRecovery";

export default function DashboardError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  return <ErrorRecovery error={error} retry={retry ?? reset} />;
}
