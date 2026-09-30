"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Globe,
  Shield,
  FileText,
  BarChart3,
  Cpu,
  Landmark,
  Cloud,
  Scale,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Server,
  Layers,
  ArrowUpRight,
  X,
  Check,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/context/language-context";

export interface AssignedUser {
  id?: string;
  name: string;
  role: string;
  email: string;
}

interface ProjectItem {
  id: number;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  icon: any;
  env: "production" | "staging";
  status: "active" | "archived";
  tests: number;
  passed: number;
  failed: number;
  pending: number;
  successRate: number;
  color: string;
  bg: string;
  lastUpdated: string;
  leadTester: string;
  assignedUsers?: AssignedUser[];
}

export const availableTeamMembers: AssignedUser[] = [
  { id: "u1", name: "م. حسن علي", email: "h.ali@mcit.gov.eg", role: "مدير نظام / Lead QA" },
  { id: "u2", name: "م. أحمد حسني", email: "a.hosny@mcit.gov.eg", role: "مسؤول جودة (Lead QA)" },
  { id: "u3", name: "سارة خليل", email: "s.khalil@mcit.gov.eg", role: "مهندس اختبارات (Automation)" },
  { id: "u4", name: "عمر الشريف", email: "o.elserif@mcit.gov.eg", role: "مختبر أمان (Security QA)" },
  { id: "u5", name: "كريم عبد الرحمن", email: "k.abdelrahman@mcit.gov.eg", role: "مهندس أداء (Performance)" },
  { id: "u6", name: "نورهان مجدي", email: "n.magdy@mcit.gov.eg", role: "مختبر جودة (Manual QA)" },
];

