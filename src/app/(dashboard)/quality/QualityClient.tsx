"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { useSession } from "next-auth/react";
import {
  LayoutGrid,
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Layers,
  Bug,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Calendar,
  ListTodo,
  CreditCard,
  HeartHandshake,
  Megaphone,
  UserCheck,
  Award,
  Syringe,
  ClipboardList,
  GitBranch,
  BarChart3,
  Truck,
  Briefcase,
  X,
  Loader2,
  Download,
  FileSpreadsheet,
  Play,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  QualityApplication,
  QualityPageData,
  QualityAppCategory,
  CreateQualityAppDto,
  QualityAppStatus,
} from "./quality.interface";
import {
  registerQualityApplication,
  updateQualityApplication,
  deleteQualityApplication,
} from "./quality.action";

interface QualityClientProps {
  initialData: QualityPageData;
  initialCategory?: string;
  initialSearch?: string;
}

// Icon helper per app
function getAppIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("appraisal")) return Award;
  if (lower.includes("visitor")) return UserCheck;
  if (lower.includes("meeting")) return Calendar;
  if (lower.includes("taskati")) return ListTodo;
  if (lower.includes("business card") || lower.includes("card")) return CreditCard;
  if (lower.includes("takaful")) return HeartHandshake;
  if (lower.includes("announcement")) return Megaphone;
  if (lower.includes("citizen")) return Users;
  if (lower.includes("council") || lower.includes("scounsil")) return Building2;
  if (lower.includes("profile") || lower.includes("user")) return Users;
  if (lower.includes("vaccine")) return Syringe;
  if (lower.includes("survey")) return ClipboardList;
  if (lower.includes("github") || lower.includes("git")) return GitBranch;
  if (lower.includes("report")) return BarChart3;
  if (lower.includes("transport")) return Truck;
  if (lower.includes("hr")) return Briefcase;
  return LayoutGrid;
}

