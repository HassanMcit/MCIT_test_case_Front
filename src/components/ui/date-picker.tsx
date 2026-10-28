"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn, toLocalDateKey } from "@/lib/utils"

export interface DatePickerProps {
  /** Selected date key in "YYYY-MM-DD" format ("" or "all" means unselected) */
  value?: string
  /** Callback emitting "YYYY-MM-DD" when selected, or "" when cleared */
  onChange: (dateKey: string) => void
  placeholder?: string
  /** Optional prefix shown before the formatted date when selected (e.g., "From:" / "من:") */
  prefixLabel?: string
  locale?: "en" | "ar"
  align?: "start" | "center" | "end"
  disabled?: boolean
  allowClear?: boolean
  clearLabel?: string
  highlightedDates?: Map<string, { total: number; failed: number }>
  hasError?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value = "",
  onChange,
  placeholder,
  prefixLabel,
  locale = "en",
  align,
  disabled = false,
  allowClear = true,
  clearLabel,
  highlightedDates,
  hasError = false,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isRTL = locale === "ar"

  const normalizedValue = value && value !== "all" ? value.slice(0, 10) : ""

  const selectedDateObj = React.useMemo(() => {
    if (!normalizedValue) return undefined
    const [y, m, d] = normalizedValue.split("-").map(Number)
    if (!y || !m || !d) return undefined
    return new Date(y, m - 1, d)
  }, [normalizedValue])

  const formattedDate = React.useMemo(() => {
    if (!selectedDateObj) return ""
    const dateText = selectedDateObj.toLocaleDateString(
      isRTL ? "ar-EG" : "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    )
    return prefixLabel ? `${prefixLabel} ${dateText}` : dateText
  }, [selectedDateObj, isRTL, prefixLabel])

  const defaultPlaceholder = isRTL ? "اختر التاريخ" : "Pick a date"
  const resolvedAlign = align || (isRTL ? "end" : "start")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-10 px-3 rounded-xl text-xs shadow-2xs cursor-pointer transition-colors",
              normalizedValue
                ? "bg-[#eff4ff]/80 border-[#00A2D2]/40 text-[#0b1c30] font-semibold hover:bg-[#e5efff]"
                : "bg-white border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-[#0b1c30]",
              hasError && "border-red-400 bg-red-50/30 text-red-700",
              className
            )}
          />
        }
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          <CalendarIcon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              hasError
                ? "text-red-500"
                : normalizedValue
                ? "text-[#00A2D2]"
                : "text-slate-400"
            )}
          />
          <span className="truncate">
            {formattedDate || placeholder || defaultPlaceholder}
          </span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align={resolvedAlign}
      >
        <Calendar
          mode="single"
          selected={selectedDateObj}
          locale={locale}
          highlightedDates={highlightedDates}
          onSelect={(d) => {
            const nextKey = d ? toLocalDateKey(d) || "" : ""
            if (!nextKey && !allowClear) {
              setOpen(false)
              return
            }
            onChange(nextKey)
            setOpen(false)
          }}
        />
        <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/70 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              const todayKey = toLocalDateKey(new Date()) || ""
              onChange(todayKey)
              setOpen(false)
            }}
            className="font-semibold text-[#006685] hover:text-[#00A2D2] transition-colors cursor-pointer"
          >
            {isRTL ? "اليوم" : "Today"}
          </button>

          {allowClear && normalizedValue && (
            <button
              type="button"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className="font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              {clearLabel || (isRTL ? "مسح التاريخ" : "Clear")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