const initialProjects: ProjectItem[] = [
  {
    id: 1,
    name: "البوابة الرقمية المصرية",
    nameEn: "Egypt Digital Portal",
    desc: "بوابة الخدمات الحكومية الشاملة والموحدة للمواطنين",
    descEn: "Comprehensive unified government services portal for citizens",
    icon: Globe,
    env: "production",
    status: "active",
    tests: 1420,
    passed: 1391,
    failed: 19,
    pending: 10,
    successRate: 98.0,
    color: "text-[#006685]",
    bg: "bg-[#bfe9ff]/50",
    lastUpdated: "منذ ساعتين",
    leadTester: "م. حسن علي",
  },
  {
    id: 2,
    name: "منظومة الرقابة على الاتصالات",
    nameEn: "Telecom Regulatory System",
    desc: "مراقبة جودة خدمات الاتصالات والنطاق العريض والشكاوى",
    descEn: "Monitoring telecom QoS, broadband speeds, and consumer complaints",
    icon: BarChart3,
    env: "production",
    status: "active",
    tests: 980,
    passed: 921,
    failed: 39,
    pending: 20,
    successRate: 94.0,
    color: "text-[#006c49]",
    bg: "bg-emerald-50",
    lastUpdated: "اليوم",
    leadTester: "سارة محمود",
  },
  {
    id: 3,
    name: "نظام خدمات البريد المصري",
    nameEn: "Egypt Post Digitization",
    desc: "رقمنة خدمات البريد السريع والمدفوعات الإلكترونية",
    descEn: "Digitizing postal services, tracking, and electronic pensions",
    icon: FileText,
    env: "staging",
    status: "active",
    tests: 675,
    passed: 594,
    failed: 41,
    pending: 40,
    successRate: 88.0,
    color: "text-amber-600",
    bg: "bg-amber-50",
    lastUpdated: "أمس",
    leadTester: "أحمد كمال",
  },
  {
    id: 4,
    name: "بوابة التوقيع الرقمي الموحد",
    nameEn: "Unified Digital Signature (PKI)",
    desc: "منظومة الـ PKI الوطنية والتوقيعات الإلكترونية المعتمدة",
    descEn: "National PKI infrastructure and certified digital signatures",
    icon: Shield,
    env: "production",
    status: "active",
    tests: 543,
    passed: 521,
    failed: 12,
    pending: 10,
    successRate: 96.0,
    color: "text-[#006685]",
    bg: "bg-[#bfe9ff]/50",
    lastUpdated: "منذ 3 أيام",
    leadTester: "م. حسن علي",
  },
  {
    id: 5,
    name: "منصة الهوية الرقمية الوطنية",
    nameEn: "National Digital Identity Platform",
    desc: "إدارة الهويات الرقمية الموحدة والتحقق البيومتري للمواطنين",
    descEn: "Unified digital identity and biometric citizen verification",
    icon: Cpu,
    env: "staging",
    status: "active",
    tests: 830,
    passed: 655,
    failed: 115,
    pending: 60,
    successRate: 78.9,
    color: "text-rose-600",
    bg: "bg-rose-50",
    lastUpdated: "منذ 4 أيام",
    leadTester: "طارق زياد",
  },
  {
    id: 6,
    name: "بوابة الخدمات الحكومية الموحدة",
    nameEn: "Unified Gov Services Gateway",
    desc: "نقطة وصول رقمية متكاملة لربط كافة الوزارات والهيئات",
    descEn: "Integrated API gateway interconnecting all ministries and authorities",
    icon: Landmark,
    env: "production",
    status: "active",
    tests: 1120,
    passed: 1030,
    failed: 50,
    pending: 40,
    successRate: 92.0,
    color: "text-[#006685]",
    bg: "bg-[#bfe9ff]/50",
    lastUpdated: "منذ أسبوع",
    leadTester: "إيمان الشريف",
  },
  {
    id: 7,
    name: "سحابة الحكومة المصرية الرقمية",
    nameEn: "EG Gov Cloud Platform",
    desc: "البنية التحتية السحابية الموحدة لاستضافة التطبيقات الحكومية",
    descEn: "Unified sovereign cloud infrastructure hosting governmental workloads",
    icon: Cloud,
    env: "staging",
    status: "active",
    tests: 430,
    passed: 395,
    failed: 15,
    pending: 20,
    successRate: 91.8,
    color: "text-sky-600",
    bg: "bg-sky-50",
    lastUpdated: "منذ أسبوعين",
    leadTester: "عمر فاروق",
  },
  {
    id: 8,
    name: "منظومة التقاضي الإلكتروني الموحد",
    nameEn: "E-Litigation Platform",
    desc: "المحاكم الرقمية ورفع الدعاوى القضائية إلكترونياً",
    descEn: "Digital courts, case filing, and remote legal hearings system",
    icon: Scale,
    env: "production",
    status: "archived",
    tests: 610,
    passed: 590,
    failed: 12,
    pending: 8,
    successRate: 96.7,
    color: "text-slate-600",
    bg: "bg-slate-100",
    lastUpdated: "منذ شهر",
    leadTester: "م. حسن علي",
  },
];

