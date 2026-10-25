"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Layers, ArrowRight, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectApiItem } from "../projects/getProjects.action";
import { workflowRequest } from "./workflow.action";
import type { Cycle, PageData, Release } from "./workflow.types";
import {
  fieldClass,
  Pager,
  ProgressSummary,
  StatusBadge,
  useWords,
} from "./WorkflowShared";

const schema = z
  .object({
    name: z.string().trim().min(2).max(200),
    version: z.string().trim().max(100),
    description: z.string().max(10000),
    status: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    releaseId: z.string(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    path: ["endDate"],
    message:
      "End date must follow start date / تاريخ النهاية يجب أن يلي البداية",
  });
type Values = z.infer<typeof schema>;
const blank: Values = {
  name: "",
  version: "",
  description: "",
  status: "planning",
  startDate: "",
  endDate: "",
  releaseId: "",
};
const empty = <T,>(): PageData<T> => ({
  data: [],
  meta: { page: 1, total: 0, limit: 20, totalPages: 1 },
});
export default function WorkflowManager({
  projects,
  isAdmin,
  initialProjectId,
}: {
  projects: ProjectApiItem[];
  isAdmin: boolean;
  initialProjectId?: string;
}) {
  const { w, dir } = useWords();
  const [project, setProject] = useState(
    projects.some((p) => String(p.id) === initialProjectId)
      ? initialProjectId!
      : String(projects[0]?.id || ""),
  );
  const [tab, setTab] = useState<"cycles" | "releases">("cycles");
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasePage, setReleasePage] = useState<PageData<Release>>(empty);
  const [cycles, setCycles] = useState<PageData<Cycle>>(empty);
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Release | null>(null),
    [showForm, setShowForm] = useState(false);
  const [busy, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => {
    let cancelled = false;
    if (!project) {
      setReleases([]);
      return;
    }
    const load = async () => {
      const list: Release[] = [];
      let n = 1,
        total = 1;
      while (n <= total) {
        const r = await workflowRequest<PageData<Release>>(
          `projects/${project}/releases?limit=100&page=${n}`,
        );
        if (!r.ok) {
          if (!cancelled) setError(r.error);
          return;
        }
        list.push(...r.data.data);
        total = r.data.meta.totalPages;
        n++;
      }
      if (!cancelled) setReleases(list);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [project, revision]);
  useEffect(() => {
    let cancelled = false;
    if (!project) return;
    setLoading(true);
    setError("");
    const timeout = setTimeout(async () => {
      const q = new URLSearchParams({
        projectId: project,
        page: String(page),
        search,
        status,
      });
      const path =
        tab === "releases"
          ? `projects/${project}/releases?${q}`
          : `test-cycles?${q}`;
      const r = await workflowRequest<PageData<Release> | PageData<Cycle>>(
        path,
      );
      if (!cancelled) {
        if (r.ok) {
          if (tab === "releases") setReleasePage(r.data as PageData<Release>);
          else setCycles(r.data as PageData<Cycle>);
        } else setError(r.error);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [project, tab, page, search, status, revision]);
  const open = (release?: Release) => {
    setEditing(release || null);
    reset(
      release
        ? {
            name: release.name,
            version: release.version,
            description: release.description || "",
            status: release.status,
            startDate: release.startDate || "",
            endDate: release.releaseDate || "",
            releaseId: "",
          }
        : blank,
    );
    setShowForm(true);
  };
  const submit = handleSubmit((values) =>
    startTransition(async () => {
      if (tab === "releases" && !values.version.trim()) {
        toast.error(w("Version is required", "الإصدار مطلوب"));
        return;
      }
      if (tab === "cycles" && !values.releaseId) {
        toast.error(w("Select a release", "اختر إصداراً"));
        return;
      }
      const common = {
        name: values.name,
        description: values.description,
        status: values.status,
        startDate: values.startDate || null,
      };
      const body =
        tab === "releases"
          ? {
              ...common,
              version: values.version,
              releaseDate: values.endDate || null,
            }
          : {
              ...common,
              projectId: Number(project),
              releaseId: Number(values.releaseId),
              endDate: values.endDate || null,
            };
      const r = await workflowRequest(
        tab === "releases"
          ? `projects/${project}/releases${editing ? `/${editing.id}` : ""}`
          : "test-cycles",
        editing ? "PATCH" : "POST",
        body,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(w("Saved successfully", "تم الحفظ بنجاح"));
      setShowForm(false);
      setRevision((x) => x + 1);
    }),
  );
  const data = tab === "releases" ? releasePage : cycles;
  return (
    <div dir={dir} className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#0086ac]">
            <Layers size={20} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {w("QA execution workspace", "مساحة تنفيذ الاختبارات")}
            </span>
          </div>
          <h1 className="text-2xl font-bold">
            {w("Releases & Test Cycles", "الإصدارات ودورات الاختبار")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {w(
              "Plan a release. Assign tests. Preserve every result.",
              "خطط للإصدار وأسند الاختبارات واحتفظ بكل نتيجة.",
            )}
          </p>
        </div>
        {isAdmin && project && (
          <Button className="bg-[#006685] text-white" onClick={() => open()}>
            <Plus size={16} />
            {tab === "releases"
              ? w("New release", "إصدار جديد")
              : w("New test cycle", "دورة اختبار جديدة")}
          </Button>
        )}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold">
          {w("Project", "المشروع")}
          <select
            className={`${fieldClass} mt-2 max-w-md`}
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setPage(1);
              setShowForm(false);
            }}
          >
            <option value="">{w("Select project", "اختر المشروع")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 border-b border-slate-100 pb-3">
          {(["cycles", "releases"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "ghost"}
              onClick={() => {
                setTab(t);
                setPage(1);
                setStatus("");
                setShowForm(false);
              }}
            >
              {t === "cycles"
                ? w("Test cycles", "دورات الاختبار")
                : w("Releases", "الإصدارات")}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label={w("Search", "بحث")}
            placeholder={w(
              "Search by name or version…",
              "ابحث بالاسم أو الإصدار…",
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label={w("Status filter", "تصفية الحالة")}
            className={`${fieldClass} sm:w-48`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{w("All statuses", "كل الحالات")}</option>
            {(tab === "releases"
              ? ["planning", "active", "testing", "released", "archived"]
              : ["planning", "active", "completed", "archived"]
            ).map((s) => (
              <option key={s} value={s}>
                {
                  (
                    {
                      planning: w("Planning", "التخطيط"),
                      active: w("Active", "نشط"),
                      testing: w("Testing", "قيد الاختبار"),
                      released: w("Released", "تم الإصدار"),
                      archived: w("Archived", "مؤرشف"),
                      completed: w("Completed", "مكتمل"),
                    } as Record<string, string>
                  )[s]
                }
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <Button variant="ghost" onClick={() => setRevision((x) => x + 1)}>
            {w("Retry", "إعادة المحاولة")}
          </Button>
        </div>
      )}
      {!project ? (
        <p className="p-8 text-center text-slate-500">
          {w(
            "Select an assigned project to get started.",
            "اختر مشروعاً مسنداً إليك للبدء.",
          )}
        </p>
      ) : loading ? (
        <p role="status" className="p-8 text-center">
          {w("Loading…", "جار التحميل…")}
        </p>
      ) : (
        !error && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {tab === "releases"
                ? releasePage.data.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <h2 className="font-bold">{r.name}</h2>
                          <p className="text-sm text-[#0086ac]">{r.version}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-500">
                        {r.description || "—"}
                      </p>
                      <div className="text-xs text-slate-500">
                        {r.startDate || "—"} → {r.releaseDate || "—"}
                      </div>
                      {isAdmin &&
                        !["archived", "released"].includes(r.status) && (
                          <Button variant="outline" onClick={() => open(r)}>
                            <Pencil size={14} />
                            {w("Edit release", "تعديل الإصدار")}
                          </Button>
                        )}
                      {isAdmin && r.status === "released" && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await workflowRequest(
                                `projects/${project}/releases/${r.id}`,
                                "PATCH",
                                { status: "archived" },
                              );
                              if (!res.ok) toast.error(res.error);
                              else setRevision((x) => x + 1);
                            })
                          }
                        >
                          {w("Archive", "أرشفة")}
                        </Button>
                      )}
                    </div>
                  ))
                : cycles.data.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <h2 className="font-bold">{c.name}</h2>
                          <p className="text-sm text-slate-500">
                            {c.releaseName} · {c.version}
                          </p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.startDate || "—"} → {c.endDate || "—"}
                      </div>
                      <ProgressSummary summary={c.summary} />
                      <Link
                        href={`/test-cycles/${c.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0086ac]"
                      >
                        {w("Open execution workspace", "فتح مساحة التنفيذ")}
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))}
            </div>
            {data.data.length === 0 && (
              <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
                {w(
                  "No records yet. Create a release, then a test cycle.",
                  "لا توجد سجلات. أنشئ إصداراً ثم دورة اختبار.",
                )}
              </div>
            )}
            <Pager {...data.meta} onPage={setPage} />
          </>
        )
      )}
      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workflow-form-title"
        >
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6"
          >
            <div className="flex items-center justify-between">
              <h2 id="workflow-form-title" className="text-lg font-bold">
                {tab === "releases"
                  ? w("Release details", "تفاصيل الإصدار")
                  : w("New test cycle", "دورة اختبار جديدة")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                aria-label={w("Close", "إغلاق")}
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <label className="block space-y-1 text-sm">
              {w("Name", "الاسم")}
              <Input {...register("name")} required maxLength={200} />
            </label>
            {tab === "releases" ? (
              <label className="block space-y-1 text-sm">
                {w("Version", "رقم الإصدار")}
                <Input
                  {...register("version")}
                  required
                  maxLength={100}
                  placeholder="2.0 / 2.0 Hotfix"
                />
              </label>
            ) : (
              <label className="block space-y-1 text-sm">
                {w("Release", "الإصدار")}
                <select
                  className={fieldClass}
                  {...register("releaseId")}
                  required
                >
                  <option value="">
                    {w("Select release", "اختر الإصدار")}
                  </option>
                  {releases
                    .filter((r) => !["archived", "released"].includes(r.status))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.version}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label className="block space-y-1 text-sm">
              {w("Description", "الوصف")}
              <Textarea {...register("description")} maxLength={10000} />
            </label>
            <label className="block space-y-1 text-sm">
              {w("Status", "الحالة")}
              <select className={fieldClass} {...register("status")}>
                {(tab === "releases"
                  ? ["planning", "active", "testing", "released", "archived"]
                  : ["planning", "active"]
                ).map((s) => (
                  <option value={s} key={s}>
                    {
                      (
                        {
                          planning: w("Planning", "التخطيط"),
                          active: w("Active", "نشط"),
                          testing: w("Testing", "قيد الاختبار"),
                          released: w("Released", "تم الإصدار"),
                          archived: w("Archived", "مؤرشف"),
                        } as Record<string, string>
                      )[s]
                    }
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-sm">
                {w("Start date", "تاريخ البداية")}
                <Input type="date" {...register("startDate")} />
              </label>
              <label className="block space-y-1 text-sm">
                {tab === "releases"
                  ? w("Release date", "تاريخ الإصدار")
                  : w("End date", "تاريخ النهاية")}
                <Input type="date" {...register("endDate")} />
              </label>
            </div>
            {Object.values(errors).map((e, i) => (
              <p key={i} role="alert" className="text-xs text-red-600">
                {e.message}
              </p>
            ))}
            <Button
              disabled={busy}
              className="w-full bg-[#006685] text-white"
              type="submit"
            >
              {busy ? w("Saving…", "جار الحفظ…") : w("Save", "حفظ")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
