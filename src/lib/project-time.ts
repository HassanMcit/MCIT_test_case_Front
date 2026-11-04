export const PROJECT_TIME_ZONE = "Africa/Cairo";

/** HTML datetime-local values represent Cairo wall time, never the browser zone. */
export function toCairoInput(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PROJECT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function cairoInputToUtc(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  const candidates: string[] = [];
  // Cairo uses UTC+02/+03. Round-trip rejects nonexistent DST wall times;
  // ambiguous fall-back times are rejected rather than guessing an instant.
  for (const offset of [120, 180]) {
    const iso = new Date(wall - offset * 60_000).toISOString();
    if (toCairoInput(iso) === value) candidates.push(iso);
  }
  return candidates.length === 1 ? candidates[0] : null;
}

export function formatProjectTime(
  iso: string | null | undefined,
  arabic: boolean,
): string {
  return iso
    ? new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", {
        timeZone: PROJECT_TIME_ZONE,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    : arabic
      ? "غير محدد"
      : "Not scheduled";
}
