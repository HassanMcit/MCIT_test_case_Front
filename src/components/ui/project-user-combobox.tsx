"use client";

import { Combobox } from "@base-ui/react/combobox";
import {
  Check,
  ChevronDown,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";

export interface AssignableProjectUser {
  id: number;
  name: string;
  role: string;
}
type UserOption = { id: string; name: string; role: string | null };

export function ProjectUserCombobox({
  id,
  value,
  onChange,
  users,
  isRTL,
  disabled,
  loading,
  loadError,
  error,
  onRetry,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  users: AssignableProjectUser[];
  isRTL: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadError?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const options = useMemo<UserOption[]>(
    () => [
      { id: "", name: isRTL ? "بدون إسناد" : "Unassigned", role: null },
      ...users.map((user) => ({ ...user, id: String(user.id) })),
    ],
    [users, isRTL],
  );
  const selected = options.find((user) => user.id === value) || null;
  const roleLabel = (role: string) =>
    role === "admin"
      ? isRTL
        ? "مدير"
        : "Admin"
      : role === "tester"
        ? isRTL
          ? "مختبر"
          : "Tester"
        : role;
  const roleBadge = (role: string) => (
    <span
      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${role === "admin" ? "border-violet-100 bg-violet-50 text-violet-600" : "border-cyan-100 bg-cyan-50 text-cyan-700"}`}
    >
      {roleLabel(role)}
    </span>
  );
  return (
    <div className="space-y-2">
      <Combobox.Root
        items={options}
        value={selected}
        onValueChange={(user) => onChange(user?.id || "")}
        itemToStringLabel={(user) => user.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        filter={(user, query) =>
          `${user.name} ${user.role || ""} ${user.role ? roleLabel(user.role) : ""}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())
        }
        disabled={disabled || loading}
      >
        <Combobox.Trigger
          type="button"
          id={id}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-describedby={`${id}-status`}
          aria-invalid={!!error}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-start shadow-xs transition hover:border-[#00A2D2]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A2D2] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <UserRound className="size-4" />
            </span>
            <span
              id={`${id}-value`}
              className={`truncate text-sm ${value ? "font-semibold text-slate-800" : "text-slate-500"}`}
            >
              {loading
                ? isRTL
                  ? "جاري تحميل المستخدمين..."
                  : "Loading users..."
                : selected?.name ||
                  (isRTL ? "المستخدم المحدد" : "Selected user")}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {selected?.role && roleBadge(selected.role)}
            <ChevronDown className="size-4 text-slate-400" />
          </span>
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={8}
            align={isRTL ? "end" : "start"}
            className="z-[120] w-[var(--anchor-width)] max-w-[calc(100vw-24px)]"
          >
            <Combobox.Popup
              dir={isRTL ? "rtl" : "ltr"}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 text-slate-800 shadow-2xl shadow-slate-900/15 outline-none"
            >
              <div className="relative m-1 mb-2">
                <Search className="pointer-events-none absolute start-3 top-3 size-4 text-slate-400" />
                <Combobox.Input
                  aria-label={
                    isRTL
                      ? "البحث عن مستخدم بالاسم أو الدور"
                      : "Search users by name or role"
                  }
                  placeholder={
                    isRTL
                      ? "البحث بالاسم أو الدور..."
                      : "Search by name or role..."
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-3 ps-9 text-sm focus:border-[#00A2D2] focus:outline-none focus:ring-2 focus:ring-cyan-100"
                />
              </div>
              <Combobox.Empty className="px-4 py-6 text-center text-xs text-slate-500">
                {isRTL ? "لا توجد نتائج مطابقة" : "No matching users"}
              </Combobox.Empty>
              <Combobox.List className="max-h-56 overflow-y-auto overscroll-contain p-1">
                {(user: UserOption) => (
                  <Combobox.Item
                    key={user.id || "unassigned"}
                    value={user}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm outline-none data-highlighted:bg-[#eff9fc] data-selected:bg-[#f6fbfd]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      {user.id ? (
                        <UserRound className="size-4" />
                      ) : (
                        <UsersRound className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {user.name}
                    </span>
                    {user.role && roleBadge(user.role)}
                    <Combobox.ItemIndicator>
                      <Check className="size-4 text-[#00A2D2]" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={`text-xs leading-relaxed ${error || loadError ? "text-red-600" : "text-slate-400"}`}
      >
        {error ||
          (loadError
            ? isRTL
              ? "تعذر تحميل المستخدمين. يمكنك الحفظ بدون إسناد أو إعادة المحاولة."
              : "Could not load users. Save unassigned or retry."
            : isRTL
              ? "يمكن إسناد المشروع إلى مختبر أو مدير. الإسناد لا يغيّر صلاحيات المستخدم."
              : "Choose a Tester or Admin. Assignment does not change their permissions.")}
      </p>
      {loadError && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRetry}
          className="text-xs font-semibold text-[#00A2D2] underline underline-offset-4"
        >
          {isRTL ? "إعادة المحاولة" : "Retry"}
        </button>
      )}
    </div>
  );
}
