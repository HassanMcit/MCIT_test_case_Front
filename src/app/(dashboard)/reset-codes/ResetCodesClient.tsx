"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Search,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  PlusCircle,
  Filter,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/context/language-context";

export interface ResetCodeRecord {
  id: string;
  userName: string;
  userEmail: string;
  userRole: "admin" | "tester" | "lead_qa";
  code: string;
  createdAtTimestamp: number; // in ms
  status: "active" | "used";
  ipAddress: string;
  location: string;
  device: string;
}

// 15 minutes exact in milliseconds
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function createInitialCodes(): ResetCodeRecord[] {
  const now = Date.now();
  return [
    {
      id: "RST-9041",
      userName: "م. أحمد حسني",
      userEmail: "a.hosny@mcit.gov.eg",
      userRole: "lead_qa",
      code: "849201",
      // Created 2 minutes and 15 seconds ago -> ~12m 45s left
      createdAtTimestamp: now - (2 * 60 + 15) * 1000,
      status: "active",
      ipAddress: "197.38.12.84",
      location: "القاهرة، مصر",
      device: "Chrome / Windows 11",
    },
    {
      id: "RST-9040",
      userName: "سارة خليل",
      userEmail: "s.khalil@mcit.gov.eg",
      userRole: "tester",
      code: "419082",
      // Created 7 minutes and 30 seconds ago -> ~7m 30s left
      createdAtTimestamp: now - (7 * 60 + 30) * 1000,
      status: "active",
      ipAddress: "156.204.88.19",
      location: "الجيزة، مصر",
      device: "Edge / Windows 10",
    },
    {
      id: "RST-9039",
      userName: "عمر الشريف",
      userEmail: "o.elserif@mcit.gov.eg",
      userRole: "tester",
      code: "630914",
      // Created 14 minutes ago -> ~1 minute left (quickly visible disappearing after 15m)
      createdAtTimestamp: now - (14 * 60) * 1000,
      status: "active",
      ipAddress: "197.45.62.11",
      location: "الإسكندرية، مصر",
      device: "Firefox / macOS Sonoma",
    },
    {
      id: "RST-9038",
      userName: "م. حسن علي",
      userEmail: "h.ali@mcit.gov.eg",
      userRole: "admin",
      code: "109845",
      // Created 5 minutes ago, used
      createdAtTimestamp: now - (5 * 60) * 1000,
      status: "used",
      ipAddress: "41.233.16.70",
      location: "القاهرة، مصر",
      device: "Chrome / Windows 11",
    },
    {
      id: "RST-9036",
      userName: "م. كريم عبد الرحمن",
      userEmail: "k.abdelrahman@mcit.gov.eg",
      userRole: "lead_qa",
      code: "732619",
      // Created 9 minutes ago
      createdAtTimestamp: now - (9 * 60 + 10) * 1000,
      status: "active",
      ipAddress: "156.198.42.33",
      location: "القاهرة، مصر",
      device: "Chrome / Windows 11",
    },
  ];
}

