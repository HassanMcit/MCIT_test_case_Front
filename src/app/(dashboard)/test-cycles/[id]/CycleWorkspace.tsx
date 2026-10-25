"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Plus, History, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workflowRequest } from "../workflow.action";
import type {
  Cycle,
  CycleItem,
  Definition,
  ExecutionStatus,
  PageData,
} from "../workflow.types";
import {
  DefinitionView,
  executionStatuses,
  fieldClass,
  Pager,
  ProgressSummary,
  StatusBadge,
  useWords,
} from "../WorkflowShared";

const blankPage = <T,>(): PageData<T> => ({
  data: [],
  meta: { page: 1, total: 0, totalPages: 1, limit: 20 },
});
export default function CycleWorkspace({
  id,
  initial,
  initialError,
  isAdmin,
  userId,
}: {
  id: number;
  initial: Cycle | null;
  initialError: string;
  isAdmin: boolean;
  userId: number;
}) {
  const { w, dir } = useWords();
  const [cycle, setCycle] = useState(initial),
    [error, setError] = useState(initialError),
    [items, setItems] = useState<PageData<CycleItem>>(blankPage);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [tester, setTester] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CycleItem | null>(null),
    [actualResult, setActualResult] = useState(""),
    [notes, setNotes] = useState(""),
    [environment, setEnvironment] = useState(""),
    [resultStatus, setResultStatus] = useState<ExecutionStatus>("passed"),
    [duration, setDuration] = useState("");
  const [picker, setPicker] = useState(false),
    [candidateSearch, setCandidateSearch] = useState(""),
    [candidatePage, setCandidatePage] = useState(1),
    [candidates, setCandidates] = useState<PageData<Definition>>(blankPage),
    [chosen, setChosen] = useState<number[]>([]),
    [assignTester, setAssignTester] = useState(""),
    [candidateError, setCandidateError] = useState("");
  const [settings, setSettings] = useState(false),
    [busy, startTransition] = useTransition();
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      const q = new URLSearchParams({
        page: String(page),
        search,
        status,
        testerId: tester,
      });
      if (!tester) q.delete("testerId");
      const c = await workflowRequest<Cycle>(`test-cycles/${id}`);
      const r = await workflowRequest<PageData<CycleItem>>(
        `test-cycles/${id}/items?${q}`,
      );
      if (active) {
        if (c.ok) setCycle(c.data);
        if (r.ok) {
          setItems(r.data);
          setError(c.ok ? "" : c.error);
        } else setError(r.error);
        setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, page, search, status, tester, revision]);
  useEffect(() => {
    if (!picker) return;
    let active = true;
    const timer = setTimeout(async () => {
      const r = await workflowRequest<PageData<Definition>>(
        `test-cycles/${id}/candidates?page=${candidatePage}&search=${encodeURIComponent(candidateSearch)}`,
      );
      if (active) {
        if (r.ok) {
          setCandidates(r.data);
          setCandidateError("");
        } else setCandidateError(r.error);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, picker, candidatePage, candidateSearch, revision]);
  const reload = () => setRevision((x) => x + 1);
  const editable =
    !!cycle &&
    !["completed", "archived"].includes(cycle.status) &&
    !["released", "archived"].includes(cycle.releaseStatus || "");
  const canExecute = (item: CycleItem) =>
    editable &&
    cycle?.status === "active" &&
    (isAdmin || item.testerId === userId);
  const open = (item: CycleItem) => {
    setSelected(item);
    setActualResult("");
    setNotes("");
    setEnvironment(item.environment || cycle?.environment || "staging");
    setResultStatus("passed");
    setDuration("");
  };
  const execute = (outcome: ExecutionStatus) =>
    startTransition(async () => {
      if (!selected) return;
      const response = await workflowRequest(
        `test-cycles/${id}/items/${selected.id}/executions`,
        "POST",
        {
          status: outcome,
          actualResult,
          notes,
          environment,
          ...(duration !== "" ? { durationSeconds: Number(duration) } : {}),
        },
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success(
        w(
          "Execution recorded. Previous attempts are preserved.",
          "تم تسجيل التنفيذ والاحتفاظ بالمحاولات السابقة.",
        ),
      );
      setSelected(null);
      reload();
    });
  const changeCycle = (body: unknown) =>
    startTransition(async () => {
      const r = await workflowRequest(`test-cycles/${id}`, "PATCH", body);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(w("Cycle updated", "تم تحديث الدورة"));
        setSettings(false);
        reload();
      }
    });
  if (!cycle)
    return (
      <div dir={dir} className="p-8">
        <Link href="/test-cycles" className="text-[#0086ac]">
          {w("Back to cycles", "العودة للدورات")}
        </Link>
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
        <Button onClick={reload}>{w("Retry", "إعادة المحاولة")}</Button>
      </div>
    );
  return (
    <div dir={dir} className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/test-cycles" className="text-sm text-[#0086ac]">
        ← {w("Releases & cycles", "الإصدارات والدورات")}
      </Link>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={cycle.status} />
            <span className="text-xs text-slate-500">
              {cycle.projectName} · {cycle.releaseName} · {cycle.version}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{cycle.name}</h1>
          <p className="mt-2 text-sm text-slate-500 whitespace-pre-wrap">
            {cycle.description}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {cycle.startDate || "—"} → {cycle.endDate || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw size={15} />
            {w("Refresh", "تحديث")}
          </Button>
          {isAdmin && editable && (
            <>
              <Button variant="outline" onClick={() => setSettings(true)}>
                {w("Cycle settings", "إعدادات الدورة")}
              </Button>
              <Button
                className="bg-[#006685] text-white"
                onClick={() => {
                  setPicker(true);
                  setChosen([]);
                }}
              >
                <Plus size={16} />
                {w("Add test cases", "إضافة حالات اختبار")}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <ProgressSummary summary={cycle.summary} />
      </div>
      {cycle.status === "planning" && (
        <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
          {w(
            "This cycle is in planning. Add cases and assignments, then activate it to start execution.",
            "هذه الدورة قيد التخطيط. أضف الحالات والإسنادات ثم فعّل الدورة لبدء التنفيذ.",
          )}
        </p>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label={w("Search cases", "بحث الحالات")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={w(
              "Search case ID or scenario…",
              "ابحث بالمعرف أو السيناريو…",
            )}
          />
          <select
            className={`${fieldClass} sm:w-44`}
            aria-label={w("Status", "الحالة")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{w("All statuses", "كل الحالات")}</option>
            {executionStatuses.map((s) => (
              <option key={s} value={s}>
                {
                  {
                    not_run: w("Not Run", "لم يُنفذ"),
                    passed: w("Passed", "ناجح"),
                    failed: w("Failed", "فاشل"),
                    blocked: w("Blocked", "متعذر"),
                    skipped: w("Skipped", "متخطى"),
                  }[s]
                }
              </option>
            ))}
          </select>
          <select
            className={`${fieldClass} sm:w-48`}
            aria-label={w("Tester", "المختبر")}
            value={tester}
            onChange={(e) => {
              setTester(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{w("All testers", "كل المختبرين")}</option>
            {cycle.testers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center">
            {w("Loading cases…", "جار تحميل الحالات…")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  {[
                    w("Test case", "حالة الاختبار"),
                    w("Assigned tester", "المختبر المسند"),
                    w("Latest result", "آخر نتيجة"),
                    w("Execution", "التنفيذ"),
                  ].map((h) => (
                    <th key={h} className="p-3 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="min-w-60 p-3">
                      <span className="font-mono text-xs text-[#0086ac]">
                        {item.snapshot.testId}
                      </span>
                      <p className="mt-1 font-medium">
                        {item.snapshot.scenario}
                      </p>
                      <Link
                        href={`/test-cases/${item.testCaseId}/history`}
                        className="mt-1 inline-flex gap-1 text-xs text-[#0086ac]"
                      >
                        <History size={13} />
                        {w("Execution history", "سجل التنفيذ")}
                      </Link>
                    </td>
                    <td className="p-3">
                      {isAdmin && editable ? (
                        <select
                          aria-label={`${w("Assign tester", "إسناد مختبر")} ${item.snapshot.testId}`}
                          className={`${fieldClass} min-w-40`}
                          value={item.testerId || ""}
                          disabled={busy}
                          onChange={(e) => {
                            const value = e.target.value;
                            startTransition(async () => {
                              const r = await workflowRequest(
                                `test-cycles/${id}/items/${item.id}`,
                                "PATCH",
                                { testerId: value ? Number(value) : null },
                              );
                              if (!r.ok) toast.error(r.error);
                              else reload();
                            });
                          }}
                        >
                          <option value="">
                            {w("Unassigned", "غير مسند")}
                          </option>
                          {cycle.testers?.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.testerName || w("Unassigned", "غير مسند")
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                      {item.executedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(item.executedAt).toLocaleString(
                            dir === "rtl" ? "ar-EG" : "en-US",
                          )}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        variant={canExecute(item) ? "default" : "outline"}
                        onClick={() => open(item)}
                      >
                        {canExecute(item)
                          ? w("Execute", "تنفيذ")
                          : w("View", "عرض")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.data.length && (
              <p className="p-10 text-center text-slate-500">
                {w("No matching test cases.", "لا توجد حالات مطابقة.")}
              </p>
            )}
          </div>
        )}
        <Pager {...items.meta} onPage={setPage} />
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="execution-title"
        >
          <div className="max-h-screen w-full max-w-2xl overflow-y-auto bg-white p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="execution-title" className="text-lg font-bold">
                {w("Test execution", "تنفيذ الاختبار")}
              </h2>
              <Button
                variant="ghost"
                aria-label={w("Close", "إغلاق")}
                onClick={() => setSelected(null)}
                disabled={busy}
              >
                <X size={20} />
              </Button>
            </div>
            <DefinitionView definition={selected.snapshot} />
            <Link
              className="my-4 inline-flex items-center gap-1 text-sm text-[#0086ac]"
              href={`/test-cases/${selected.testCaseId}/history`}
            >
              <History size={15} />
              {w("Full execution history", "سجل التنفيذ الكامل")}
            </Link>
            {selected.latestExecutionId && (
              <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm">
                <p className="mb-2 font-semibold">
                  {w("Previous attempt", "المحاولة السابقة")} ·{" "}
                  <StatusBadge status={selected.status} />
                </p>
                <p className="whitespace-pre-wrap">
                  {selected.actualResult || "—"}
                </p>
                {selected.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-slate-500">
                    {selected.notes}
                  </p>
                )}
              </div>
            )}
            {canExecute(selected) ? (
              <form
                className="space-y-4 border-t border-slate-100 pt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  execute(resultStatus);
                }}
              >
                <p className="text-xs text-slate-500">
                  {w(
                    "Each save adds a new attempt. Earlier results stay in history.",
                    "كل حفظ يضيف محاولة جديدة وتبقى النتائج السابقة في السجل.",
                  )}
                </p>
                <label className="block space-y-1 text-sm">
                  {w("Actual result", "النتيجة الفعلية")}
                  <Textarea
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    maxLength={20000}
                    rows={4}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  {w("Notes", "ملاحظات")}
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={20000}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1 text-sm">
                    {w("Environment", "البيئة")}
                    <Input
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      maxLength={200}
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    {w("Duration (seconds)", "المدة (ثوانٍ)")}
                    <Input
                      type="number"
                      min={0}
                      max={604800}
                      step={1}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["passed", "failed", "blocked", "skipped"] as const).map(
                    (s) => (
                      <Button
                        type="button"
                        key={s}
                        disabled={busy}
                        onClick={() => execute(s)}
                        className={
                          s === "passed"
                            ? "bg-emerald-600 text-white"
                            : s === "failed"
                              ? "bg-red-600 text-white"
                              : s === "blocked"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-600 text-white"
                        }
                      >
                        {s === "passed" ? (
                          <Check size={15} />
                        ) : s === "failed" ? (
                          <X size={15} />
                        ) : null}
                        {
                          {
                            passed: w("PASS", "ناجح"),
                            failed: w("FAIL", "فاشل"),
                            blocked: w("BLOCKED", "متعذر"),
                            skipped: w("SKIP", "تخطي"),
                          }[s]
                        }
                      </Button>
                    ),
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    className={fieldClass}
                    aria-label={w("Result status", "حالة النتيجة")}
                    value={resultStatus}
                    onChange={(e) =>
                      setResultStatus(e.target.value as ExecutionStatus)
                    }
                  >
                    {executionStatuses.map((s) => (
                      <option key={s} value={s}>
                        {
                          {
                            not_run: w("Not Run", "لم يُنفذ"),
                            passed: w("Passed", "ناجح"),
                            failed: w("Failed", "فاشل"),
                            blocked: w("Blocked", "متعذر"),
                            skipped: w("Skipped", "متخطى"),
                          }[s]
                        }
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={busy}>
                    {busy
                      ? w("Saving…", "جار الحفظ…")
                      : w("Save attempt", "حفظ المحاولة")}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                {w(
                  "Only an administrator or the assigned tester can execute an active cycle.",
                  "يمكن للمسؤول أو المختبر المسند فقط تنفيذ دورة نشطة.",
                )}
              </p>
            )}
          </div>
        </div>
      )}
      {picker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="picker-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="picker-title" className="text-lg font-bold">
                {w("Add existing test cases", "إضافة حالات اختبار موجودة")}
              </h2>
              <Button
                variant="ghost"
                aria-label={w("Close", "إغلاق")}
                onClick={() => setPicker(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {w(
                "Only cases linked to this project are shown. Their definitions are snapshotted when added.",
                "تظهر الحالات المرتبطة بهذا المشروع فقط. تُحفظ نسخة من تعريفها عند الإضافة.",
              )}
            </p>
            <Input
              placeholder={w("Search cases…", "بحث الحالات…")}
              aria-label={w("Search available cases", "بحث الحالات المتاحة")}
              value={candidateSearch}
              onChange={(e) => {
                setCandidateSearch(e.target.value);
                setCandidatePage(1);
              }}
            />
            <select
              aria-label={w("Assign selected cases", "إسناد الحالات المحددة")}
              className={fieldClass}
              value={assignTester}
              onChange={(e) => setAssignTester(e.target.value)}
            >
              <option value="">
                {w("Leave unassigned", "تركها دون إسناد")}
              </option>
              {cycle.testers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {candidateError && (
              <p role="alert" className="text-red-600">
                {candidateError}
              </p>
            )}
            <div className="divide-y divide-slate-100">
              {candidates.data.map((tc) => (
                <label
                  key={tc.id}
                  className="flex items-start gap-3 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={chosen.includes(tc.id)}
                    onChange={(e) =>
                      setChosen((prev) =>
                        e.target.checked
                          ? [...prev, tc.id]
                          : prev.filter((x) => x !== tc.id),
                      )
                    }
                    className="mt-1 accent-[#0086ac]"
                  />
                  <span>
                    <span className="font-mono text-xs text-[#0086ac]">
                      {tc.testId}
                    </span>
                    <span className="block">{tc.scenario}</span>
                  </span>
                </label>
              ))}
              {!candidates.data.length && (
                <p className="py-6 text-sm text-slate-500">
                  {w(
                    "No available cases. Cases already in this cycle are excluded.",
                    "لا توجد حالات متاحة. الحالات المضافة بالفعل لا تظهر هنا.",
                  )}
                </p>
              )}
            </div>
            <Pager {...candidates.meta} onPage={setCandidatePage} />
            <Button
              className="w-full bg-[#006685] text-white"
              disabled={busy || !chosen.length || chosen.length > 500}
              onClick={() =>
                startTransition(async () => {
                  const r = await workflowRequest(
                    `test-cycles/${id}/items`,
                    "POST",
                    {
                      items: chosen.map((testCaseId) => ({
                        testCaseId,
                        testerId: assignTester ? Number(assignTester) : null,
                      })),
                    },
                  );
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(w("Test cases added", "تمت إضافة الحالات"));
                    setPicker(false);
                    reload();
                  }
                })
              }
            >
              {w("Add selected", "إضافة المحدد")} ({chosen.length}/500)
            </Button>
          </div>
        </div>
      )}
      {settings && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <form
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              changeCycle({
                name: f.get("name"),
                description: f.get("description"),
                status: f.get("status"),
                startDate: f.get("startDate") || null,
                endDate: f.get("endDate") || null,
              });
            }}
          >
            <div className="flex justify-between">
              <h2 id="settings-title" className="font-bold">
                {w("Cycle settings", "إعدادات الدورة")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                aria-label={w("Close", "إغلاق")}
                onClick={() => setSettings(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <label className="block text-sm">
              {w("Name", "الاسم")}
              <Input
                name="name"
                required
                minLength={2}
                maxLength={200}
                defaultValue={cycle.name}
              />
            </label>
            <label className="block text-sm">
              {w("Description", "الوصف")}
              <Textarea
                name="description"
                maxLength={10000}
                defaultValue={cycle.description || ""}
              />
            </label>
            <label className="block text-sm">
              {w("Status", "الحالة")}
              <select
                name="status"
                defaultValue={cycle.status}
                className={fieldClass}
              >
                {["planning", "active", "completed", "archived"].map((s) => (
                  <option key={s} value={s}>
                    {
                      (
                        {
                          planning: w("Planning", "التخطيط"),
                          active: w("Active", "نشط"),
                          completed: w("Completed", "مكتمل"),
                          archived: w("Archived", "مؤرشف"),
                        } as Record<string, string>
                      )[s]
                    }
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                {w("Start date", "تاريخ البداية")}
                <Input
                  name="startDate"
                  type="date"
                  defaultValue={cycle.startDate || ""}
                />
              </label>
              <label className="text-sm">
                {w("End date", "تاريخ النهاية")}
                <Input
                  name="endDate"
                  type="date"
                  defaultValue={cycle.endDate || ""}
                />
              </label>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {w("Save settings", "حفظ الإعدادات")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
