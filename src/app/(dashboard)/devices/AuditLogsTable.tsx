"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Shield,
  Activity,
  Search,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  User,
  Filter,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FolderGit2,
  KeyRound,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import toast from "react-hot-toast";
import { getAuditLogs, type AuditLogItem } from "./audit-logs.action";

const CATEGORIES = [
  { id: "all", labelAr: "جميع العمليات", labelEn: "All Actions" },
  { id: "TEST_CASES", labelAr: "حالات الاختبار", labelEn: "Test Cases" },
  { id: "PROJECTS", labelAr: "المشاريع", labelEn: "Projects" },
  { id: "USER_MANAGEMENT", labelAr: "إدارة المستخدمين", labelEn: "Users" },
  { id: "AUTH", labelAr: "تسجيل الدخول", labelEn: "Authentication" },
  { id: "SECURITY", labelAr: "الأمان وكلمات المرور", labelEn: "Security" },
  { id: "QUALITY", labelAr: "فحص الجودة", labelEn: "Quality" },
  { id: "PROFILE", labelAr: "الملف الشخصي", labelEn: "Profile" },
];

export default function AuditLogsTable() {
  const { dir, lang } = useLanguage();
  const isRTL = dir === "rtl";

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (targetPage = page, query = search, cat = selectedCategory) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page: targetPage,
        limit: 25,
        search: query,
        category: cat === "all" ? undefined : cat,
      });
      setLogs(res.data);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
      setTotalRecords(res.meta.total);
    } catch {
      toast.error(isRTL ? "فشل تحميل سجل العمليات" : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, search, selectedCategory);
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, search, selectedCategory);
  };

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success(isRTL ? "تم النسخ" : "Copied to clipboard");
  };

  const getActionIcon = (action: string, category: string) => {
    if (category === "AUTH") return <LogIn className="w-4 h-4 text-emerald-600" />;
    if (category === "SECURITY") return <KeyRound className="w-4 h-4 text-amber-600" />;
    if (category === "TEST_CASES") {
      if (action.includes("حذف")) return <Trash2 className="w-4 h-4 text-rose-600" />;
      if (action.includes("تعديل")) return <Edit className="w-4 h-4 text-sky-600" />;
      return <Plus className="w-4 h-4 text-emerald-600" />;
    }
    if (category === "PROJECTS") return <FolderGit2 className="w-4 h-4 text-indigo-600" />;
    if (category === "QUALITY") return <Shield className="w-4 h-4 text-teal-600" />;
    if (action.includes("حذف")) return <Trash2 className="w-4 h-4 text-rose-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "TEST_CASES":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "PROJECTS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "AUTH":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SECURITY":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "USER_MANAGEMENT":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "QUALITY":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Summary Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#0b1c30]">{totalRecords}</div>
            <div className="text-xs text-slate-500 font-medium">
              {isRTL ? "إجمالي العمليات المسجلة" : "Total Recorded Actions"}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {logs.filter((l) => l.status === "success").length}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {isRTL ? "عمليات ناجحة بالصفحة" : "Successful on this page"}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#006685] flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#006685]">
              {new Set(logs.map((l) => l.ip)).size}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {isRTL ? "عناوين IP فريدة بالصفحة" : "Unique IPs on page"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────── */}
      <Card className="border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
              <Search
                className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isRTL ? "right-3" : "left-3"
                }`}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isRTL
                    ? "بحث بالمستخدم، الإجراء، الـ IP، الماك، أو الموقع..."
                    : "Search by user, action, IP, MAC, location..."
                }
                className={`h-10 text-xs sm:text-sm rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:border-indigo-500 ${
                  isRTL ? "pr-9 pl-20" : "pl-9 pr-20"
                }`}
              />
              <Button
                type="submit"
                size="sm"
                className={`absolute top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer ${
                  isRTL ? "left-1.5" : "right-1.5"
                }`}
              >
                {isRTL ? "بحث" : "Search"}
              </Button>
            </form>

            {/* Refresh Button */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page, search, selectedCategory)}
                disabled={loading}
                className="h-10 px-3.5 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                <span>{isRTL ? "تحديث السجل" : "Refresh"}</span>
              </Button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {isRTL ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Table Container ──────────────────────────────────────── */}
      <Card className="border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse" dir={isRTL ? "rtl" : "ltr"}>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-start">{isRTL ? "المستخدم" : "User"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "الإجراء" : "Action"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "تفاصيل العملية" : "Details"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "عنوان الـ IP والموقع" : "IP & Location"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "معرّف الجهاز (MAC)" : "Device MAC"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "الجهاز والمتصفح" : "Device & OS"}</th>
                <th className="py-3 px-4 text-start">{isRTL ? "التوقيت" : "Timestamp"}</th>
                <th className="py-3 px-4 text-center">{isRTL ? "الحالة" : "Status"}</th>
                <th className="py-3 px-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                      <span>{isRTL ? "جاري تحميل سجل تدقيق العمليات..." : "Loading activity audit log..."}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold">{isRTL ? "لا توجد عمليات مسجلة مطابقة" : "No audit records found"}</span>
                      <span className="text-[11px]">{isRTL ? "جرب تغيير معايير البحث أو الفلترة" : "Try adjusting filters or search term"}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === "success";
                  const isMobile = /Android|iPhone|iPad/i.test(log.deviceInfo || log.userAgent);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* User Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
                            {log.userName ? log.userName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0b1c30] text-[13px] group-hover:text-indigo-600 transition-colors">
                              {log.userName || (isRTL ? "مجهول" : "Unknown")}
                            </span>
                            <span className="text-[11px] text-slate-400 dir-ltr text-start">{log.email || "-"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCategoryBadgeClass(
                              log.actionCategory
                            )}`}
                          >
                            {getActionIcon(log.action, log.actionCategory)}
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.method} {log.endpoint ? log.endpoint.split("?")[0] : ""}
                          </span>
                        </div>
                      </td>

                      {/* Description Column */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 leading-relaxed text-[12px]">
                          {log.description || "-"}
                        </p>
                      </td>

                      {/* IP & Location */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-semibold text-slate-800 dir-ltr">
                              {log.ip}
                            </span>
                            <button
                              onClick={(e) => handleCopy(log.ip, e)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              title={isRTL ? "نسخ الـ IP" : "Copy IP"}
                            >
                              {copiedText === log.ip ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3 shrink-0 text-rose-500" />
                            <span className="truncate max-w-[170px]" title={log.location}>
                              {log.location || "Egypt"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MAC Address */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px] bg-slate-50 text-slate-700 border-slate-200 px-2 py-0.5"
                          >
                            {log.macAddress || "02:00:00:00:00:01"}
                          </Badge>
                          {log.macAddress && (
                            <button
                              onClick={(e) => handleCopy(log.macAddress, e)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              title={isRTL ? "نسخ معرّف الجهاز" : "Copy MAC"}
                            >
                              {copiedText === log.macAddress ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          {isMobile ? (
                            <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[160px] text-[11px]" title={log.deviceInfo}>
                            {log.deviceInfo || "Browser"}
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {new Date(log.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 dir-ltr text-start">
                            {new Date(log.createdAt).toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isRTL ? "ناجحة" : "Success"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {isRTL ? "فشلت" : "Failed"}
                          </span>
                        )}
                      </td>

                      {/* Detail View Icon */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ────────────────────────────────────── */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isRTL
              ? `عرض الصفحة ${page} من إجمالي ${totalPages} صفحة (${totalRecords} عملية مسجلة)`
              : `Showing page ${page} of ${totalPages} (${totalRecords} total records)`}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => fetchLogs(page - 1, search, selectedCategory)}
              className="h-8 px-2.5 rounded-xl border-slate-200 text-xs font-semibold gap-1 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{isRTL ? "السابق" : "Prev"}</span>
            </Button>
            <span className="px-3 text-xs font-bold text-slate-700">{page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => fetchLogs(page + 1, search, selectedCategory)}
              className="h-8 px-2.5 rounded-xl border-slate-200 text-xs font-semibold gap-1 cursor-pointer"
            >
              <span>{isRTL ? "التالي" : "Next"}</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Log Details Modal ────────────────────────────────────── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-start animate-in zoom-in-95"
            dir={isRTL ? "rtl" : "ltr"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0b1c30]">
                    {isRTL ? "تفاصيل العملية المسجلة" : "Audit Action Details"}
                  </h3>
                  <span className="text-[11px] text-slate-400">ID #{selectedLog.id}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">{isRTL ? "المستخدم" : "User"}</span>
                <span className="font-bold text-[#0b1c30]">{selectedLog.userName || "-"}</span>
                <span className="text-[11px] text-slate-500 font-mono">{selectedLog.email || "-"}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">{isRTL ? "نوع العملية" : "Action"}</span>
                <span className="font-bold text-[#0b1c30]">{selectedLog.action}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedLog.method} {selectedLog.endpoint}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">{isRTL ? "عنوان الـ IP" : "Client IP"}</span>
                <div className="flex items-center justify-between font-mono font-bold text-[#0b1c30]">
                  <span>{selectedLog.ip}</span>
                  <button onClick={() => handleCopy(selectedLog.ip)} className="text-slate-400 hover:text-indigo-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">{isRTL ? "معرّف الجهاز (MAC)" : "Device MAC"}</span>
                <div className="flex items-center justify-between font-mono font-bold text-[#0b1c30]">
                  <span>{selectedLog.macAddress || "-"}</span>
                  {selectedLog.macAddress && (
                    <button onClick={() => handleCopy(selectedLog.macAddress)} className="text-slate-400 hover:text-indigo-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1 sm:col-span-2">
                <span className="text-slate-400 text-[11px]">{isRTL ? "الموقع الجغرافي والشبكة" : "Location & Network"}</span>
                <span className="font-semibold text-[#0b1c30]">{selectedLog.location || "Egypt"}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1 sm:col-span-2">
                <span className="text-slate-400 text-[11px]">{isRTL ? "معلومات الجهاز والمتصفح" : "Device Summary"}</span>
                <span className="font-semibold text-[#0b1c30]">{selectedLog.deviceInfo || "-"}</span>
                <span className="text-[10px] text-slate-400 font-mono break-all mt-1">{selectedLog.userAgent}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1 sm:col-span-2">
                <span className="text-slate-400 text-[11px]">{isRTL ? "شرح الإجراء" : "Action Description"}</span>
                <span className="font-medium text-[#0b1c30] leading-relaxed">{selectedLog.description || "-"}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setSelectedLog(null)}
                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                {isRTL ? "إغلاق" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
