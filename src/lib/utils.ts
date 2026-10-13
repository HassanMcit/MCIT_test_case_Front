export { cn } from "cn"

/**
 * Returns a "YYYY-MM-DD" key for the given date in the user's LOCAL timezone.
 * (Using toISOString() would give the UTC day, which shifts records across days
 *  for users in UTC+03:00 between midnight and 03:00.)
 */
export function toLocalDateKey(input: string | number | Date | null | undefined): string | null {
  if (input === null || input === undefined || input === "") return null;
  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else if (typeof input === "string") {
    // Support "YYYY-MM-DD HH:mm:ss" (no "T") which some browsers fail to parse
    d = new Date(input.includes("T") ? input : input.replace(" ", "T"));
  } else {
    d = new Date(input);
  }
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
