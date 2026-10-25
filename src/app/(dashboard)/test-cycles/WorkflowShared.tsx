"use client";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import type { Definition, ExecutionStatus, Summary } from "./workflow.types";
export const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00aee0]";
export function useWords() {
  const { dir, lang } = useLanguage();
  return {
    dir,
    lang,
    ar: dir === "rtl",
    w: (en: string, ar: string) => (dir === "rtl" ? ar : en),
  };
}
export function StatusBadge({ status }: { status: string }) {
  const { w } = useWords();
  const labels: Record<string, [string, string]> = {
    not_run: ["Not Run", "لم يُنفذ"],
    passed: ["Passed", "ناجح"],
    failed: ["Failed", "فاشل"],
    blocked: ["Blocked", "متعذر"],
    skipped: ["Skipped", "متخطى"],
    planning: ["Planning", "التخطيط"],
    active: ["Active", "نشط"],
    testing: ["Testing", "قيد الاختبار"],
    released: ["Released", "تم الإصدار"],
    archived: ["Archived", "مؤرشف"],
    completed: ["Completed", "مكتمل"],
  };
  const color =
    status === "passed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : status === "blocked"
          ? "bg-amber-50 text-amber-800"
          : "bg-sky-50 text-sky-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${color}`}
    >
      {labels[status] ? w(...labels[status]) : status}
    </span>
  );
}
export const executionStatuses: ExecutionStatus[] = [
  "not_run",
  "passed",
  "failed",
  "blocked",
  "skipped",
];
export function ProgressSummary({ summary: s }: { summary: Summary }) {
  const { w } = useWords();
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold">
        <span>
          {s.executed} / {s.total} {w("executed", "تم تنفيذها")}
        </span>
        <span>{s.progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={s.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={w("Execution progress", "تقدم التنفيذ")}
      >
        <div
          className="h-full bg-[#00a2d2] transition-all"
          style={{ width: `${s.progress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["passed", s.passed],
            ["failed", s.failed],
            ["blocked", s.blocked],
            ["skipped", s.skipped],
            ["not_run", s.notRun],
          ] as const
        ).map(([status, n]) => (
          <div key={status} className="rounded-xl border border-slate-100 p-3">
            <StatusBadge status={status} />
            <div className="mt-2 text-2xl font-bold">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (n: number) => void;
}) {
  const { w } = useWords();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-slate-500">
      <span>
        {total} {w("records", "سجل")} · {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {w("Previous", "السابق")}
        </Button>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {w("Next", "التالي")}
        </Button>
      </div>
    </div>
  );
}
export function DefinitionView({ definition: d }: { definition: Definition }) {
  const { w } = useWords();
  let steps: string[] = [];
  try {
    steps = Array.isArray(d.steps) ? d.steps : JSON.parse(d.steps || "[]");
  } catch {
    steps = [String(d.steps || "")];
  }
  return (
    <div className="space-y-4 text-sm">
      <div>
        <span className="font-mono text-xs text-[#0089b0]">{d.testId}</span>
        <h3 className="mt-1 text-lg font-bold">{d.scenario}</h3>
      </div>
      <div>
        <h4 className="mb-1 font-semibold">
          {w("Preconditions", "الشروط المسبقة")}
        </h4>
        <p className="whitespace-pre-wrap text-slate-600">
          {d.preConditions || "—"}
        </p>
      </div>
      <div>
        <h4 className="mb-1 font-semibold">{w("Steps", "الخطوات")}</h4>
        <ol className="list-inside list-decimal space-y-2 text-slate-600">
          {steps.map((step, i) => (
            <li className="whitespace-pre-wrap" key={i}>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl bg-emerald-50 p-4">
        <h4 className="mb-1 font-semibold text-emerald-800">
          {w("Expected result", "النتيجة المتوقعة")}
        </h4>
        <p className="whitespace-pre-wrap text-emerald-900">
          {d.expectedResult}
        </p>
      </div>
    </div>
  );
}