export default function ProjectsPage() {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [projectsList] = useState<ProjectItem[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal / Drawer UI State (Design Only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // User assignments state for Add/Edit modals (Design Only)
  const [addAssignedUserIds, setAddAssignedUserIds] = useState<string[]>(["u1", "u2", "u3"]);
  const [addLeadTester, setAddLeadTester] = useState("م. حسن علي");
  const [editAssignedUserIds, setEditAssignedUserIds] = useState<string[]>(["u1", "u2"]);

  const toggleAddAssignedUser = (userId: string) => {
    setAddAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleEditAssignedUser = (userId: string) => {
    setEditAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter projects purely in memory for design presentation
  const filtered = projectsList.filter((p) => {
    const matchSearch =
      !search ||
      p.name.includes(search) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.includes(search);
    const matchEnv = envFilter === "all" || p.env === envFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchEnv && matchStatus;
  });

  // Overview metrics
  const totalProjects = projectsList.length;
  const prodCount = projectsList.filter((p) => p.env === "production").length;
  const stagingCount = projectsList.filter((p) => p.env === "staging").length;
  const totalTests = projectsList.reduce((acc, curr) => acc + curr.tests, 0);
  const avgSuccessRate = (
    projectsList.reduce((acc, curr) => acc + curr.successRate, 0) / totalProjects
  ).toFixed(1);

  return (
    <div className="flex flex-col w-full p-4 sm:p-6 lg:p-8 gap-6 max-w-7xl mx-auto">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <Card className="border border-slate-200/80 shadow-xs bg-linear-to-r from-[#eff4ff] via-white to-[#eff4ff]/60 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#006685]" />
        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-[#006685]/10 text-[#006685] border-[#006685]/20 font-bold px-2.5 py-0.5"
              >
                <Sparkles className="w-3 h-3 me-1" />
                {isRTL ? "منظومة المشاريع القومية" : "National Projects Hub"}
              </Badge>
              <Badge variant="outline" className="text-slate-600 bg-white">
                {isRTL ? `إجمالي: ${totalProjects} مشروع` : `Total: ${totalProjects} Projects`}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
              {isRTL
                ? "إدارة ومتابعة مشاريع التحول الرقمي"
                : "Digital Transformation Project Management"}
            </h1>
            <p className="text-sm text-[#3d484f] leading-relaxed">
              {isRTL
                ? "استعراض شامل لجميع مشروعات وزارة الاتصالات وتكنولوجيا المعلومات مع مقاييس جودة الاختبارات ونسب النجاح الحية."
                : "Complete visibility into MCIT projects, test suite runs, and live quality assurance performance."}
            </p>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2 bg-[#006685] hover:bg-[#00526b] text-white shadow-md shadow-[#006685]/20 rounded-xl px-5 h-11 shrink-0 font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? "إضافة مشروع جديد" : "Add New Project"}</span>
          </Button>
        </CardContent>
      </Card>

      {/* ── KPI Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-xs rounded-xl bg-white hover:border-[#006685]/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6d797f]">
                {isRTL ? "إجمالي المشاريع" : "Total Projects"}
              </span>
              <span className="text-2xl font-black text-[#0b1c30] mt-1">
                {totalProjects}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {isRTL ? "محدث بالكامل" : "All Active"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#006685] shrink-0">
              <FolderGit2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs rounded-xl bg-white hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6d797f]">
                {isRTL ? "بيئة الإنتاج (Production)" : "Production Env"}
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1">
                {prodCount}
              </span>
              <span className="text-[11px] text-[#6d797f] font-medium mt-0.5">
                {isRTL ? "جاهزة للخدمة العامة" : "Public Services"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Server className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs rounded-xl bg-white hover:border-amber-500/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6d797f]">
                {isRTL ? "بيئة الاختبار (Staging)" : "Staging / QA"}
              </span>
              <span className="text-2xl font-black text-amber-700 mt-1">
                {stagingCount}
              </span>
              <span className="text-[11px] text-[#6d797f] font-medium mt-0.5">
                {isRTL ? "قيد فحص الجودة" : "Under Active QA"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs rounded-xl bg-white hover:border-[#00aee0]/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6d797f]">
                {isRTL ? "متوسط نسبة النجاح" : "Avg. Pass Rate"}
              </span>
              <span className="text-2xl font-black text-[#006685] mt-1">
                %{avgSuccessRate}
              </span>
              <span className="text-[11px] text-[#6d797f] font-medium mt-0.5">
                {isRTL ? `عبر ${totalTests.toLocaleString()} حالة اختبار` : `Across ${totalTests} test cases`}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-[#00aee0] shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & View Controls ──────────────────────────────────── */}
      <Card className="border border-slate-200/80 shadow-xs rounded-xl bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isRTL
                  ? "البحث باسم المشروع أو الوصف..."
                  : "Search by project name or description..."
              }
              className="ps-9 h-10 text-sm bg-slate-50/60 border-slate-200 focus-visible:bg-white rounded-lg"
            />
          </div>

          {/* Filter Selects & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Environment Filter */}
            <Select value={envFilter} onValueChange={(val) => setEnvFilter(val || "all")}>
              <SelectTrigger className="h-10 w-40 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                <SelectValue placeholder={isRTL ? "البيئة" : "Environment"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع البيئات" : "All Envs"}</SelectItem>
                <SelectItem value="production">{isRTL ? "إنتاج (Production)" : "Production"}</SelectItem>
                <SelectItem value="staging">{isRTL ? "اختبار (Staging)" : "Staging"}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-10 w-36 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="active">{isRTL ? "نشط (Active)" : "Active"}</SelectItem>
                <SelectItem value="archived">{isRTL ? "مؤرشف (Archived)" : "Archived"}</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-8 px-2.5 rounded-md cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#006685] text-white hover:bg-[#00526b]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={isRTL ? "عرض الكروت" : "Grid View"}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`h-8 px-2.5 rounded-md cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#006685] text-white hover:bg-[#00526b]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={isRTL ? "عرض الجدول" : "Table View"}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main View: Grid Mode ─────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const IconComponent = p.icon;
            const isProd = p.env === "production";
            const isActive = p.status === "active";

            return (
              <Card
                key={p.id}
                className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-[#006685]/50 bg-white"
              >
                <div>
                  {/* Card Header Top */}
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl ${p.bg} flex items-center justify-center shrink-0 shadow-xs ring-1 ring-slate-200/50`}
                        >
                          <IconComponent className={`w-5 h-5 ${p.color}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <CardTitle className="text-base font-bold text-[#0b1c30] truncate group-hover:text-[#006685] transition-colors">
                            {isRTL ? p.name : p.nameEn}
                          </CardTitle>
                          <span className="text-[11px] text-[#6d797f] truncate">
                            {isRTL ? p.leadTester : `Lead: ${p.leadTester}`}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${
                          isProd
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isProd
                          ? isRTL
                            ? "إنتاج"
                            : "Production"
                          : isRTL
                          ? "اختبار"
                          : "Staging"}
                      </Badge>
                    </div>

                    <CardDescription className="text-xs text-[#3d484f] line-clamp-2 mt-3 leading-relaxed">
                      {isRTL ? p.desc : p.descEn}
                    </CardDescription>
                  </CardHeader>

                  {/* Card Metrics Section */}
                  <CardContent className="px-5 py-3">
                    {/* Stats pill breakdown */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-center">
                      <div>
                        <span className="text-[10px] text-[#6d797f] block font-medium">
                          {isRTL ? "الإجمالي" : "Total"}
                        </span>
                        <span className="text-sm font-black text-[#0b1c30]">
                          {p.tests.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-medium">
                          {isRTL ? "ناجح" : "Passed"}
                        </span>
                        <span className="text-sm font-black text-emerald-600">
                          {p.passed.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 block font-medium">
                          {isRTL ? "راسب" : "Failed"}
                        </span>
                        <span className="text-sm font-black text-rose-600">
                          {p.failed.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Rate */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {isRTL ? "معدل جودة الاختبارات" : "Pass Success Rate"}
                        </span>
                        <span
                          className={`font-black ${
                            p.successRate >= 90
                              ? "text-emerald-600"
                              : p.successRate >= 80
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          %{p.successRate}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            p.successRate >= 90
                              ? "bg-emerald-500"
                              : p.successRate >= 80
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${p.successRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Assigned Users Avatar Stack */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Users className="w-3.5 h-3.5 text-[#006685]" />
                        <span>{isRTL ? "المسند إليهم:" : "Assigned:"}</span>
                      </span>
                      <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                        {(p.assignedUsers || [
                          { name: p.leadTester, role: "Lead", email: "" },
                          { name: "سارة خليل", role: "Tester", email: "" },
                        ]).map((u, i) => (
                          <div
                            key={i}
                            title={`${u.name} (${u.role})`}
                            className="w-6 h-6 rounded-full bg-[#eff4ff] text-[#006685] font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-2xs"
                          >
                            {u.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <CardFooter className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        isActive
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isActive
                        ? isRTL
                          ? "نشط"
                          : "Active"
                        : isRTL
                        ? "مؤرشف"
                        : "Archived"}
                    </Badge>
                    <span className="text-[10px] text-[#6d797f] hidden sm:inline">
                      {p.lastUpdated}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProject(p)}
                      className="h-8 px-2.5 text-xs text-[#006685] hover:bg-[#eff4ff] border-slate-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 me-1" />
                      <span>{isRTL ? "تفاصيل" : "View"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProject(p)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 cursor-pointer"
                      title={isRTL ? "تعديل" : "Edit"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Main View: Table Mode ────────────────────────────────────── */}
      {viewMode === "table" && (
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200">
                    <TableHead className="font-bold text-xs text-slate-600">
                      {isRTL ? "المشروع" : "Project"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">
                      {isRTL ? "البيئة" : "Environment"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">
                      {isRTL ? "الحالة" : "Status"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">
                      {isRTL ? "الإجمالي" : "Total"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">
                      {isRTL ? "ناجح" : "Passed"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">
                      {isRTL ? "راسب" : "Failed"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">
                      {isRTL ? "نسبة النجاح" : "Pass Rate"}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-end">
                      {isRTL ? "الإجراءات" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((p) => {
                    const isProd = p.env === "production";
                    const isActive = p.status === "active";

                    return (
                      <TableRow
                        key={p.id}
                        className="hover:bg-slate-50/60 border-slate-100 transition-colors"
                      >
                        {/* Project Info */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center shrink-0`}
                            >
                              <p.icon className={`w-4 h-4 ${p.color}`} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-[#0b1c30]">
                                {isRTL ? p.name : p.nameEn}
                              </span>
                              <span className="text-xs text-slate-500 line-clamp-1">
                                {isRTL ? p.desc : p.descEn}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {isRTL ? "المسند إليهم:" : "Assigned:"}
                                </span>
                                <div className="flex items-center -space-x-1 rtl:space-x-reverse">
                                  {(p.assignedUsers || [
                                    { name: p.leadTester, role: "Lead", email: "" },
                                    { name: "سارة خليل", role: "Tester", email: "" },
                                  ]).map((u, i) => (
                                    <div
                                      key={i}
                                      title={`${u.name} (${u.role})`}
                                      className="w-5 h-5 rounded-full bg-[#eff4ff] text-[#006685] font-bold text-[9px] flex items-center justify-center ring-1 ring-white"
                                    >
                                      {u.name.charAt(0)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Environment */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${
                              isProd
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isProd
                              ? isRTL
                                ? "إنتاج"
                                : "Production"
                              : isRTL
                              ? "اختبار"
                              : "Staging"}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isActive
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {isActive
                              ? isRTL
                                ? "نشط"
                                : "Active"
                              : isRTL
                              ? "مؤرشف"
                              : "Archived"}
                          </Badge>
                        </TableCell>

                        {/* Total Tests */}
                        <TableCell className="text-center font-bold text-slate-800">
                          {p.tests.toLocaleString()}
                        </TableCell>

                        {/* Passed */}
                        <TableCell className="text-center font-bold text-emerald-600">
                          {p.passed.toLocaleString()}
                        </TableCell>

                        {/* Failed */}
                        <TableCell className="text-center font-bold text-rose-600">
                          {p.failed.toLocaleString()}
                        </TableCell>

                        {/* Success Bar */}
                        <TableCell className="w-44">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.successRate >= 90
                                    ? "bg-emerald-500"
                                    : p.successRate >= 80
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${p.successRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700 w-10 text-end">
                              %{p.successRate}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProject(p)}
                              className="h-8 px-2.5 text-xs text-[#006685] hover:bg-[#eff4ff] border-slate-200 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 me-1" />
                              <span>{isRTL ? "تفاصيل" : "View"}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProject(p)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              title={isRTL ? "تعديل" : "Edit"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-12 text-center bg-white">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {isRTL ? "لا توجد مشاريع مطابقة للبحث" : "No matching projects found"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {isRTL
                ? "يرجى تجربة كلمات بحث أخرى أو تغيير تصفية البيئة والحالة."
                : "Try adjusting your search criteria or resetting filters."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setEnvFilter("all");
                setStatusFilter("all");
              }}
              className="mt-2 text-xs"
            >
              {isRTL ? "إعادة ضبط التصفية" : "Reset Filters"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL 1: Add New Project (Design Only) ────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#0b1c30]">
                  {isRTL ? "إضافة مشروع جديد" : "Add New Project"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {isRTL
                    ? "إدخال بيانات المشروع وربطه بمنظومة اختبارات الجودة"
                    : "Enter project details to link with QA test cases"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="projectName" className="text-xs font-bold text-slate-700">
                  {isRTL ? "اسم المشروع *" : "Project Name *"}
                </Label>
                <Input
                  id="projectName"
                  placeholder={
                    isRTL
                      ? "مثال: بوابة التصديق الإلكتروني"
                      : "e.g. Electronic Authentication Gateway"
                  }
                  className="h-10 text-sm"
                  defaultValue=""
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="projectDesc" className="text-xs font-bold text-slate-700">
                  {isRTL ? "وصف المشروع" : "Project Description"}
                </Label>
                <Textarea
                  id="projectDesc"
                  rows={3}
                  placeholder={
                    isRTL
                      ? "وصف مختصر لأهداف المشروع والخدمات التي يقدمها..."
                      : "Brief summary of project objectives and features..."
                  }
                  className="text-sm resize-none"
                  defaultValue=""
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "بيئة التشغيل" : "Environment"}
                  </Label>
                  <Select defaultValue="staging">
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staging">
                        {isRTL ? "اختبار (Staging)" : "Staging"}
                      </SelectItem>
                      <SelectItem value="production">
                        {isRTL ? "إنتاج (Production)" : "Production"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "الحالة" : "Status"}
                  </Label>
                  <Select defaultValue="active">
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {isRTL ? "نشط (Active)" : "Active"}
                      </SelectItem>
                      <SelectItem value="archived">
                        {isRTL ? "مؤرشف (Archived)" : "Archived"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lead QA Tester Selection */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-700">
                  {isRTL ? "المسؤول الرئيسي عن اختبارات المشروع (Lead QA) *" : "Lead QA Tester *"}
                </Label>
                <Select value={addLeadTester} onValueChange={(val) => setAddLeadTester(val || "")}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.name}>
                        {member.name} — {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign Team Members (Users Assigned to Project) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "المستخدمين المسند إليهم المشروع (فريق الاختبارات) *" : "Assigned Team Members *"}
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-[#006685] border-[#00aee0]/40 font-semibold">
                    {isRTL ? `${addAssignedUserIds.length} مستخدمين مسندين` : `${addAssignedUserIds.length} assigned`}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-100">
                  {availableTeamMembers.map((u) => {
                    const isAssigned = addAssignedUserIds.includes(u.id!);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleAddAssignedUser(u.id!)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                          isAssigned
                            ? "bg-[#eff4ff] border-[#00aee0] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isAssigned ? "bg-[#006685] border-[#006685] text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">{u.role}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {isRTL
                    ? "اختر المستخدمين الذين سيتم إسناد مهام اختبارات هذا المشروع إليهم."
                    : "Select members to assign test execution tasks for this project."}
                </span>
              </div>
            </CardContent>

            <CardFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="text-xs"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="bg-[#006685] hover:bg-[#00526b] text-white text-xs font-bold px-4"
              >
                {isRTL ? "حفظ المشروع" : "Save Project"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── MODAL 2: View Project Details (Design Only) ───────────────── */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-start justify-between bg-linear-to-r from-[#eff4ff] to-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl ${selectedProject.bg} flex items-center justify-center shadow-xs`}
                >
                  <selectedProject.icon className={`w-6 h-6 ${selectedProject.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-[#0b1c30]">
                      {isRTL ? selectedProject.name : selectedProject.nameEn}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedProject.env === "production"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedProject.env}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-600 mt-1">
                    {isRTL ? selectedProject.desc : selectedProject.descEn}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProject(null)}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Detailed Metrics */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    {isRTL ? "إجمالي الحالات" : "Total Tests"}
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {selectedProject.tests}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-bold block">
                    {isRTL ? "حالات ناجحة" : "Passed"}
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {selectedProject.passed}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 font-bold block">
                    {isRTL ? "حالات راسبة" : "Failed"}
                  </span>
                  <span className="text-xl font-black text-rose-700">
                    {selectedProject.failed}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-600 font-bold block">
                    {isRTL ? "حالات معلقة" : "Pending"}
                  </span>
                  <span className="text-xl font-black text-amber-700">
                    {selectedProject.pending}
                  </span>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">
                    {isRTL ? "معدل نجاح الاختبارات العام" : "Overall Quality Index"}
                  </span>
                  <span className="text-[#006685]">%{selectedProject.successRate}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#006685] rounded-full"
                    style={{ width: `${selectedProject.successRate}%` }}
                  />
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {isRTL ? "مسؤول الاختبارات" : "Lead QA Tester"}
                  </span>
                  <span className="font-bold text-slate-800">{selectedProject.leadTester}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {isRTL ? "آخر فحص دوري" : "Last Verification"}
                  </span>
                  <span className="font-bold text-slate-800">{selectedProject.lastUpdated}</span>
                </div>
              </div>

              {/* Assigned Team Members in Details Modal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {isRTL ? "المستخدمين المسند إليهم المشروع (فريق العمل)" : "Assigned Team Members"}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-[#006685] border-[#00aee0]/40">
                    {isRTL ? "مكلفون بمتابعة الاختبارات" : "Assigned Testers"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedProject.assignedUsers || [
                    { name: "م. حسن علي", role: "مدير نظام / Lead QA", email: "h.ali@mcit.gov.eg" },
                    { name: "سارة خليل", role: "مهندس اختبارات (Automation)", email: "s.khalil@mcit.gov.eg" },
                    { name: "عمر الشريف", role: "مختبر أمان (Security QA)", email: "o.elserif@mcit.gov.eg" },
                  ]).map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006685] font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-slate-200">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 truncate">{user.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{user.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <Button
                size="sm"
                onClick={() => setSelectedProject(null)}
                className="bg-[#006685] hover:bg-[#00526b] text-white text-xs font-bold px-5"
              >
                {isRTL ? "إغلاق" : "Close"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── MODAL 3: Edit Project (Design Only) ───────────────────────── */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#0b1c30]">
                  {isRTL ? "تعديل بيانات المشروع" : "Edit Project"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {editingProject.name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingProject(null)}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  {isRTL ? "اسم المشروع" : "Project Name"}
                </Label>
                <Input defaultValue={editingProject.name} className="h-10 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  {isRTL ? "الوصف" : "Description"}
                </Label>
                <Textarea
                  defaultValue={editingProject.desc}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "بيئة التشغيل" : "Environment"}
                  </Label>
                  <Select defaultValue={editingProject.env}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staging">
                        {isRTL ? "اختبار (Staging)" : "Staging"}
                      </SelectItem>
                      <SelectItem value="production">
                        {isRTL ? "إنتاج (Production)" : "Production"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "الحالة" : "Status"}
                  </Label>
                  <Select defaultValue={editingProject.status}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {isRTL ? "نشط (Active)" : "Active"}
                      </SelectItem>
                      <SelectItem value="archived">
                        {isRTL ? "مؤرشف (Archived)" : "Archived"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assign Team Members in Edit Modal */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">
                    {isRTL ? "المستخدمين المسند إليهم المشروع (فريق العمل) *" : "Assigned Team Members *"}
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-[#006685] border-[#00aee0]/40 font-semibold">
                    {isRTL ? `${editAssignedUserIds.length} مستخدمين` : `${editAssignedUserIds.length} assigned`}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-100">
                  {availableTeamMembers.map((u) => {
                    const isAssigned = editAssignedUserIds.includes(u.id!);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleEditAssignedUser(u.id!)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                          isAssigned
                            ? "bg-[#eff4ff] border-[#00aee0] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isAssigned ? "bg-[#006685] border-[#006685] text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">{u.role}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProject(null)}
                className="text-xs"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => setEditingProject(null)}
                className="bg-[#006685] hover:bg-[#00526b] text-white text-xs font-bold px-4"
              >
                {isRTL ? "حفظ التعديلات" : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
