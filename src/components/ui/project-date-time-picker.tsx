"use client";

import { CalendarDays, ChevronDown, Clock3 } from "lucide-react";
import { useState } from "react";
import { cairoInputToUtc, toCairoInput } from "@/lib/project-time";
import { clockParts, combineClock } from "@/lib/schedule-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScheduleCalendar } from "./schedule-calendar";

export function ProjectDateTimePicker({
  id,
  label,
  value,
  onChange,
  isRTL,
  disabled,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isRTL: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => clockParts(value));
  const [invalid, setInvalid] = useState(false);
  const today = toCairoInput(new Date().toISOString()).slice(0, 10);
  const draftValue = combineClock(
    draft.day,
    draft.hour,
    draft.minute,
    draft.period,
  );
  const invalidMessage = isRTL
    ? "هذا الوقت غير متاح أو متكرر بسبب التوقيت الصيفي بالقاهرة. اختر وقتاً آخر."
    : "This Cairo time is missing or repeated at a daylight-saving transition. Choose another time.";
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(clockParts(value));
          setInvalid(false);
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-labelledby={`${id}-label ${id}-value`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "h-auto min-h-16 w-full justify-between gap-3 rounded-xl border-slate-200 bg-white px-3.5 py-3.5 text-start font-normal shadow-xs hover:border-[#00A2D2]/50 hover:bg-cyan-50/30",
              error && "border-red-400",
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eff9fc] text-[#00A2D2]">
            <CalendarDays className="size-4" />
          </span>
          <span
            id={`${id}-value`}
            className={cn(
              "whitespace-normal text-xs leading-relaxed",
              value ? "font-semibold text-slate-800" : "text-slate-400",
            )}
          >
            {value
              ? new Intl.DateTimeFormat(isRTL ? "ar-EG" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                  hour12: true,
                }).format(new Date(`${value}:00Z`))
              : isRTL
                ? "اختر التاريخ والوقت"
                : "Select date and time"}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
      </PopoverTrigger>
      <PopoverContent
        align={isRTL ? "end" : "start"}
        dir={isRTL ? "rtl" : "ltr"}
        aria-label={label}
        className="w-[min(340px,calc(100vw-24px))] max-h-[min(680px,85dvh)] overflow-y-auto rounded-2xl border border-slate-100 p-0 shadow-2xl shadow-slate-900/15"
      >
        <div className="border-b border-slate-100 bg-linear-to-b from-[#f0faff] to-white px-5 py-4">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {isRTL ? "توقيت القاهرة" : "Cairo time"} · Africa/Cairo
          </p>
        </div>
        <div className="px-4 pt-4">
          <ScheduleCalendar
            key={open ? "open" : "closed"}
            value={draft.day}
            onChange={(day) => {
              setDraft((old) => ({ ...old, day }));
              setInvalid(false);
            }}
            today={today}
            isRTL={isRTL}
          />
        </div>
        <div className="mx-5 mt-3 border-t border-slate-100 py-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Clock3 className="size-3.5 text-[#00A2D2]" />
            {isRTL ? "اختيار الوقت" : "Select time"}
          </p>
          <div className="flex items-center gap-2" dir="ltr">
            {(["hour", "minute"] as const).map((part) => (
              <select
                key={part}
                aria-label={
                  part === "hour"
                    ? isRTL
                      ? "الساعة"
                      : "Hour"
                    : isRTL
                      ? "الدقيقة"
                      : "Minute"
                }
                value={draft[part]}
                onChange={(e) => {
                  setDraft((old) => ({ ...old, [part]: e.target.value }));
                  setInvalid(false);
                }}
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-[#00A2D2]"
              >
                {Array.from({ length: part === "hour" ? 12 : 60 }, (_, i) =>
                  String(part === "hour" ? i + 1 : i).padStart(2, "0"),
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ))}
            <div className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
              {["AM", "PM"].map((period) => (
                <button
                  key={period}
                  type="button"
                  aria-label={
                    period === "AM"
                      ? isRTL
                        ? "صباحاً"
                        : "AM"
                      : isRTL
                        ? "مساءً"
                        : "PM"
                  }
                  aria-pressed={draft.period === period}
                  onClick={() => {
                    setDraft((old) => ({ ...old, period }));
                    setInvalid(false);
                  }}
                  className={cn(
                    "h-8 rounded-lg px-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-[#00A2D2]",
                    draft.period === period
                      ? "bg-white text-[#00A2D2] shadow-xs"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          {invalid && (
            <p
              role="alert"
              className="mt-3 text-xs leading-relaxed text-red-600"
            >
              {invalidMessage}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {isRTL ? "مسح" : "Clear"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setOpen(false)}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draft.day}
              className="px-5 text-xs"
              onClick={() => {
                if (!cairoInputToUtc(draftValue)) {
                  setInvalid(true);
                  return;
                }
                onChange(draftValue);
                setOpen(false);
              }}
            >
              {isRTL ? "تطبيق" : "Apply"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