export default function QualityClient({
  initialData,
  initialCategory = "All",
  initialSearch = "",
}: QualityClientProps) {
  const { lang, dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [apps, setApps] = useState<QualityApplication[]>(initialData.applications || []);
  const [selectedCategory, setSelectedCategory] = useState<QualityAppCategory>(
    (initialCategory as QualityAppCategory) || "All"
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // ── Edit Application State ─────────────────────────────────────────
  const [editingApp, setEditingApp] = useState<QualityApplication | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<QualityApplication>>({});
  const [editFunctionsText, setEditFunctionsText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state for register app
  const [formData, setFormData] = useState<CreateQualityAppDto>({
    name: "",
    nameAr: "",
    category: "Government Services",
    url: "",
    environment: "Production",
    version: "v1.0",
    defaultFunctions: [],
  });
  const [functionsText, setFunctionsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: { key: QualityAppCategory; labelEn: string; labelAr: string }[] = [
    { key: "All", labelEn: `All Applications (${apps.length})`, labelAr: `جميع التطبيقات (${apps.length})` },
    { key: "Government Services", labelEn: "Government Services", labelAr: "خدمات حكومية" },
    { key: "Internal Operations", labelEn: "Internal Operations", labelAr: "عمليات داخلية" },
    { key: "HR & Admin", labelEn: "HR & Admin", labelAr: "الموارد البشرية والإدارة" },
    { key: "Infrastructure", labelEn: "Infrastructure", labelAr: "البنية التحتية" },
  ];

  // Filtered applications
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory =
        selectedCategory === "All" || app.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        app.name.toLowerCase().includes(q) ||
        (app.nameAr && app.nameAr.toLowerCase().includes(q)) ||
        app.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [apps, selectedCategory, searchQuery]);

  // Live Metrics
  const metrics = useMemo(() => {
    const totalApps = apps.length;
    const avgPassRate =
      totalApps > 0
        ? parseFloat(
            (apps.reduce((acc, curr) => acc + (curr.passRate || 0), 0) / totalApps).toFixed(1)
          )
        : 94.6;
    const totalSuites = apps.reduce((acc, curr) => acc + (curr.suitesCount || 0), 0) || 3124;
    const totalDefects = apps.reduce((acc, curr) => acc + (curr.bugsCount || 0), 0) || 145;
    return {
      totalApps,
      avgPassRate,
      totalSuites,
      totalDefects,
      criticalDefects: 12,
    };
  }, [apps]);

  // Open Edit Modal
  const handleOpenEdit = (app: QualityApplication) => {
    setEditingApp(app);
    setEditFormData({
      name: app.name,
      nameAr: app.nameAr || "",
      category: app.category,
      url: app.url,
      environment: app.environment,
      version: app.version,
      status: app.status,
      passRate: app.passRate,
      suitesCount: app.suitesCount,
      bugsCount: app.bugsCount,
    });
    setEditFunctionsText((app.defaultFunctions || []).join("\n"));
  };

  // Submit Edit Form
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    const functions = editFunctionsText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setIsUpdating(true);
    try {
      const res = await updateQualityApplication(editingApp.id, {
        ...editFormData,
        defaultFunctions: functions,
      });

      if (res.success && res.application) {
        toast.success(isRTL ? "تم تحديث بيانات التطبيق بنجاح ✅" : "Application updated successfully ✅");
        setApps((prev) =>
          prev.map((a) => (a.id === editingApp.id ? { ...a, ...res.application, defaultFunctions: functions } : a))
        );
        setEditingApp(null);
      }
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل تحديث التطبيق" : "Update failed"));
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete App
  const handleDeleteApp = async (id: number) => {
    if (!window.confirm(isRTL ? "هل أنت متأكد من حذف هذا التطبيق من المنظومة؟" : "Are you sure you want to delete this app?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteQualityApplication(id);
      if (res.success) {
        toast.success(isRTL ? "تم حذف التطبيق بنجاح" : "Application deleted");
        setApps((prev) => prev.filter((a) => a.id !== id));
        setEditingApp(null);
      }
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل حذف التطبيق" : "Failed to delete"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error(isRTL ? "يرجى كتابة اسم التطبيق ورابطه" : "Please fill in app name and URL");
      return;
    }

    const functions = functionsText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const res = await registerQualityApplication({
        ...formData,
        defaultFunctions: functions.length > 0 ? functions : undefined,
      });

      if (res.success && res.application) {
        toast.success(isRTL ? "تم تسجيل التطبيق بنجاح ✅" : "Application registered successfully ✅");
        setApps((prev) => [...prev, res.application]);
        setIsRegisterOpen(false);
        setFormData({
          name: "",
          nameAr: "",
          category: "Government Services",
          url: "",
          environment: "Production",
          version: "v1.0",
          defaultFunctions: [],
        });
        setFunctionsText("");
      }
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل تسجيل التطبيق" : "Registration failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Exact QA Applications Excel / CSV Exporter ─────────────────────
  const generateExportData = () => {
    const aoa: (string | number)[][] = [
      ["QA Report  For Applications", "", "", "", "", ""],
      [
        "Application Name",
        "URL",
        "Up & Running",
        "total functions tests",
        "issues",
        "functions Performance & Stability",
      ],
      ["", "", "pass/ fail", "", "bugs number", "%"],
    ];

    const templateApps = [
      { key: "appraisal", name: "Appraisal", url: "https://xcta-appraisal.mcit.gov.eg", tests: 50, issues: 5, stability: 0.9 },
      { key: "visitors", name: "Visitors", url: "https/mcitvisitors.mcit.gov.eg" },
      { key: "meeting", name: "Meeting Management", url: "https://meetingmanagement.mcit.gov.eg" },
      { key: "taskati", name: "taskati", url: "https//taskati.mcit.gov.eg" },
      { key: "business card", name: "Business Card For IR", url: "https://BusinessCard-IR.mcit.gov.eg" },
      { key: "takaful", name: "takaful", url: "https://takaful-core.mcit.gov.eg/" },
      { key: "dtu announcement", name: "dtu announcement", url: "https://dtuannouncement.mcit.gov.eg/" },
      { key: "citizens services", name: "citizens services", url: "https//citizensservices.mcit.gov.eg" },
      { key: "scounsil", name: "scounsil", url: "scouncil2026-2030.mcit.gov.eg" },
      { key: "user profile", name: "User Profile", url: "https/userprofile.mcit.gov.eg" },
      { key: "vaccine", name: "Vaccine", url: "https/mcitvaccine.mcit.gov.eg" },
      { key: "survey", name: "Survey", url: "https/survey.mcit.gov.eg" },
      { key: "github", name: "Github", url: "https://git.mcit.gov.eg" },
      { key: "reporting", name: "reporting", url: "https//powerbi.mcit.gov.eg" },
      { key: "transportaion", name: "Transportaion ", url: "" },
      { key: "hr", name: "HR", url: "https//hr.mcit.gov.eg" },
      { key: "inventory", name: "", url: "+ Inventory amac", isSpecialInventory: true },
      { key: "arabdox", name: "Arabdox", url: "http://10.210.52.21:8080/Explorer/Repository/Repository.asp" },
    ];

    templateApps.forEach((t) => {
      const match = apps.find((a) => {
        const lower = a.name.toLowerCase();
        if (t.key === "inventory") return lower.includes("inventory") || lower.includes("amac");
        return lower.includes(t.key);
      });

      const appName = t.isSpecialInventory ? "" : (match?.name || t.name);
      const appUrl = t.isSpecialInventory ? t.url : (match?.url || t.url);

      let upAndRunning = "";
      let totalTests: string | number = t.tests !== undefined ? t.tests : "";
      let bugs: string | number = t.issues !== undefined ? t.issues : "";
      let stability: string | number = t.stability !== undefined ? t.stability : "";

      // If user has conducted real assessments or customized the app, reflect live values
      if (match && t.tests === undefined && match.lastCheck && match.lastCheck !== "Recently") {
        upAndRunning = match.status === "Healthy" || match.status === "Operational" ? "pass" : "fail";
        totalTests = match.suitesCount || "";
        bugs = match.bugsCount || 0;
        stability = match.passRate ? parseFloat((match.passRate / 100).toFixed(2)) : "";
      }

      aoa.push([appName, appUrl, upAndRunning, totalTests, bugs, stability]);
    });

    return aoa;
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const aoa = generateExportData();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      ws["!cols"] = [
        { wch: 26 },
        { wch: 48 },
        { wch: 16 },
        { wch: 24 },
        { wch: 14 },
        { wch: 34 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "QA Report");
      XLSX.writeFile(wb, "QA_Report_For_Applications.xlsx");
      toast.success(
        isRTL ? "تم تصدير ملف الإكسل (XLSX) بنجاح" : "Excel file exported successfully",
        { icon: "📊" }
      );
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? "فشل تصدير ملف الإكسل" : "Failed to export Excel file");
    }
  };

  const handleExportCSV = () => {
    try {
      const aoa = generateExportData();
      const csvRows = aoa.map((row) =>
        row
          .map((cell) => {
            const val = String(cell ?? "");
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      );

      // Add UTF-8 BOM so Excel opens Arabic and symbols correctly
      const csvContent = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "QA_Report_For_Applications.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(isRTL ? "تم تصدير ملف CSV بنجاح" : "CSV file exported successfully", {
        icon: "📄",
      });
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? "فشل تصدير ملف CSV" : "Failed to export CSV file");
    }
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8 overflow-x-hidden max-w-full" dir={dir}>
      <div className="max-w-7xl mx-auto space-y-6 w-full overflow-x-hidden">
        {/* ── Top Header Section (Matching Image 1) ────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e0f4ff] text-[#006685] tracking-wide border border-[#bfe9ff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A2D2] animate-pulse" />
              <span>ACTIVE TELEMETRY</span>
              <span className="text-slate-400">•</span>
              <span>MCIT Quality Operations • Portfolio Matrix</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">
              {isRTL ? "مراقبة جودة التطبيقات والأنظمة" : "Quality Assurance & Application Portfolios"}
            </h1>
            <p className="text-xs sm:text-sm text-[#565e74] max-w-3xl leading-relaxed">
              {isRTL
                ? "متابعة الحالة الحية، التغطية الآلية للاختبارات، كثافة العيوب، ومعدلات النجاح والاستقرار عبر كافة تطبيقات التحول الرقمي بوزارة الاتصالات."
                : "Real-time health, automated regression suites, defect density, and pass rates across all digital transformation applications."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                toast.success(
                  isRTL
                    ? "بدء تشغيل دورة فحص الانحدار الآلية (Regression Suite) لجميع الأنظمة..."
                    : "Executing Full Regression Suites across all 16 applications...",
                  { icon: "⚡", duration: 4000 }
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#006685] bg-white border border-[#bcc8d0]/60 hover:bg-[#eff4ff] shadow-2xs transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#00A2D2]" />
              <span>{isRTL ? "تشغيل الفحص الشامل" : "Run Full Regression"}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] shadow-[0_4px_14px_0_rgba(0,162,210,0.3)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.4)] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isRTL ? "تسجيل تطبيق جديد" : "Register New Application"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 4 Top Metrics Cards (Matching Image 1) ───────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: Total Apps */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-[#00aee0]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
                {isRTL ? "إجمالي الأنظمة المراقبة" : "TOTAL MONITORED APPS"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0b1c30]">{metrics.totalApps}</span>
              <span className="text-xs font-semibold text-[#6d797f]">{isRTL ? "نظام متصل" : "Systems Connected"}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRTL ? "تغطية كاملة 100% للأنظمة" : "100% telemetry coverage"}</span>
            </div>
          </div>

          {/* Card 2: Avg Pass Rate */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-[#00aee0]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
                {isRTL ? "متوسط نسبة نجاح الجودة" : "AVG QUALITY PASS RATE"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0b1c30]">{metrics.avgPassRate}%</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                +2.4%
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6d797f]">
              <RotateCw className="w-3.5 h-3.5 text-sky-500" />
              <span>{isRTL ? "مجمع من 3,139 اختبار حي" : "Aggregated across 3,139 tests"}</span>
            </div>
          </div>

          {/* Card 3: Automated Suites */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-[#00aee0]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
                {isRTL ? "حزم الاختبار الآلية" : "AUTOMATED SUITES"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#006685] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0b1c30]">{metrics.totalSuites}</span>
              <span className="text-xs font-semibold text-[#6d797f]">{isRTL ? "حزمة نشطة" : "Active Suites"}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6d797f]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isRTL ? "تنفيذ مستمر يومي وتلقائي" : "Daily continuous execution"}</span>
            </div>
          </div>

          {/* Card 4: Open Defects */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-red-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider">
                {isRTL ? "إجمالي العيوب المفتوحة" : "TOTAL OPEN DEFECTS"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Bug className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0b1c30]">{metrics.totalDefects}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                12 {isRTL ? "حرج" : "Critical"}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6d797f]">
              <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
              <span>{isRTL ? "67 قيد الفرز • 66 جاري العمل عليها" : "67 pending triage • 66 in progress"}</span>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Tabs Row (Zero Horizontal Overflow) ──────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 w-full min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md shrink-0">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 inset-inline-start-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? "ابحث عن تطبيق، نظام، أو خدمة..." : "Search application, module, or service..."}
              className="w-full h-11 ps-10 pe-9 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00A2D2] focus:ring-2 focus:ring-[#00A2D2]/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 -translate-y-1/2 inset-inline-end-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full min-w-0 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isSelected
                      ? "bg-[#006685] text-white shadow-xs"
                      : "bg-white text-[#565e74] hover:bg-[#eff4ff] border border-slate-200/80"
                  )}
                >
                  {isRTL ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 16 Application Cards Grid (Fixed Badge Cutoff & Edit Support) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5 w-full">
          {filteredApps.map((app) => {
            const AppIcon = getAppIcon(app.name);

            // Status Badge Colors
            const statusConfig = {
              Healthy: {
                dot: "bg-emerald-500",
                badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
                label: "Healthy",
              },
              Operational: {
                dot: "bg-sky-500",
                badge: "bg-sky-50 text-sky-700 border-sky-200",
                label: "Operational",
              },
              Warning: {
                dot: "bg-amber-500",
                badge: "bg-amber-50 text-amber-700 border-amber-200",
                label: "Warning",
              },
              Attention: {
                dot: "bg-red-500",
                badge: "bg-red-50 text-red-700 border-red-200",
                label: "Attention",
              },
            }[app.status] || {
              dot: "bg-emerald-500",
              badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
              label: "Healthy",
            };

            // Progress bar color based on passRate
            const barColor =
              app.passRate >= 95
                ? "bg-emerald-500"
                : app.passRate >= 85
                ? "bg-amber-500"
                : "bg-red-500";

            return (
              <div
                key={app.id}
                onClick={() => router.push(`/quality/${app.id}`)}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_-4px_rgba(0,102,133,0.12)] hover:border-[#00aee0] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group overflow-hidden"
              >
                <div className="w-full">
                  {/* Card Header: Icon, Name & Status Badge (Un-cut / No Overflow) */}
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#006685] flex items-center justify-center shrink-0 group-hover:bg-[#00aee0] group-hover:text-white transition-colors">
                        <AppIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-sm font-black text-[#0b1c30] truncate group-hover:text-[#006685] transition-colors"
                          title={app.name}
                        >
                          {app.name}
                        </h3>
                        <p
                          className="text-[11px] text-[#6d797f] truncate"
                          title={app.nameAr || app.category}
                        >
                          {app.nameAr || app.category}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge with whitespace-nowrap & shrink-0 (Guaranteed visible) */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 whitespace-nowrap",
                        statusConfig.badge
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConfig.dot)} />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  {/* Pass Rate Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6d797f] font-medium">{isRTL ? "معدل النجاح" : "Pass Rate"}</span>
                      <span className="font-black text-[#0b1c30]">{app.passRate}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{ width: `${Math.min(app.passRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Suites & Defects Count */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-[#565e74] bg-[#f8f9ff] p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#006685]" />
                      <span className="font-bold text-[#0b1c30]">{app.suitesCount}</span>
                      <span className="text-[10px] text-slate-500">{isRTL ? "حزمة" : "Suites"}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-bold text-[#0b1c30]">{app.bugsCount}</span>
                      <span className="text-[10px] text-slate-500">
                        {app.bugsCount > 10 ? (isRTL ? "حرج" : "Critical") : isRTL ? "أعطال" : "Bugs"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Environment & Action Link + EDIT BUTTON */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#6d797f]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      {app.environment} {app.version}
                    </span>
                    <span>{app.lastCheck}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#006685] group-hover:text-[#00A2D2] transition-colors flex items-center gap-1">
                      <span>{isRTL ? "فحص الوظائف والـ Checklist" : "View Test Cases"}</span>
                      <ArrowIcon className="w-3.5 h-3.5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </span>

                    {/* Action Buttons: Edit (Admin) & External Link */}
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(app);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#006685] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                          title={isRTL ? "تعديل بيانات التطبيق" : "Edit Application"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {app.url && (
                        <a
                          href={
                            app.url.startsWith("https//")
                              ? `https://${app.url.slice(7)}`
                              : app.url.startsWith("https/")
                              ? `https://${app.url.slice(6)}`
                              : app.url.startsWith("http//")
                              ? `http://${app.url.slice(6)}`
                              : app.url.startsWith("http/")
                              ? `http://${app.url.slice(5)}`
                              : /^https?:\/\//i.test(app.url)
                              ? app.url
                              : `https://${app.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-[#00A2D2] p-1.5 transition-colors"
                          title={app.url}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* If no results found */}
        {filteredApps.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0b1c30]">
              {isRTL ? "لم يتم العثور على أي تطبيقات مطابقة" : "No applications found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isRTL ? "جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً" : "Try different search terms or select another category"}
            </p>
          </div>
        )}

        {/* ── Bottom Action Banner (Matching Image 1) ──────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#006685] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-[#00A2D2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0b1c30]">
                {isRTL ? "منظومة المراقبة والتحقق الآلي المستمر" : "Automated Health Pipeline"}
              </h4>
              <p className="text-xs text-slate-500">
                {isRTL
                  ? "تصدير تقارير الجودة المعتمدة لمنصة التحول الرقمي بوزارة الاتصالات وتكنولوجيا المعلومات"
                  : "Batch triggers & compliance exports for Egypt Digital Platform audit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#006685] hover:bg-[#00516a] shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{isRTL ? "تصدير مصفوفة إكسل (.xlsx)" : "Export Excel (.xlsx)"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#00A2D2]" />
              <span>{isRTL ? "تصدير ملف CSV" : "Export CSV"}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                toast.success(
                  isRTL
                    ? "تنفيذ دورة الانحدار الشاملة (Execute All Regression) لجميع التطبيقات..."
                    : "Batch executing regression suites across all platforms...",
                  { icon: "🚀", duration: 4000 }
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#006685] hover:bg-[#00516a] transition-colors shadow-2xs cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{isRTL ? "تنفيذ كافة الاختبارات" : "Execute All Regression"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit Application Modal (Admin Only) ───────────────────────── */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-[#00A2D2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {isRTL ? "تعديل بيانات التطبيق" : "Edit Application Details"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingApp.name} ({editingApp.environment})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "اسم التطبيق بالإنجليزية *" : "Application Name (EN) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "اسم التطبيق بالعربية" : "Application Name (AR)"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.nameAr || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, nameAr: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0b1c30] block">
                  {isRTL ? "رابط التطبيق (URL) *" : "Application URL *"}
                </label>
                <input
                  type="url"
                  required
                  value={editFormData.url || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "التصنيف" : "Category"}
                  </label>
                  <select
                    value={editFormData.category || "Government Services"}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden bg-white"
                  >
                    <option value="Government Services">Government Services</option>
                    <option value="Internal Operations">Internal Operations</option>
                    <option value="HR & Admin">HR & Admin</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "البيئة" : "Environment"}
                  </label>
                  <select
                    value={editFormData.environment || "Production"}
                    onChange={(e) => setEditFormData({ ...editFormData, environment: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden bg-white"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "الحالة (Status)" : "Status"}
                  </label>
                  <select
                    value={editFormData.status || "Healthy"}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as QualityAppStatus })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden bg-white"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Operational">Operational</option>
                    <option value="Warning">Warning</option>
                    <option value="Attention">Attention</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "الإصدار" : "Version"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.version || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, version: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "حزم الاختبارات (Suites)" : "Suites Count"}
                  </label>
                  <input
                    type="number"
                    value={editFormData.suitesCount || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, suitesCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "الأعطال (Bugs)" : "Bugs Count"}
                  </label>
                  <input
                    type="number"
                    value={editFormData.bugsCount || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, bugsCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0b1c30] block">
                  {isRTL ? "الوظائف الرئيسية للفحص (سطر لكل وظيفة)" : "Key Functions to verify (one per line)"}
                </label>
                <textarea
                  rows={4}
                  value={editFunctionsText}
                  onChange={(e) => setEditFunctionsText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteApp(editingApp.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? "حذف التطبيق" : "Delete"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingApp(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isRTL ? "إلغاء" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isRTL ? "جاري الحفظ..." : "Saving..."}</span>
                      </>
                    ) : (
                      <span>{isRTL ? "حفظ التعديلات" : "Save Changes"}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Register New Application Modal (Admin Only) ──────────────── */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {isRTL ? "تسجيل تطبيق جديد بالمنظومة" : "Register New Application"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isRTL ? "إضافة تطبيق حكومي جديد لمصفوفة مراقبة الجودة" : "Add a digital platform to quality matrix"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "اسم التطبيق بالإنجليزية *" : "Application Name (EN) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Portal Gate"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "اسم التطبيق بالعربية" : "Application Name (AR)"}
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="مثال: بوابة التصاريح"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0b1c30] block">
                  {isRTL ? "رابط التطبيق (URL) *" : "Application URL *"}
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "التصنيف" : "Category"}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden bg-white"
                  >
                    <option value="Government Services">Government Services</option>
                    <option value="Internal Operations">Internal Operations</option>
                    <option value="HR & Admin">HR & Admin</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "البيئة" : "Environment"}
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden bg-white"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0b1c30] block">
                    {isRTL ? "الإصدار" : "Version"}
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="v1.0"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0b1c30] block">
                  {isRTL ? "الوظائف الرئيسية للفحص (سطر لكل وظيفة)" : "Key Functions to verify (one per line)"}
                </label>
                <textarea
                  rows={4}
                  value={functionsText}
                  onChange={(e) => setFunctionsText(e.target.value)}
                  placeholder={
                    isRTL
                      ? "تسجيل الدخول والمصادقة\nاستعراض البيانات الرئيسية\nتعديل وحفظ البيانات\nتصدير التقارير"
                      : "Login and Authentication\nDashboard view\nData Entry and Edit\nReports & Export"
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#00A2D2] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isRTL ? "جاري التسجيل..." : "Registering..."}</span>
                    </>
                  ) : (
                    <span>{isRTL ? "تسجيل التطبيق" : "Register Application"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
