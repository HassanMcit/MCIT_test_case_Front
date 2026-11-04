"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProjectScheduleValues {
  startAt: string;
  endAt: string;
  assignedTesterId: string;
}
export interface EligibleTester {
  id: number;
  name: string;
}

export default function ProjectScheduleFields({
  value,
  onChange,
  testers,
  isRTL,
  errors = {},
  disabled,
  loading,
  loadError,
  onRetry,
}: {
  value: ProjectScheduleValues;
  onChange: (key: keyof ProjectScheduleValues, value: string) => void;
  testers: EligibleTester[];
  isRTL: boolean;
  errors?: Partial<Record<keyof ProjectScheduleValues, string>>;
  disabled?: boolean;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const visible = testers.filter(
    (t) =>
      String(t.id) === value.assignedTesterId ||
      t.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border border-slate-200 p-4"
    >
      <legend className="px-1 text-xs font-bold text-slate-700">
        {isRTL ? "الجدول الزمني والمختبر" : "Schedule and tester"}
      </legend>
      <p className="text-xs text-slate-500">
        {isRTL
          ? "جميع الأوقات بتوقيت القاهرة (Africa/Cairo)، بما في ذلك التوقيت الصيفي."
          : "All times use Africa/Cairo, including daylight saving time."}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["startAt", "endAt"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${id}-${key}`}>
              {key === "startAt"
                ? isRTL
                  ? "تاريخ ووقت بداية المشروع"
                  : "Project Start Date & Time"
                : isRTL
                  ? "تاريخ ووقت نهاية المشروع"
                  : "Project End Date & Time"}{" "}
              *
            </Label>
            <Input
              id={`${id}-${key}`}
              type="datetime-local"
              step="60"
              required
              dir="ltr"
              value={value[key]}
              onChange={(e) => onChange(key, e.target.value)}
              aria-invalid={!!errors[key]}
              aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
            />
            {errors[key] && (
              <p
                id={`${id}-${key}-error`}
                role="alert"
                className="text-xs text-red-600"
              >
                {errors[key]}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-tester`}>
          {isRTL ? "إسناد مختبر (اختياري)" : "Assign Tester (Optional)"}
        </Label>
        <Input
          aria-label={isRTL ? "البحث عن مختبر" : "Search testers"}
          placeholder={isRTL ? "البحث بالاسم..." : "Search by name..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id={`${id}-tester`}
          value={value.assignedTesterId}
          onChange={(e) => onChange("assignedTesterId", e.target.value)}
          disabled={loading}
          className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-[#00A2D2]"
          aria-describedby={`${id}-tester-status`}
        >
          <option value="">{isRTL ? "بدون إسناد" : "Unassigned"}</option>
          {visible.map((tester) => (
            <option key={tester.id} value={String(tester.id)}>
              {tester.name}
            </option>
          ))}
        </select>
        <p
          id={`${id}-tester-status`}
          aria-live="polite"
          className="text-xs text-slate-500"
        >
          {loading
            ? isRTL
              ? "جاري تحميل المختبرين..."
              : "Loading testers..."
            : loadError
              ? isRTL
                ? "تعذر تحميل المختبرين. يمكنك الحفظ بدون إسناد."
                : "Could not load testers. You can save without an assignment."
              : visible.length === 0
                ? isRTL
                  ? "لا يوجد مختبرون مطابقون"
                  : "No matching testers"
                : ""}
        </p>
        {loadError && (
          <button
            type="button"
            className="text-xs text-[#00A2D2] underline"
            onClick={onRetry}
          >
            {isRTL ? "إعادة المحاولة" : "Retry"}
          </button>
        )}
      </div>
    </fieldset>
  );
}
