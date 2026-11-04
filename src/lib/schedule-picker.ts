export type DayCell = { value: string; day: number; outside: boolean };

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function calendarDays(year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((first.getUTCDay() + length) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - first.getUTCDay() + 1));
    return {
      value: dateKey(date),
      day: date.getUTCDate(),
      outside: date.getUTCMonth() !== month,
    };
  });
}

/** Date-only keyboard arithmetic is UTC, independent of the browser's timezone. */
export function moveCalendarDate(
  day: string,
  key: string,
  rtl: boolean,
  shift = false,
): string | null {
  const date = new Date(`${day}T12:00:00Z`);
  const offset = {
    ArrowLeft: rtl ? 1 : -1,
    ArrowRight: rtl ? -1 : 1,
    ArrowUp: -7,
    ArrowDown: 7,
  }[key];
  if (offset !== undefined) date.setUTCDate(date.getUTCDate() + offset);
  else if (key === "Home")
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  else if (key === "End")
    date.setUTCDate(date.getUTCDate() + 6 - date.getUTCDay());
  else if (key === "PageUp" || key === "PageDown") {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(
      date.getUTCMonth() + (key === "PageUp" ? -1 : 1) * (shift ? 12 : 1),
    );
    date.setUTCDate(
      Math.min(
        originalDay,
        new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    );
  } else return null;
  return date.getUTCFullYear() >= 1900 && date.getUTCFullYear() <= 2199
    ? dateKey(date)
    : null;
}

export function clockParts(value: string) {
  const hour = Number(value.slice(11, 13) || 9);
  return {
    day: value.slice(0, 10),
    hour: String(hour % 12 || 12).padStart(2, "0"),
    minute: value.slice(14, 16) || "00",
    period: hour >= 12 ? "PM" : "AM",
  };
}

export function combineClock(
  day: string,
  hour: string,
  minute: string,
  period: string,
) {
  const h = Number(hour),
    m = Number(minute);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 1 ||
    h > 12 ||
    m < 0 ||
    m > 59 ||
    !["AM", "PM"].includes(period)
  )
    return "";
  return `${day}T${String((h % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute.padStart(2, "0")}`;
}
