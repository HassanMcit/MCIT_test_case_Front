"use client";

import { CalendarDays, Globe2, UserRoundPlus } from "lucide-react";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { ProjectDateTimePicker } from "@/components/ui/project-date-time-picker";
import {
  type AssignableProjectUser,
  ProjectUserCombobox,
} from "@/components/ui/project-user-combobox";

export interface ProjectScheduleValues {
  startAt: string;
  endAt: string;
  assignedTesterId: string;
}

export default function ProjectScheduleFields({
  value,
  onChange,
  users,
  isRTL,
  errors = {},
  disabled,
  loading,
  loadError,
  onRetry,
}: {
  value: ProjectScheduleValues;
  onChange: (key: keyof ProjectScheduleValues, value: string) => void;
  users: AssignableProjectUser[];
  isRTL: boolean;
  errors?: Partial<Record<keyof ProjectScheduleValues, string>>;
  disabled?: boolean;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      dir={isRTL ? "rtl" : "ltr"}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <div className="flex items-start gap-3.5 border-b border-[#dceef6] bg-linear-to-r from-[#edf8fd] via-[#f3faff] to-[#f7fcfe] px-5 py-5 sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white bg-white/85 text-[#00A2D2] shadow-xs">
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0">
          <h3
            id={`${id}-title`}
            className="text-sm font-bold leading-relaxed text-[#0b1c30]"
          >
            {isRTL
              ? "الجدول الزمني وإسناد المستخدم"
              : "Schedule and User Assignment"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {isRTL
              ? "حدد الجدول الزمني للمشروع وأسند أحد أعضاء الفريق اختيارياً."
              : "Define the project timeline and optionally assign a team member."}
          </p>
        </div>
      </div>
      <div className="space-y-6 px-5 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {(["startAt", "endAt"] as const).map((key) => {
            const label =
              key === "startAt"
                ? isRTL
                  ? "تاريخ ووقت بداية المشروع"
                  : "Project Start Date & Time"
                : isRTL
                  ? "تاريخ ووقت نهاية المشروع"
                  : "Project End Date & Time";
            return (
              <div key={key} className="min-w-0 space-y-2.5">
                <Label
                  id={`${id}-${key}-label`}
                  htmlFor={`${id}-${key}`}
                  className="text-xs font-semibold leading-relaxed text-slate-700"
                >
                  {label}
                  <span aria-hidden="true" className="text-[#00A2D2]">
                    *
                  </span>
                  <span className="sr-only">
                    {isRTL ? "مطلوب" : "Required"}
                  </span>
                </Label>
                <ProjectDateTimePicker
                  id={`${id}-${key}`}
                  label={label}
                  value={value[key]}
                  onChange={(next) => onChange(key, next)}
                  isRTL={isRTL}
                  disabled={disabled}
                  error={errors[key]}
                />
                {errors[key] && (
                  <p
                    id={`${id}-${key}-error`}
                    role="alert"
                    className="text-xs leading-relaxed text-red-600"
                  >
                    {errors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
          <Globe2 className="mt-0.5 size-3.5 shrink-0 text-[#00A2D2]" />
          <span>
            {isRTL
              ? "جميع الأوقات بتوقيت القاهرة (Africa/Cairo)، مع مراعاة التوقيت الصيفي تلقائياً."
              : "All times use Africa/Cairo, with daylight saving time handled automatically."}
          </span>
        </div>
        <div className="space-y-2.5 border-t border-slate-100 pt-5">
          <Label
            id={`${id}-user-label`}
            htmlFor={`${id}-user`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700"
          >
            <UserRoundPlus className="size-3.5 text-[#00A2D2]" />
            {isRTL ? "إسناد مستخدم (اختياري)" : "Assign User (Optional)"}
          </Label>
          <ProjectUserCombobox
            id={`${id}-user`}
            value={value.assignedTesterId}
            onChange={(next) => onChange("assignedTesterId", next)}
            users={users}
            isRTL={isRTL}
            disabled={disabled}
            loading={loading}
            loadError={loadError}
            error={errors.assignedTesterId}
            onRetry={onRetry}
          />
        </div>
      </div>
    </section>
  );
}
