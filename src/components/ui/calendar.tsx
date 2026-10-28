"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn, toLocalDateKey } from "@/lib/utils"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  defaultMonth?: Date
  locale?: "en" | "ar"
  highlightedDates?: Map<string, { total: number; failed: number }>
  className?: string
}

const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const WEEKDAYS_AR = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"]

function isSameDay(a?: Date, b?: Date): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function Calendar({
  selected,
  onSelect,
  defaultMonth,
  locale = "en",
  highlightedDates,
  className,
}: CalendarProps) {
  const today = React.useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = React.useState<Date>(() => {
    const base = selected || defaultMonth || new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  React.useEffect(() => {
    if (selected) {
      setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
    }
  }, [selected])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()

  const monthLabel = React.useMemo(() => {
    return viewMonth.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    })
  }, [viewMonth, locale])

  const days = React.useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const startWeekday = firstOfMonth.getDay() // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7

    const cells: Array<{ date: Date; outside: boolean; key: string }> = []
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(year, month, i - startWeekday + 1)
      const outside = d.getMonth() !== month
      const key = toLocalDateKey(d) || `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      cells.push({ date: d, outside, key })
    }
    return cells
  }, [year, month])

  const handlePrevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const weekdays = locale === "ar" ? WEEKDAYS_AR : WEEKDAYS_EN
  const isRTL = locale === "ar"

  return (
    <div
      data-slot="calendar"
      dir={isRTL ? "rtl" : "ltr"}
      className={cn("p-3.5 w-[272px] select-none bg-popover", className)}
    >
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label={isRTL ? "الشهر السابق" : "Previous month"}
          className="size-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {isRTL ? (
            <ChevronRightIcon className="size-4" />
          ) : (
            <ChevronLeftIcon className="size-4" />
          )}
        </button>

        <div className="text-sm font-semibold text-slate-900 tracking-tight">
          {monthLabel}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label={isRTL ? "الشهر التالي" : "Next month"}
          className="size-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {isRTL ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((wd) => (
          <div
            key={wd}
            className="size-8 flex items-center justify-center text-[12px] font-normal text-muted-foreground"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, outside, key }) => {
          const isSelected = isSameDay(date, selected)
          const isToday = isSameDay(date, today)
          const activity = highlightedDates?.get(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onSelect?.(undefined)
                } else {
                  onSelect?.(date)
                }
              }}
              title={
                activity && activity.total > 0
                  ? isRTL
                    ? `${activity.total} حالة اختبار${activity.failed > 0 ? ` (${activity.failed} فشل)` : ""}`
                    : `${activity.total} test case${activity.total > 1 ? "s" : ""}${activity.failed > 0 ? ` (${activity.failed} failed)` : ""}`
                  : undefined
              }
              className={cn(
                "relative size-8 inline-flex flex-col items-center justify-center rounded-lg text-[13px] font-normal transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00A2D2]/40",
                outside && !isSelected && "text-muted-foreground/60 hover:bg-slate-100/70 hover:text-muted-foreground",
                !outside && !isSelected && !isToday && "text-slate-900 hover:bg-slate-100",
                isToday && !isSelected && "bg-slate-100 text-slate-900 font-medium hover:bg-slate-200/70",
                isSelected && "bg-slate-900 text-white font-semibold shadow-2xs hover:bg-slate-800"
              )}
            >
              <span className="leading-none">{date.getDate()}</span>
              {activity && activity.total > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isSelected
                      ? "bg-[#38bdf8]"
                      : activity.failed > 0
                      ? "bg-rose-500"
                      : "bg-[#00A2D2]"
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
