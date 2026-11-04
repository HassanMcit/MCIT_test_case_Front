"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { calendarDays, moveCalendarDate } from "@/lib/schedule-picker";
import { cn } from "@/lib/utils";

export function ScheduleCalendar({
  value,
  onChange,
  today,
  isRTL,
}: {
  value: string;
  onChange: (day: string) => void;
  today: string;
  isRTL: boolean;
}) {
  const id = useId();
  const [focusDay, setFocusDay] = useState(value || today);
  const [view, setView] = useState((value || today).slice(0, 7));
  const root = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = view.split("-").map(Number);
  const month = monthNumber - 1;
  const locale = isRTL ? "ar-EG" : "en-GB";
  const cells = calendarDays(year, month);
  const months = Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, m, 1)),
    ),
  );
  const years = Array.from({ length: 300 }, (_, n) => 1900 + n);
  const changeView = (y: number, m: number) => {
    const target = new Date(Date.UTC(y, m, 1));
    if (target.getUTCFullYear() < 1900 || target.getUTCFullYear() > 2199)
      return;
    const day = target.toISOString().slice(0, 10);
    setView(day.slice(0, 7));
    setFocusDay(day);
  };
  const arrowStyle =
    "flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-cyan-50 hover:text-[#00A2D2] focus-visible:outline-2 focus-visible:outline-[#00A2D2] disabled:opacity-30";
  return (
    <div ref={root} dir={isRTL ? "rtl" : "ltr"} className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className={arrowStyle}
          disabled={view === "1900-01"}
          aria-label={isRTL ? "الشهر السابق" : "Previous month"}
          onClick={() => changeView(year, month - 1)}
        >
          {isRTL ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
        <div className="flex min-w-0 items-center justify-center gap-1">
          <select
            aria-label={isRTL ? "الشهر" : "Month"}
            className="min-w-0 rounded-lg bg-transparent px-1 py-1.5 text-sm font-bold text-slate-800 focus-visible:outline-[#00A2D2]"
            value={month}
            onChange={(e) => changeView(year, Number(e.target.value))}
          >
            {months.map((name, m) => (
              <option key={name} value={m}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label={isRTL ? "السنة" : "Year"}
            className="rounded-lg bg-transparent px-1 py-1.5 text-sm font-bold text-slate-800 focus-visible:outline-[#00A2D2]"
            value={year}
            onChange={(e) => changeView(Number(e.target.value), month)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={arrowStyle}
          disabled={view === "2199-12"}
          aria-label={isRTL ? "الشهر التالي" : "Next month"}
          onClick={() => changeView(year, month + 1)}
        >
          {isRTL ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      </div>
      <span id={`${id}-month`} className="sr-only" aria-live="polite">
        {months[month]} {year}
      </span>
      <table
        aria-labelledby={`${id}-month`}
        className="w-full table-fixed border-separate border-spacing-y-1 text-center"
      >
        <thead>
          <tr>
            {(isRTL
              ? ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"]
              : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
            ).map((name) => (
              <th
                key={name}
                scope="col"
                className="pb-2 text-[11px] font-medium text-slate-400"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={cells[row * 7].value}>
              {cells.slice(row * 7, row * 7 + 7).map((cell) => (
                <td key={cell.value} className="p-0.5">
                  <button
                    type="button"
                    data-day={cell.value}
                    aria-pressed={cell.value === value}
                    tabIndex={cell.value === focusDay ? 0 : -1}
                    aria-label={new Intl.DateTimeFormat(locale, {
                      dateStyle: "full",
                      timeZone: "UTC",
                    }).format(new Date(`${cell.value}T12:00:00Z`))}
                    aria-current={cell.value === today ? "date" : undefined}
                    onFocus={() => setFocusDay(cell.value)}
                    onClick={() => {
                      onChange(cell.value);
                      setFocusDay(cell.value);
                      if (cell.outside) setView(cell.value.slice(0, 7));
                    }}
                    onKeyDown={(event) => {
                      const next = moveCalendarDate(
                        cell.value,
                        event.key,
                        isRTL,
                        event.shiftKey,
                      );
                      if (!next) return;
                      event.preventDefault();
                      setFocusDay(next);
                      setView(next.slice(0, 7));
                      requestAnimationFrame(() =>
                        root.current
                          ?.querySelector<HTMLButtonElement>(
                            `[data-day="${next}"]`,
                          )
                          ?.focus(),
                      );
                    }}
                    className={cn(
                      "mx-auto flex size-8 items-center justify-center rounded-xl text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A2D2] sm:size-9",
                      cell.value === value
                        ? "bg-[#00A2D2] font-bold text-white shadow-md shadow-cyan-500/20"
                        : cell.outside
                          ? "text-slate-300 hover:bg-slate-50"
                          : "text-slate-700 hover:bg-cyan-50 hover:text-[#00A2D2]",
                      cell.value === today &&
                        cell.value !== value &&
                        "ring-1 ring-inset ring-cyan-200 text-[#00A2D2]",
                    )}
                  >
                    {cell.day}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sr-only">
        {isRTL
          ? "استخدم الأسهم للتنقل، وPage Up وPage Down لتغيير الشهر، وEnter للاختيار."
          : "Use arrow keys to navigate, Page Up and Page Down to change month, and Enter to select."}
      </p>
    </div>
  );
}
