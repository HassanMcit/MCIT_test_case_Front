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

export function formatActionTimestamp(
  dateStr?: string | null,
  lang: string = "ar"
): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const isAr = lang === "ar";
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");

  if (isAr) {
    const monthsAr = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];
    const day = d.getDate();
    const month = monthsAr[d.getMonth()];
    const year = d.getFullYear();
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year} - ${hours}:${minutes} ${ampm}`;
  } else {
    const monthsEn = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = monthsEn[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} - ${hours}:${minutes} ${ampm}`;
  }
}
