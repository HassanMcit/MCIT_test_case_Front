"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ListChecks,
  CheckCircle,
  XCircle,
  Clock,
  FolderGit2,
  X,
  Calendar,
  User,
  Layers,
  FileText,
  AlertCircle,
  Save,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import type { TestCaseItem, TestCaseListResponse } from "./test-cases.interface";
import type { ProjectApiItem } from "../projects/getProjects.action";
import { deleteTestCase, updateTestCase } from "./test-cases.action";
import toast from "react-hot-toast";

interface TestCasesTableProps {
  initialData: TestCaseListResponse;
  allProjects: ProjectApiItem[];
  initialProjectId?: number;
}

export default function TestCasesTable({
  initialData,
  allProjects,
  initialProjectId,
}: TestCasesTableProps) {
  const router = useRouter();
  const { dir, lang } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [items, setItems] = useState<TestCaseItem[]>(initialData.data || []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState<string>(
    initialProjectId ? String(initialProjectId) : "all"
  );
  const [selectedItem, setSelectedItem] = useState<TestCaseItem | null>(null);

  // Deletion State (In-app modal, NO native browser alert/confirm)
  const [itemToDelete, setItemToDelete] = useState<TestCaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit State
  const [editingItem, setEditingItem] = useState<TestCaseItem | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<TestCaseItem>>({});
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [, startTransition] = useTransition();

  // Selected Project Details
  const selectedProjectObj = allProjects.find(
    (p) => String(p.id) === projectFilter
  );

  // Client-side filtering
  const filtered = items.filter((tc) => {
    // If user is a tester (not admin), enforce that the test case belongs to their assigned projects
    if (!isAdmin) {
      if (allProjects.length === 0) return false;
      const belongsToAssignedProject = allProjects.some(
        (p) => (tc.projectId && p.id === tc.projectId) || (p.name && tc.module === p.name)
      );
      if (!belongsToAssignedProject) return false;
    }

    // Project filter
    if (projectFilter !== "all") {
      const matchProjId = tc.projectId && String(tc.projectId) === projectFilter;
      const matchProjName = selectedProjectObj && tc.module === selectedProjectObj.name;
      if (!matchProjId && !matchProjName) return false;
    }

    // Status filter
    if (statusFilter !== "all" && tc.status !== statusFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && tc.priority !== priorityFilter) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchId = tc.testId?.toLowerCase().includes(term);
      const matchModule = tc.module?.toLowerCase().includes(term);
      const matchScenario = tc.scenario?.toLowerCase().includes(term);
      const matchPage = tc.pageName?.toLowerCase().includes(term);
      if (!matchId && !matchModule && !matchScenario && !matchPage) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const idA = a.testId || "";
    const idB = b.testId || "";
    return (
      idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" }) ||
      a.id - b.id
    );
  });

  // Calculate dynamic stats
  const totalCount = filtered.length;
  const passedCount = filtered.filter((i) => i.status === "passed").length;
  const failedCount = filtered.filter((i) => i.status === "failed").length;
  const pendingCount = filtered.filter(
    (i) => i.status === "pending" || i.status === "skipped" || i.status === "blocked"
  ).length;

  const stats = [
    {
      label: isRTL ? "إجمالي حالات الاختبار" : "Total Test Cases",
      value: totalCount,
      icon: ListChecks,
      color: "text-[#006685]",
      bg: "bg-[#bfe9ff]/60",
    },
    {
      label: isRTL ? "الاختبارات الناجحة" : "Passed",
      value: passedCount,
      icon: CheckCircle,
      color: "text-[#006c49]",
      bg: "bg-[#6ffbbe]/30",
    },
    {
      label: isRTL ? "الاختبارات الفاشلة" : "Failed",
      value: failedCount,
      icon: XCircle,
      color: "text-[#ba1a1a]",
      bg: "bg-[#ffdad6]",
    },
    {
      label: isRTL ? "قيد الانتظار" : "Pending",
      value: pendingCount,
      icon: Clock,
      color: "text-[#565e74]",
      bg: "bg-[#dae2fd]",
    },
  ];

  const statusMap: Record<
    string,
    { labelAr: string; labelEn: string; dot: string; badgeClass: string }
  > = {
    passed: {
      labelAr: "ناجح",
      labelEn: "Passed",
      dot: "bg-emerald-500",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    failed: {
      labelAr: "فاشل",
      labelEn: "Failed",
      dot: "bg-red-500",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
    },
    pending: {
      labelAr: "قيد الانتظار",
      labelEn: "Pending",
      dot: "bg-amber-500 animate-pulse",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    },
    skipped: {
      labelAr: "تم التخطي",
      labelEn: "Skipped",
      dot: "bg-slate-400",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    },
    blocked: {
      labelAr: "محظور",
      labelEn: "Blocked",
      dot: "bg-purple-500",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    },
  };

  const priorityMap: Record<
    string,
    { labelAr: string; labelEn: string; badgeClass: string }
  > = {
    critical: {
      labelAr: "حرجة",
      labelEn: "Critical",
      badgeClass: "bg-red-100 text-red-800 border-red-300 font-bold",
    },
    high: {
      labelAr: "عالية",
      labelEn: "High",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    },
    medium: {
      labelAr: "متوسطة",
      labelEn: "Medium",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    },
    low: {
      labelAr: "منخفضة",
      labelEn: "Low",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };

  // Handle Project Filter Change
  const handleProjectFilterChange = (val: string | null) => {
    const nextVal = val || "all";
    setProjectFilter(nextVal);
    startTransition(() => {
      if (nextVal === "all") {
        router.push("/test-cases");
      } else {
        router.push(`/test-cases?projectId=${nextVal}`);
      }
    });
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    handleProjectFilterChange("all");
  };

  // Execute Deletion
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const targetItem = itemToDelete;
    setIsDeleting(true);

    const deletePromise = deleteTestCase(targetItem.id).then((res) => {
      if (!res.success) {
        throw new Error(res.message);
      }
      setItems((prev) => prev.filter((item) => item.id !== targetItem.id));
      if (selectedItem?.id === targetItem.id) setSelectedItem(null);
      if (editingItem?.id === targetItem.id) setEditingItem(null);
      return res;
    });

    toast.promise(
      deletePromise,
      {
        loading: isRTL ? "جاري حذف حالة الاختبار..." : "Deleting test case...",
        success: isRTL ? "تم حذف حالة الاختبار بنجاح" : "Test case deleted successfully",
        error: isRTL ? "فشل حذف حالة الاختبار" : "Failed to delete test case",
      }
    ).finally(() => {
      setIsDeleting(false);
      setItemToDelete(null);
    });
  };

  // Open Edit Modal
  const handleStartEdit = (row: TestCaseItem) => {
    setEditingItem(row);
    setEditFormData({
      module: row.module,
      pageName: row.pageName || "",
      scenario: row.scenario,
      preConditions: row.preConditions || "",
      expectedResult: row.expectedResult,
      actualResult: row.actualResult || "",
      priority: row.priority,
      status: row.status,
      notes: row.notes || "",
      projectId: row.projectId || undefined,
    });
    setEditSteps(Array.isArray(row.steps) && row.steps.length > 0 ? [...row.steps] : [""]);
  };

  // Handle Edit Submit
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    const cleanedSteps = editSteps.filter((s) => s.trim() !== "");
    const payload = {
      ...editFormData,
      steps: cleanedSteps.length > 0 ? cleanedSteps : editSteps,
    };
    const targetId = editingItem.id;

    const updatePromise = updateTestCase(targetId, payload).then((res) => {
      if (!res.success) {
        throw new Error(res.message);
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === targetId ? { ...it, ...res.data, ...payload } : it
        )
      );
      setEditingItem(null);
      return res;
    });

    toast.promise(
      updatePromise,
      {
        loading: isRTL ? "جاري حفظ التعديلات..." : "Saving changes...",
        success: isRTL ? "تم تحديث حالة الاختبار بنجاح" : "Test case updated successfully",
        error: isRTL ? "فشل تحديث حالة الاختبار" : "Failed to update test case",
      }
    ).finally(() => {
      setIsUpdating(false);
    });
  };

  // Export to CSV/Excel
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error(isRTL ? "لا توجد بيانات لتصديرها" : "No data to export");
      return;
    }

    const headers = isRTL
      ? [
          "معرف الحالة",
          "الوحدة / المشروع",
          "اسم الصفحة",
          "سيناريو الاختبار",
          "الخطوات",
          "النتيجة المتوقعة",
          "النتيجة الفعلية",
          "الأولوية",
          "الحالة",
          "المختبر",
          "تاريخ التنفيذ",
        ]
      : [
          "Test ID",
          "Module / Project",
          "Page Name",
          "Scenario",
          "Steps",
          "Expected Result",
          "Actual Result",
          "Priority",
          "Status",
          "Tester",
          "Executed At",
        ];

    const rows = filtered.map((tc) => [
      tc.testId || "",
      tc.module || tc.project?.name || "",
      tc.pageName || "",
      `"${(tc.scenario || "").replace(/"/g, '""')}"`,
      `"${(tc.steps || []).join(" | ").replace(/"/g, '""')}"`,
      `"${(tc.expectedResult || "").replace(/"/g, '""')}"`,
      `"${(tc.actualResult || "").replace(/"/g, '""')}"`,
      tc.priority || "",
      tc.status || "",
      tc.tester?.name || "",
      tc.executedAt ? new Date(tc.executedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : "",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `test-cases-${selectedProjectObj?.name || "all"}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isRTL ? "تم تصدير البيانات بنجاح" : "Exported successfully");
  };

  return (
    <div className="flex flex-col w-full p-4 sm:p-6 lg:p-8 gap-6 max-w-7xl mx-auto">
      {/* ── Page Header & Top Actions ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0b1c30]">
              {isRTL ? "حالات الاختبار" : "Test Cases"}
            </h1>
            {selectedProjectObj ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eff4ff] border border-[#00aee0]/40 text-[#006685] rounded-full text-xs font-bold shadow-xs">
                <FolderGit2 className="w-3.5 h-3.5 text-[#006685]" />
                <span>{selectedProjectObj.name}</span>
                <button
                  type="button"
                  onClick={() => handleProjectFilterChange("all")}
                  className="hover:text-red-600 transition-colors cursor-pointer mr-0.5"
                  title={isRTL ? "عرض جميع المشاريع" : "Show all projects"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff4ff] text-[#006685] border border-[#00aee0]/30">
                {filtered.length} {isRTL ? "حالة" : "cases"}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#6d797f] mt-1">
            {selectedProjectObj
              ? isRTL
                ? `عرض حالات الاختبار الخاصة بمشروع "${selectedProjectObj.name}"`
                : `Viewing test cases for project "${selectedProjectObj.name}"`
              : isRTL
              ? "إدارة ومتابعة جميع حالات اختبار الجودة للمشاريع والأنظمة"
              : "Manage and monitor all QA test cases across projects and systems"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="h-10 px-4 rounded-xl text-xs sm:text-[13px] font-bold border-slate-200 hover:bg-[#eff4ff] text-[#0b1c30] cursor-pointer flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#006685]" />
            <span>{isRTL ? "تصدير إلى إكسل" : "Export Excel"}</span>
          </Button>
          <Link
            href="/add"
            className="inline-flex items-center justify-center h-10 px-4 bg-[#00A2D2] hover:bg-[#008eb8] active:scale-[0.98] text-white rounded-xl text-xs sm:text-[13px] font-bold transition-all shadow-[0_4px_14px_0_rgba(0,162,210,0.3)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.4)] gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? "حالة اختبار جديدة" : "New Test Case"}</span>
          </Link>
        </div>
      </div>

      {/* ── Dynamic KPI Stats Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-xs border-slate-200/80 rounded-2xl bg-white hover:border-slate-300 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-[12px] sm:text-[13px] font-semibold text-[#565e74] mb-1">
                  {s.label}
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30]">
                  {s.value}
                </h3>
              </div>
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}
              >
                <s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Modern Structured Filter Card ─────────────────────────── */}
      <Card className="shadow-xs border-slate-200/80 rounded-2xl bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Row 1: Search Input */}
          <div className="relative w-full">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 text-[#6d797f] w-4 h-4 ${
                isRTL ? "right-3.5" : "left-3.5"
              }`}
            />
            <Input
              className={`h-11 text-xs sm:text-sm bg-[#f8f9ff] border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 rounded-xl transition-all ${
                isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left"
              }`}
              placeholder={
                isRTL
                  ? "بحث سريع بالمعرّف (مثل TC-0001)، أو الوحدة، أو اسم الصفحة، أو السيناريو..."
                  : "Search by ID (e.g. TC-0001), module, page name, or scenario..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer ${
                  isRTL ? "left-2.5" : "right-2.5"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Row 2: Four-Column Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
            {/* Project Filter */}
            <Select
              value={projectFilter}
              onValueChange={handleProjectFilterChange}
            >
              <SelectTrigger className="h-10 w-full text-xs font-semibold bg-[#f8f9ff] border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#006685] shrink-0" />
                  <SelectValue>
                    {projectFilter === "all"
                      ? (isRTL ? "جميع المشاريع" : "All Projects")
                      : (selectedProjectObj?.name || projectFilter)}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="all">
                  {isRTL ? "جميع المشاريع" : "All Projects"}
                </SelectItem>
                {allProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val || "all")}
            >
              <SelectTrigger className="h-10 w-full text-xs font-semibold bg-[#f8f9ff] border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <ListChecks className="w-3.5 h-3.5 text-[#006685] shrink-0" />
                  <SelectValue>
                    {statusFilter === "all"
                      ? (isRTL ? "جميع الحالات" : "All Status")
                      : (isRTL ? statusMap[statusFilter]?.labelAr : statusMap[statusFilter]?.labelEn)}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">
                  {isRTL ? "جميع الحالات" : "All Status"}
                </SelectItem>
                <SelectItem value="passed">
                  {isRTL ? "ناجح" : "Passed"}
                </SelectItem>
                <SelectItem value="failed">
                  {isRTL ? "فاشل" : "Failed"}
                </SelectItem>
                <SelectItem value="pending">
                  {isRTL ? "قيد الانتظار" : "Pending"}
                </SelectItem>
                <SelectItem value="skipped">
                  {isRTL ? "تم التخطي" : "Skipped"}
                </SelectItem>
                <SelectItem value="blocked">
                  {isRTL ? "محظور" : "Blocked"}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onValueChange={(val) => setPriorityFilter(val || "all")}
            >
              <SelectTrigger className="h-10 w-full text-xs font-semibold bg-[#f8f9ff] border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-[#006685] shrink-0" />
                  <SelectValue>
                    {priorityFilter === "all"
                      ? (isRTL ? "جميع الأولويات" : "All Priorities")
                      : (isRTL ? priorityMap[priorityFilter]?.labelAr : priorityMap[priorityFilter]?.labelEn)}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">
                  {isRTL ? "جميع الأولويات" : "All Priorities"}
                </SelectItem>
                <SelectItem value="critical">
                  {isRTL ? "حرجة" : "Critical"}
                </SelectItem>
                <SelectItem value="high">
                  {isRTL ? "عالية" : "High"}
                </SelectItem>
                <SelectItem value="medium">
                  {isRTL ? "متوسطة" : "Medium"}
                </SelectItem>
                <SelectItem value="low">
                  {isRTL ? "منخفضة" : "Low"}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters / Results Summary */}
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 w-full text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100 border-rose-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRTL ? "إعادة ضبط الفلاتر" : "Reset Filters"}</span>
              </Button>
            ) : (
              <div className="h-10 w-full px-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-600">
                  {isRTL ? "النتائج المطابقة:" : "Matched results:"}
                </span>
                <span className="font-bold text-[#006685]">
                  {filtered.length} {isRTL ? "حالة" : "cases"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Data Table ───────────────────────────────────────── */}
      <Card className="shadow-xs border-slate-200/80 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#f8f9ff] h-11 border-b border-[#e5eeff]">
                {(isRTL
                  ? [
                      "معرف الحالة",
                      "الوحدة / المشروع",
                      "السيناريو",
                      "الخطوات",
                      "النتيجة المتوقعة",
                      "الأولوية",
                      "الحالة",
                      "المختبر",
                      "تاريخ التنفيذ",
                      "الإجراءات",
                    ]
                  : [
                      "Case ID",
                      "Module / Project",
                      "Scenario",
                      "Steps",
                      "Expected Result",
                      "Priority",
                      "Status",
                      "Tester",
                      "Executed At",
                      "Actions",
                    ]
                ).map((head, idx) => (
                  <th
                    key={head}
                    className={`px-4 text-[11px] font-bold text-[#565e74] uppercase tracking-wider ${
                      idx === 9 ? "text-center w-24" : isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#006685]">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-[#0b1c30]">
                        {isRTL ? "لا توجد نتائج مطابقة" : "No matching test cases found"}
                      </p>
                      <p className="text-xs text-[#6d797f]">
                        {isRTL
                          ? "جرّب تغيير كلمات البحث أو إلغاء بعض الفلاتر"
                          : "Try adjusting your search terms or clearing filters"}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs rounded-xl border-[#bcc8d0] cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          <span>{isRTL ? "إلغاء جميع الفلاتر" : "Clear All Filters"}</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const sInfo = statusMap[row.status] || {
                    labelAr: row.status,
                    labelEn: row.status,
                    dot: "bg-slate-400",
                    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
                  };
                  const pInfo = priorityMap[row.priority] || {
                    labelAr: row.priority,
                    labelEn: row.priority,
                    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
                  };

                  const stepsPreview = Array.isArray(row.steps)
                    ? row.steps.filter(Boolean).slice(0, 2).join(" | ")
                    : "";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#f8f9ff]/70 transition-colors h-14"
                    >
                      {/* ID */}
                      <td className="px-4 font-mono font-bold text-xs text-[#006685] whitespace-nowrap">
                        <button
                          onClick={() => setSelectedItem(row)}
                          className="hover:underline cursor-pointer"
                        >
                          {row.testId}
                        </button>
                      </td>

                      {/* Module & Page */}
                      <td className="px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-[13px] text-[#0b1c30]">
                            {row.module || row.project?.name || "-"}
                          </span>
                          {row.pageName && (
                            <span className="text-[11px] text-[#6d797f]">
                              {row.pageName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Scenario */}
                      <td
                        className="px-4 text-[13px] text-[#0b1c30] max-w-[220px] truncate"
                        title={row.scenario}
                      >
                        {row.scenario}
                      </td>

                      {/* Steps Preview */}
                      <td
                        className="px-4 text-[12px] text-[#6d797f] max-w-[180px] truncate font-sans"
                        title={Array.isArray(row.steps) ? row.steps.join("\n") : ""}
                      >
                        {stepsPreview || "-"}
                      </td>

                      {/* Expected Result */}
                      <td
                        className="px-4 text-[13px] text-[#3d484f] max-w-[150px] truncate"
                        title={row.expectedResult}
                      >
                        {row.expectedResult}
                      </td>

                      {/* Priority */}
                      <td className="px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold rounded-lg border px-2 py-0.5 ${pInfo.badgeClass}`}
                        >
                          {isRTL ? pInfo.labelAr : pInfo.labelEn}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold rounded-lg border flex items-center gap-1.5 w-fit px-2 py-0.5 ${sInfo.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${sInfo.dot}`}
                          />
                          <span>{isRTL ? sInfo.labelAr : sInfo.labelEn}</span>
                        </Badge>
                      </td>

                      {/* Tester */}
                      <td className="px-4 text-[13px] text-[#0b1c30] whitespace-nowrap">
                        {row.tester?.name || "-"}
                      </td>

                      {/* Execution Date */}
                      <td className="px-4 text-[12px] text-[#6d797f] font-mono whitespace-nowrap">
                        {row.executedAt
                          ? new Date(row.executedAt).toLocaleDateString(
                              isRTL ? "ar-EG" : "en-US",
                              { year: "numeric", month: "short", day: "numeric" }
                            )
                          : row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString(
                              isRTL ? "ar-EG" : "en-US",
                              { year: "numeric", month: "short", day: "numeric" }
                            )
                          : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedItem(row)}
                            className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#565e74] hover:text-[#006685] transition-colors cursor-pointer"
                            title={isRTL ? "عرض التفاصيل" : "View Details"}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(row)}
                            className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#565e74] hover:text-[#00aee0] transition-colors cursor-pointer"
                            title={isRTL ? "تعديل" : "Edit"}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Email Defect Report (Failed Test Cases ONLY) */}
                          {row.status === "failed" && (
                            <Link
                              href={`/test-cases/email?id=${row.id}`}
                              className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                              title={isRTL ? "إرسال تقرير الخلل عبر Outlook" : "Send Defect Report via Outlook"}
                            >
                              <Mail className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Delete Button (Opens custom in-app modal, NO window.confirm) */}
                          <button
                            type="button"
                            onClick={() => setItemToDelete(row)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-[#565e74] hover:text-red-600 transition-colors cursor-pointer"
                            title={isRTL ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-[#f8f9ff] px-5 py-3.5 flex items-center justify-between border-t border-[#e5eeff]">
          <span className="text-[13px] text-[#565e74]">
            {isRTL
              ? `عرض ${filtered.length} من أصل ${items.length} حالة اختبار`
              : `Showing ${filtered.length} of ${items.length} test cases`}
          </span>
        </div>
      </Card>

      {/* ── Custom Deletion Confirmation Modal Dialog (NO alerts) ── */}
      {itemToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setItemToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            {/* Header with red trash badge */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#0b1c30]">
                  {isRTL ? "تأكيد حذف حالة الاختبار" : "Confirm Test Case Deletion"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isRTL
                    ? "هل أنت متأكد من رغبتك في حذف حالة الاختبار هذه نهائياً؟"
                    : "Are you sure you want to permanently delete this test case?"}
                </p>
              </div>
            </div>

            {/* Target Case Info Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {isRTL ? "معرّف الحالة:" : "Case ID:"}
                </span>
                <span className="font-mono font-bold text-[#006685]">
                  {itemToDelete.testId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {isRTL ? "المشروع / الوحدة:" : "Module / Project:"}
                </span>
                <span className="font-bold text-[#0b1c30]">
                  {itemToDelete.module}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 font-medium shrink-0">
                  {isRTL ? "السيناريو:" : "Scenario:"}
                </span>
                <span className="text-slate-700 truncate max-w-[240px]">
                  {itemToDelete.scenario}
                </span>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {isRTL
                  ? "لا يمكن التراجع عن هذا الإجراء بمجرد تأكيد الحذف."
                  : "This action cannot be undone once deleted."}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="h-10 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeleting
                    ? isRTL
                      ? "جاري الحذف..."
                      : "Deleting..."
                    : isRTL
                    ? "تأكيد الحذف"
                    : "Delete"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details View Modal ────────────────────────────────────── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#006685] font-mono font-bold text-sm">
                  {selectedItem.testId.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0b1c30]">
                    {selectedItem.testId} - {selectedItem.module}
                  </h3>
                  {selectedItem.pageName && (
                    <p className="text-xs text-[#6d797f]">
                      {isRTL ? "الصفحة: " : "Page: "}
                      {selectedItem.pageName}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 font-bold ${
                  statusMap[selectedItem.status]?.badgeClass || ""
                }`}
              >
                {isRTL
                  ? statusMap[selectedItem.status]?.labelAr
                  : statusMap[selectedItem.status]?.labelEn}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 font-bold ${
                  priorityMap[selectedItem.priority]?.badgeClass || ""
                }`}
              >
                {isRTL ? "الأولوية: " : "Priority: "}
                {isRTL
                  ? priorityMap[selectedItem.priority]?.labelAr
                  : priorityMap[selectedItem.priority]?.labelEn}
              </Badge>
              {selectedItem.tester?.name && (
                <div className="flex items-center gap-1.5 text-xs text-[#565e74]">
                  <User className="w-3.5 h-3.5 text-[#006685]" />
                  <span>{selectedItem.tester.name}</span>
                </div>
              )}
              {selectedItem.executedAt && (
                <div className="flex items-center gap-1.5 text-xs text-[#565e74]">
                  <Calendar className="w-3.5 h-3.5 text-[#006685]" />
                  <span>{new Date(selectedItem.executedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</span>
                </div>
              )}
            </div>

            {/* Scenario */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#565e74] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#006685]" />
                <span>{isRTL ? "سيناريو الاختبار:" : "Test Scenario:"}</span>
              </label>
              <p className="p-3.5 bg-[#f8f9ff] rounded-xl text-sm text-[#0b1c30] leading-relaxed border border-[#e5eeff]">
                {selectedItem.scenario}
              </p>
            </div>

            {/* Preconditions */}
            {selectedItem.preConditions && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#565e74]">
                  {isRTL ? "الشروط المسبقة:" : "Pre-conditions:"}
                </label>
                <p className="p-3 bg-[#f8f9ff] rounded-xl text-xs text-[#3d484f] border border-[#e5eeff]">
                  {selectedItem.preConditions}
                </p>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#565e74] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#006685]" />
                <span>{isRTL ? "خطوات التنفيذ:" : "Test Steps:"}</span>
              </label>
              <div className="space-y-2">
                {Array.isArray(selectedItem.steps) && selectedItem.steps.length > 0 ? (
                  selectedItem.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-[#0b1c30]"
                    >
                      <span className="w-5 h-5 rounded-md bg-[#006685] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">-</p>
                )}
              </div>
            </div>

            {/* Expected & Actual Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#006c49]">
                  {isRTL ? "النتيجة المتوقعة:" : "Expected Result:"}
                </label>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed min-h-[60px]">
                  {selectedItem.expectedResult}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#565e74]">
                  {isRTL ? "النتيجة الفعلية:" : "Actual Result:"}
                </label>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-[#3d484f] leading-relaxed min-h-[60px]">
                  {selectedItem.actualResult || (isRTL ? "لم تُسجل بعد" : "Not recorded")}
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedItem.notes && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#565e74]">
                  {isRTL ? "ملاحظات إضافية:" : "Notes:"}
                </label>
                <p className="p-3 bg-slate-50 rounded-xl text-xs text-[#3d484f]">
                  {selectedItem.notes}
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {selectedItem.status === "failed" ? (
                <Link
                  href={`/test-cases/email?id=${selectedItem.id}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {isRTL ? "إرسال تقرير الخلل عبر Outlook" : "Send Defect Report (Outlook)"}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl text-xs font-bold px-5 cursor-pointer"
              >
                {isRTL ? "إغلاق" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal Dialog ─────────────────────────────────────── */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => !isUpdating && setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#006685]">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0b1c30]">
                    {isRTL ? "تعديل حالة الاختبار" : "Edit Test Case"}:{" "}
                    <span className="font-mono text-[#006685]">
                      {editingItem.testId}
                    </span>
                  </h3>
                  <p className="text-xs text-[#6d797f]">
                    {isRTL
                      ? "قم بتعديل البيانات المطلوبة ثم اضغط حفظ التعديلات."
                      : "Modify test case details and click Save Changes."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {/* Row 1: Module / Project & Page Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {isRTL ? "المشروع / الوحدة (Module)" : "Project / Module"}
                  </label>
                  <Select
                    value={editFormData.module || ""}
                    onValueChange={(val) => {
                      const proj = allProjects.find((p) => p.name === val);
                      setEditFormData((prev) => ({
                        ...prev,
                        module: val || "",
                        projectId: proj ? proj.id : prev.projectId,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl">
                      <SelectValue>
                        {editFormData.module || (isRTL ? "اختر المشروع" : "Select Project")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {allProjects.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {isRTL ? "اسم الصفحة (Page Name)" : "Page Name"}
                  </label>
                  <Input
                    value={editFormData.pageName || ""}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        pageName: e.target.value,
                      }))
                    }
                    placeholder={isRTL ? "مثال: صفحة تسجيل الدخول" : "e.g. Login Page"}
                    className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Row 2: Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {isRTL ? "الأولوية" : "Priority"}
                  </label>
                  <Select
                    value={editFormData.priority || "medium"}
                    onValueChange={(val: any) =>
                      setEditFormData((prev) => ({ ...prev, priority: val }))
                    }
                  >
                    <SelectTrigger className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl">
                      <SelectValue>
                        {editFormData.priority
                          ? (isRTL ? priorityMap[editFormData.priority]?.labelAr : priorityMap[editFormData.priority]?.labelEn)
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="critical">
                        {isRTL ? "حرجة" : "Critical"}
                      </SelectItem>
                      <SelectItem value="high">
                        {isRTL ? "عالية" : "High"}
                      </SelectItem>
                      <SelectItem value="medium">
                        {isRTL ? "متوسطة" : "Medium"}
                      </SelectItem>
                      <SelectItem value="low">
                        {isRTL ? "منخفضة" : "Low"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {isRTL ? "الحالة" : "Status"}
                  </label>
                  <Select
                    value={editFormData.status || "pending"}
                    onValueChange={(val: any) =>
                      setEditFormData((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl">
                      <SelectValue>
                        {editFormData.status
                          ? (isRTL ? statusMap[editFormData.status]?.labelAr : statusMap[editFormData.status]?.labelEn)
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pending">
                        {isRTL ? "قيد الانتظار" : "Pending"}
                      </SelectItem>
                      <SelectItem value="passed">
                        {isRTL ? "ناجح" : "Passed"}
                      </SelectItem>
                      <SelectItem value="failed">
                        {isRTL ? "فاشل" : "Failed"}
                      </SelectItem>
                      <SelectItem value="skipped">
                        {isRTL ? "تم التخطي" : "Skipped"}
                      </SelectItem>
                      <SelectItem value="blocked">
                        {isRTL ? "محظور" : "Blocked"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scenario */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0b1c30]">
                  {isRTL ? "سيناريو الاختبار *" : "Test Scenario *"}
                </label>
                <Textarea
                  required
                  rows={2}
                  value={editFormData.scenario || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      scenario: e.target.value,
                    }))
                  }
                  className="text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                />
              </div>

              {/* Preconditions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0b1c30]">
                  {isRTL ? "الشروط المسبقة" : "Pre-conditions"}
                </label>
                <Input
                  value={editFormData.preConditions || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      preConditions: e.target.value,
                    }))
                  }
                  className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                />
              </div>

              {/* Dynamic Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {isRTL ? "خطوات الاختبار" : "Test Steps"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditSteps((prev) => [...prev, ""])}
                    className="text-xs text-[#006685] hover:text-[#00aee0] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isRTL ? "إضافة خطوة" : "Add Step"}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {editSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#006685] font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={step}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditSteps((prev) =>
                            prev.map((s, i) => (i === idx ? val : s))
                          );
                        }}
                        placeholder={
                          isRTL
                            ? `الخطوة رقم ${idx + 1}`
                            : `Step ${idx + 1}`
                        }
                        className="h-9 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                      />
                      {editSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditSteps((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected & Actual Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#006c49]">
                    {isRTL ? "النتيجة المتوقعة *" : "Expected Result *"}
                  </label>
                  <Textarea
                    required
                    rows={2}
                    value={editFormData.expectedResult || ""}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        expectedResult: e.target.value,
                      }))
                    }
                    className="text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#565e74]">
                    {isRTL ? "النتيجة الفعلية" : "Actual Result"}
                  </label>
                  <Textarea
                    rows={2}
                    value={editFormData.actualResult || ""}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        actualResult: e.target.value,
                      }))
                    }
                    className="text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#565e74]">
                  {isRTL ? "ملاحظات إضافية" : "Additional Notes"}
                </label>
                <Input
                  value={editFormData.notes || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="h-10 text-[13px] bg-[#f8f9ff] border-slate-200 rounded-xl"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={isUpdating}
                  className="rounded-xl text-xs font-bold px-4 cursor-pointer"
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl text-xs font-bold px-5 bg-[#00A2D2] hover:bg-[#008eb8] text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isUpdating
                      ? isRTL
                        ? "جاري الحفظ..."
                        : "Saving..."
                      : isRTL
                      ? "حفظ التعديلات"
                      : "Save Changes"}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