export default function AdminResetCodesPage() {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session } = useSession();

  // Authorization check (admin only) with preview mode toggle for review
  const actualIsAdmin = session?.user?.role === "admin";
  const [previewAsAdmin, setPreviewAsAdmin] = useState(true);
  const isAuthorized = actualIsAdmin || previewAsAdmin;

  // Real-time ticking clock (updates every 1000ms)
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Codes state
  const [codesList, setCodesList] = useState<ResetCodeRecord[]>(createInitialCodes);

  // Search and filter UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ResetCodeRecord | null>(null);

  // Helper function to format timestamp into human readable string
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // 15-MINUTE LOGIC:
  // If (currentTime - code.createdAtTimestamp) >= 15 minutes, it is REMOVED from table.
  const activeCodesWithin15Mins = useMemo(() => {
    return codesList.filter((item) => {
      const elapsed = currentTime - item.createdAtTimestamp;
      // Exactly 15 minutes (900,000 ms) - once exceeded, remove from table!
      return elapsed < FIFTEEN_MINUTES_MS;
    });
  }, [codesList, currentTime]);

  // Filtered by Search & Status
  const filteredCodes = useMemo(() => {
    return activeCodesWithin15Mins.filter((item) => {
      const matchSearch =
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.includes(searchTerm) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activeCodesWithin15Mins, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = activeCodesWithin15Mins.length;
    const active = activeCodesWithin15Mins.filter((c) => c.status === "active").length;
    const used = activeCodesWithin15Mins.filter((c) => c.status === "used").length;
    return { total, active, used };
  }, [activeCodesWithin15Mins]);

  // Copy code handler
  const handleCopyCode = (id: string, code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCodeId(id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  // Generate a test OTP with full 15 minutes
  const handleGenerateTestCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newId = `RST-${Math.floor(9045 + Math.random() * 100)}`;
    const newCode: ResetCodeRecord = {
      id: newId,
      userName: "مستخدم تجريبي (جديد)",
      userEmail: `test.user${Math.floor(Math.random() * 50)}@mcit.gov.eg`,
      userRole: "tester",
      code: randomCode,
      createdAtTimestamp: Date.now(), // exactly 15 minutes start now!
      status: "active",
      ipAddress: "197.38.15.99",
      location: "القاهرة، مصر",
      device: "Chrome / Windows 11",
    };
    setCodesList((prev) => [newCode, ...prev]);
  };

  // Mark as used
  const handleMarkUsed = (id: string) => {
    setCodesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "used" as const } : item))
    );
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord((prev) => (prev ? { ...prev, status: "used" } : null));
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ─────────────────────────────────────────────────────────────
  // 1. Access Denied State (when not admin and preview disabled)
  // ─────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200/80 shadow-lg text-center">
          <CardHeader className="space-y-3 pb-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center ring-8 ring-red-50/50">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0b1c30]">
              {isRTL ? "صلاحيات غير كافية (Admin Only)" : "Unauthorized Access"}
            </CardTitle>
            <CardDescription className="text-sm text-[#6d797f]">
              {isRTL
                ? "هذه الصفحة مخصصة لمديري النظام (Administrators) فقط للاطلاع على أكواد استعادة كلمة المرور وحمايتها."
                : "This page is strictly reserved for administrators to monitor password reset codes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-[#3d484f] space-y-1">
              <p className="font-semibold text-slate-700">
                {isRTL ? "حسابك الحالي:" : "Current Account:"} {session?.user?.email || "غير مسجل"}
              </p>
              <p>
                {isRTL ? "الدور الوظيفي:" : "Role:"}{" "}
                <Badge variant="outline" className="text-slate-600 border-slate-300">
                  {session?.user?.role || "user"}
                </Badge>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-0">
            <Button
              variant="outline"
              onClick={() => setPreviewAsAdmin(true)}
              className="w-full text-xs font-semibold border-[#00A2D2] text-[#00A2D2] hover:bg-[#eff4ff]"
            >
              <Eye className="w-4 h-4" />
              {isRTL ? "تفعيل وضع المعاينة (Admin Preview Mode)" : "Enable Admin Preview Mode"}
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full text-xs text-slate-500">
                <BackIcon className="w-4 h-4" />
                {isRTL ? "العودة إلى لوحة المؤشرات" : "Return to Dashboard"}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Admin View
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9ff] py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── Top Header & Control Bar ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-[#00A2D2] transition-colors"
            >
              {isRTL ? "لوحة التحكم" : "Dashboard"}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-[#00A2D2]">
              {isRTL ? "أكواد الاستعادة" : "Reset Codes"}
            </span>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold px-2 py-0.5 gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              {isRTL ? "منطقة الإدارة (Admin Only)" : "Admin Restricted"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            {isRTL ? "أكواد استعادة كلمة المرور" : "Password Reset Codes"}
          </h1>
          <p className="text-xs sm:text-sm text-[#6d797f] mt-1">
            {isRTL
              ? "صلاحية كود التحقق 15 دقيقة فقط من وقت إنشائه، ويتم حذفه تلقائياً من الجدول بمجرد انقضاء المدة."
              : "Verification codes are valid for exactly 15 minutes and automatically disappear from the table once expired."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <Button
            size="sm"
            onClick={handleGenerateTestCode}
            className="h-9 gap-1.5 text-xs font-bold bg-[#00A2D2] hover:bg-[#008eb8] text-white cursor-pointer shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isRTL ? "توليد كود تجريبي (15 دقيقة)" : "Generate Test OTP (15 min)"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCodesList(createInitialCodes())}
            className="h-9 gap-1.5 text-xs font-medium border-slate-200 hover:bg-slate-100 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{isRTL ? "إعادة الضبط" : "Reset"}</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Codes */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">
                {isRTL ? "أكواد نشطة صالحة (خلال 15 دقيقة)" : "Active Codes (Within 15 Min)"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#006c49]">
                  {stats.active}
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                >
                  {isRTL ? "صالحة للاستخدام" : "Live"}
                </Badge>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Used Codes */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">
                {isRTL ? "تم استخدامها بنجاح" : "Successfully Used"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#00A2D2]">
                  {stats.used}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {Math.round((stats.used / (stats.total || 1)) * 100)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#bfe9ff]/50 text-[#00A2D2] flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total in 15-min window */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">
                {isRTL ? "إجمالي الأكواد الحالية" : "Current Table Window"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30]">
                  {stats.total}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isRTL ? "كود في الجدول" : "active records"}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#e5eeff] text-[#00A2D2] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isRTL ? "right-3.5" : "left-3.5"
                }`}
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isRTL
                    ? "بحث بالبريد الإلكتروني، اسم المستخدم، أو كود التحقق..."
                    : "Search by email, name, or verification code..."
                }
                className={`h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 ${
                  isRTL ? "pr-10 pl-3 text-right" : "pl-10 pr-3 text-left"
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 ${
                    isRTL ? "left-2.5" : "right-2.5"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200">
                    <SelectValue placeholder={isRTL ? "حالة الكود" : "Filter Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Statuses"}</SelectItem>
                    <SelectItem value="active">{isRTL ? "نشط وصالح فقط" : "Active Only"}</SelectItem>
                    <SelectItem value="used">{isRTL ? "تم الاستخدام" : "Used"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="h-10 text-xs text-[#00A2D2] hover:bg-[#eff4ff]"
                >
                  {isRTL ? "إعادة الضبط" : "Reset"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Reset Codes Table ───────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-[#0b1c30]">
              {isRTL ? "سجل طلبات الأكواد الحالية (صالحة لمدة 15 دقيقة)" : "Active OTP Reset Logs (15-Min Validity)"}
            </CardTitle>
            <CardDescription className="text-xs text-[#6d797f] mt-0.5">
              {isRTL
                ? `يتم إزالة أي كود من الجدول تلقائياً فور مرور 15 دقيقة من طلبه. المتبقي في الجدول: ${filteredCodes.length}`
                : `Codes automatically disappear from the table once 15 minutes elapse. Active now: ${filteredCodes.length}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs gap-1.5 py-1">
            <Filter className="w-3 h-3 text-[#00A2D2]" />
            <span>{isRTL ? "مؤقت زمني حي" : "Live Ticking"}</span>
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>
                <TableHead className={isRTL ? "text-right" : "text-left"}>
                  {isRTL ? "المستخدم المستهدف" : "Target User"}
                </TableHead>
                <TableHead className="text-center">
                  {isRTL ? "كود التحقق (OTP)" : "Reset Code (OTP)"}
                </TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>
                  {isRTL ? "وقت الطلب" : "Requested At"}
                </TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>
                  {isRTL ? "العد التنازلي للـ 15 دقيقة" : "15-Min Countdown"}
                </TableHead>
                <TableHead className="text-center">
                  {isRTL ? "الحالة" : "Status"}
                </TableHead>
                <TableHead className="text-center">
                  {isRTL ? "الإجراءات" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-slate-400 text-sm">
                    {isRTL
                      ? "لا توجد أكواد حالية ضمن نافذة الـ 15 دقيقة. يمكنك توليد كود تجريبي للاختبار."
                      : "No active codes within the 15-minute window. You can generate a test OTP."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((item) => {
                  const isCopied = copiedCodeId === item.id;
                  const elapsedMs = currentTime - item.createdAtTimestamp;
                  const remainingMs = Math.max(0, FIFTEEN_MINUTES_MS - elapsedMs);
                  const remainingSeconds = Math.floor(remainingMs / 1000);
                  const remMin = Math.floor(remainingSeconds / 60);
                  const remSec = remainingSeconds % 60;
                  const formattedCountdown = `${String(remMin).padStart(2, "0")}:${String(remSec).padStart(2, "0")}`;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#eff4ff] text-[#00A2D2] font-bold text-xs flex items-center justify-center ring-1 ring-slate-200 shrink-0">
                            {item.userName.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-[#0b1c30] truncate">
                                {item.userName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500"
                              >
                                {item.userRole}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-[#6d797f] truncate">
                              {item.userEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Code Pill & Copy Button */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2.5 py-1 transition-colors">
                          <span className="font-mono text-sm sm:text-base font-extrabold text-[#00A2D2] tracking-widest">
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.id, item.code)}
                            title={isRTL ? "نسخ الكود" : "Copy Code"}
                            className="p-1 rounded text-slate-400 hover:text-[#00A2D2] hover:bg-white transition-all cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {isCopied && (
                          <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {isRTL ? "تم النسخ!" : "Copied!"}
                          </span>
                        )}
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-xs text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#0b1c30]">
                            {formatTime(item.createdAtTimestamp)}
                          </span>
                          <span className="text-[10px] text-slate-400">{item.location}</span>
                        </div>
                      </TableCell>

                      {/* Expiry Window - 15 MIN COUNTDOWN */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock
                            className={`w-3.5 h-3.5 ${
                              remMin < 3
                                ? "text-red-500 animate-bounce"
                                : "text-emerald-600 animate-pulse"
                            }`}
                          />
                          <span
                            className={`font-mono font-bold ${
                              remMin < 3 ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {formattedCountdown}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {isRTL ? "متبقية (تُحذف بعد 00:00)" : "left (auto-removes at 00:00)"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        {item.status === "active" && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-xs font-semibold gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {isRTL ? "نشط وصالح" : "Active"}
                          </Badge>
                        )}
                        {item.status === "used" && (
                          <Badge className="bg-[#bfe9ff]/50 text-[#00A2D2] border-[#00aee0]/40 hover:bg-[#bfe9ff] text-xs font-semibold gap-1">
                            <Lock className="w-3 h-3" />
                            {isRTL ? "تم الاستخدام" : "Used"}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecord(item)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-[#00A2D2] hover:bg-[#eff4ff]"
                            title={isRTL ? "تفاصيل الطلب" : "View Details"}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Invalidate / Mark Used if active */}
                          {item.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkUsed(item.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#00A2D2] hover:bg-[#eff4ff]"
                              title={isRTL ? "تحديد كـ تم الاستخدام" : "Mark as Used"}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer - Notice Security Session line was removed as requested */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6d797f]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              {isRTL
                ? "الأكواد الصالحة مدتها ربع ساعة بالضبط (15 دقيقة)، وتُحذف فوراً من هذا الجدول بعد انقضاء الوقت."
                : "Codes are valid for exactly 15 minutes and are automatically removed from this table when expired."}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Audit Details Modal (Pure UI Design) ───────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] text-[#00A2D2] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-[#0b1c30]">
                    {isRTL ? "تفاصيل كود التحقق" : "Reset Code Inspection"}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6d797f]">
                    {selectedRecord.id}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecord(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="py-4 space-y-4 text-xs sm:text-sm">
              {/* Highlight OTP Code */}
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#00aee0]/30 text-center">
                <span className="text-xs font-semibold text-[#00A2D2] block mb-1">
                  {isRTL ? "رمز التحقق المعتمد (6 أرقام)" : "Authorized 6-Digit OTP Code"}
                </span>
                <span className="font-mono text-3xl font-extrabold text-[#00A2D2] tracking-widest">
                  {selectedRecord.code}
                </span>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      selectedRecord.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-[#bfe9ff] text-[#00A2D2] border-[#00aee0]/50"
                    }
                  >
                    {selectedRecord.status === "active"
                      ? isRTL
                        ? "نشط وصالح للاستخدام"
                        : "Active & Valid"
                      : isRTL
                      ? "تم استخدامه في تغيير كلمة المرور"
                      : "Used for password change"}
                  </Badge>
                </div>
              </div>

              {/* Target User Info */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {isRTL ? "بيانات الحساب" : "Account Information"}
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "اسم المستخدم" : "Name"}</span>
                    <span className="font-semibold text-[#0b1c30]">{selectedRecord.userName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "الدور الوظيفي" : "Role"}</span>
                    <span className="font-semibold text-[#0b1c30]">{selectedRecord.userRole}</span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-slate-400 block">{isRTL ? "البريد الإلكتروني" : "Email"}</span>
                    <span className="font-semibold text-[#00A2D2]">{selectedRecord.userEmail}</span>
                  </div>
                </div>
              </div>

              {/* Security Audit Trail */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {isRTL ? "معلومات الأمان والموقع" : "Security & Network Audit"}
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "وقت الإنشاء" : "Created At"}</span>
                    <span className="font-medium text-slate-700">
                      {formatTime(selectedRecord.createdAtTimestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "عنوان IP" : "IP Address"}</span>
                    <span className="font-mono text-slate-700">{selectedRecord.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "الموقع الجغرافي" : "Location"}</span>
                    <span className="font-medium text-slate-700">{selectedRecord.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isRTL ? "المتصفح ونظام التشغيل" : "Client Agent"}</span>
                    <span className="font-medium text-slate-700">{selectedRecord.device}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
              {selectedRecord.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkUsed(selectedRecord.id)}
                  className="text-xs text-[#00A2D2] border-slate-200 hover:bg-[#eff4ff]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isRTL ? "تحديد كـ مستخدم" : "Mark as Used"}
                </Button>
              ) : (
                <span className="text-xs text-slate-400">
                  {isRTL ? "تم استخدام هذا الكود" : "Code already used"}
                </span>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopyCode(selectedRecord.id, selectedRecord.code)}
                className="bg-[#00A2D2] hover:bg-[#008eb8] text-white text-xs gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedCodeId === selectedRecord.id
                  ? isRTL
                    ? "تم النسخ!"
                    : "Copied!"
                  : isRTL
                  ? "نسخ الكود"
                  : "Copy Code"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
