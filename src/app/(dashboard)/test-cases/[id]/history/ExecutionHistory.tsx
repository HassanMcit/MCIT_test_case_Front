"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { workflowRequest } from "../../../test-cycles/workflow.action";
import type { Execution, PageData } from "../../../test-cycles/workflow.types";
import {
  DefinitionView,
  Pager,
  StatusBadge,
  useWords,
} from "../../../test-cycles/WorkflowShared";
export default function ExecutionHistory({ id }: { id: number }) {
  const { w, dir, lang } = useWords();
  const [data, setData] = useState<PageData<Execution> | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<Execution | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void workflowRequest<PageData<Execution>>(
      `test-cases/${id}/executions?page=${page}`,
    ).then((r) => {
      if (active) {
        if (r.ok) {
          setData(r.data);
          setError("");
        } else setError(r.error);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, page]);
  return (
    <div dir={dir} className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <Link className="text-sm text-[#0086ac]" href="/test-cases">
        ← {w("Test cases", "حالات الاختبار")}
      </Link>
      <h1 className="text-2xl font-bold">
        {w("Execution History", "سجل التنفيذ")}
        {data?.data[0] && (
          <span className="ms-3 font-mono text-lg text-[#0086ac]">
            {data.data[0].snapshot.testId}
          </span>
        )}
      </h1>
      <p className="text-sm text-slate-500">
        {w(
          "All attempts across releases and cycles, including preserved legacy results. Open an attempt to see the definition used at that time.",
          "كل المحاولات عبر الإصدارات والدورات بما فيها النتائج القديمة. افتح محاولة لعرض تعريف الاختبار وقت التنفيذ.",
        )}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 overflow-x-auto">
        {loading ? (
          <p role="status">{w("Loading history…", "جار تحميل السجل…")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                {[
                  w("Release", "الإصدار"),
                  w("Cycle", "الدورة"),
                  w("Tester", "المختبر"),
                  w("Status", "الحالة"),
                  w("Date", "التاريخ"),
                  "",
                ].map((h, i) => (
                  <th key={i} className="p-3 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.data.map((e) => (
                <tr key={e.id}>
                  <td className="p-3">
                    {e.releaseName
                      ? `${e.releaseName} · ${e.version}`
                      : e.source === "legacy"
                        ? w("Legacy result", "نتيجة قديمة")
                        : w("Outside a cycle", "خارج دورة")}
                  </td>
                  <td className="p-3">{e.cycleName || "—"}</td>
                  <td className="p-3">{e.testerName || "—"}</td>
                  <td className="p-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {e.executedAt
                      ? new Date(e.executedAt).toLocaleString(
                          lang === "ar" ? "ar-EG" : "en-US",
                        )
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSelected(selected?.id === e.id ? null : e)
                      }
                    >
                      {w("Details", "التفاصيل")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && data?.meta.total === 0 && (
          <p className="py-10 text-center text-slate-500">
            {w(
              "This test case has no recorded executions yet.",
              "لم تُسجل عمليات تنفيذ لهذه الحالة بعد.",
            )}
          </p>
        )}
        {data && <Pager {...data.meta} onPage={setPage} />}
      </div>
      {selected && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 space-y-5">
          <div className="flex justify-between">
            <StatusBadge status={selected.status} />
            <Button variant="ghost" onClick={() => setSelected(null)}>
              {w("Close", "إغلاق")}
            </Button>
          </div>
          <DefinitionView definition={selected.snapshot} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">
                {w("Actual result", "النتيجة الفعلية")}
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {selected.actualResult || "—"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">{w("Notes", "ملاحظات")}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {selected.notes || "—"}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {w("Environment", "البيئة")}: {selected.environment || "—"} ·{" "}
            {w("Duration (seconds)", "المدة بالثواني")}:{" "}
            {selected.durationSeconds ?? "—"}
          </p>
          <p className="text-xs text-slate-400">
            {w("Source", "المصدر")}: {selected.source} ·{" "}
            {w("Recorded", "وقت التسجيل")}:{" "}
            {new Date(selected.recordedAt).toLocaleString(
              lang === "ar" ? "ar-EG" : "en-US",
            )}
          </p>
        </section>
      )}
    </div>
  );
}
