"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { workflowRequest } from "../test-cycles/workflow.action";
import type {
  Cycle,
  Metrics,
  PageData,
  Release,
} from "../test-cycles/workflow.types";
import {
  fieldClass,
  ProgressSummary,
  useWords,
} from "../test-cycles/WorkflowShared";
interface Project {
  id: number;
  name: string;
  assignedUsers?: { id: number; name: string }[];
}
export default function ExecutionDashboard({
  projects,
}: {
  projects: Project[];
}) {
  const { w } = useWords();
  const [project, setProject] = useState(""),
    [release, setRelease] = useState(""),
    [cycle, setCycle] = useState(""),
    [tester, setTester] = useState("");
  const [releases, setReleases] = useState<Release[]>([]),
    [cycles, setCycles] = useState<Cycle[]>([]),
    [data, setData] = useState<Metrics | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const all: Cycle[] = [];
      let p = 1,
        last = 1;
      while (p <= last) {
        const r = await workflowRequest<PageData<Cycle>>(
          `test-cycles?limit=100&page=${p}${project ? `&projectId=${project}` : ""}${release ? `&releaseId=${release}` : ""}`,
        );
        if (!r.ok) {
          if (active) setError(r.error);
          return;
        }
        all.push(...r.data.data);
        last = r.data.meta.totalPages;
        p++;
      }
      if (active) setCycles(all);
    })();
    return () => {
      active = false;
    };
  }, [project, release, revision]);
  useEffect(() => {
    let active = true;
    if (!project) {
      setReleases([]);
      return;
    }
    void (async () => {
      const all: Release[] = [];
      let p = 1,
        last = 1;
      while (p <= last) {
        const r = await workflowRequest<PageData<Release>>(
          `projects/${project}/releases?limit=100&page=${p}`,
        );
        if (!r.ok) {
          if (active) setError(r.error);
          return;
        }
        all.push(...r.data.data);
        last = r.data.meta.totalPages;
        p++;
      }
      if (active) setReleases(all);
    })();
    return () => {
      active = false;
    };
  }, [project, revision]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({
      projectId: project,
      releaseId: release,
      cycleId: cycle,
      testerId: tester,
    }))
      if (v) q.set(k, v);
    void workflowRequest<Metrics>(`dashboard/executions?${q}`).then((r) => {
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
  }, [project, release, cycle, tester, revision]);
  const testers = Array.from(
    new Map(
      projects
        .filter((p) => !project || p.id === Number(project))
        .flatMap((p) => p.assignedUsers || [])
        .map((t) => [t.id, t]),
    ).values(),
  );
  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {w("Test execution overview", "نظرة عامة على تنفيذ الاختبارات")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {w(
              "Progress uses the latest attempt per cycle item. Total executions counts all completed attempts, including legacy history.",
              "التقدم يعتمد على آخر محاولة لكل حالة بالدورة. إجمالي التنفيذ يشمل كل المحاولات المنفذة والنتائج القديمة.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevision((x) => x + 1)}
            disabled={loading}
          >
            {w("Refresh", "تحديث")}
          </Button>
          <Link
            className="text-sm font-semibold text-[#0086ac]"
            href="/test-cycles"
          >
            {w("Manage cycles →", "إدارة الدورات ←")}
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className={fieldClass}
          aria-label={w("Execution project filter", "تصفية مشروع التنفيذ")}
          value={project}
          onChange={(e) => {
            setProject(e.target.value);
            setRelease("");
            setCycle("");
            setTester("");
          }}
        >
          <option value="">{w("All projects", "كل المشاريع")}</option>
          {projects.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          aria-label={w("Release filter", "تصفية الإصدار")}
          disabled={!project}
          value={release}
          onChange={(e) => {
            setRelease(e.target.value);
            setCycle("");
          }}
        >
          <option value="">{w("All releases", "كل الإصدارات")}</option>
          {releases.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.version}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          aria-label={w("Cycle filter", "تصفية الدورة")}
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
        >
          <option value="">{w("All cycles", "كل الدورات")}</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          aria-label={w("Execution tester filter", "تصفية مختبر التنفيذ")}
          value={tester}
          onChange={(e) => setTester(e.target.value)}
        >
          <option value="">{w("All testers", "كل المختبرين")}</option>
          {testers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-6 text-sm text-slate-500">
          {w("Loading execution metrics…", "جار تحميل مؤشرات التنفيذ…")}
        </p>
      ) : (
        data &&
        !error && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#eff8fc] p-4">
                <p className="text-xs text-[#006685]">
                  {w(
                    "Total executions (all attempts)",
                    "إجمالي التنفيذ (كل المحاولات)",
                  )}
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {data.totalExecutions}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-800">
                  {w(
                    "Pass rate · Passed / (Passed + Failed)",
                    "معدل النجاح · ناجح / (ناجح + فاشل)",
                  )}
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {data.summary.passRate}%
                </p>
              </div>
            </div>
            <ProgressSummary summary={data.summary} />
            <h3 className="font-semibold">
              {w("Current release progress", "تقدم الإصدارات الحالية")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.releases
                .filter(
                  (r) =>
                    release ||
                    ["active", "testing", "planning"].includes(r.status),
                )
                .slice(0, 6)
                .map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <p className="font-semibold">
                      {r.name} · {r.version}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {r.summary.executed}/{r.summary.total} ·{" "}
                      {r.summary.progress}%
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full bg-[#00a2d2]"
                        style={{ width: `${r.summary.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
            <h3 className="font-semibold">
              {w("Current test cycle progress", "تقدم دورات الاختبار الحالية")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.cycles
                .filter((c) => cycle || c.status === "active")
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/test-cycles/${c.id}`}
                    className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                  >
                    <p className="text-xs text-[#0086ac]">
                      {c.releaseName} · {c.version}
                    </p>
                    <p className="mt-1 font-semibold">{c.name}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {c.summary.executed}/{c.summary.total} ·{" "}
                      {c.summary.progress}% {w("complete", "مكتمل")}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full bg-[#00a2d2]"
                        style={{ width: `${c.summary.progress}%` }}
                      />
                    </div>
                  </Link>
                ))}
            </div>
          </>
        )
      )}
    </section>
  );
}
