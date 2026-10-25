"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Bug,
  ListChecks,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/language-context";
import { exportProjectExcelAction } from "@/app/(dashboard)/projects/exportProjectReport.action";
import { toLocalDateKey, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export interface ExportProjectOption {
  id: number;
  name: string;
  application?: string | null;
}

interface ExportReportModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: number | null;
  projectName?: string;
  projectApplication?: string;
  allProjects?: ExportProjectOption[];
  lockProject?: boolean;
  initialFromDate?: string;
  initialToDate?: string;
}

export default function ExportReportModal({
  open,
  onClose,
  projectId = null,
  projectName,
  projectApplication,
  allProjects = [],
  lockProject = false,
  initialFromDate = "",
  initialToDate = "",
}: ExportReportModalProps) {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [selectedPid, setSelectedPid] = useState<string>(
    projectId ? String(projectId) : "all"
  );
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);
  const [validationError, setValidationError] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPid(projectId ? String(projectId) : "all");
      setFromDate(initialFromDate && initialFromDate !== "all" ? initialFromDate : "");
      setToDate(initialToDate && initialToDate !== "all" ? initialToDate : "");
      setValidationError("");
    }
  }, [open, projectId, initialFromDate, initialToDate]);

  if (!open) return null;

  const activeProject =
    selectedPid !== "all"
      ? allProjects.find((p) => String(p.id) === selectedPid) ||
        (projectId && String(projectId) === selectedPid
          ? { id: projectId, name: projectName || "", application: projectApplication }
          : null)
      : null;

  const applyPreset = (preset: "today" | "7d" | "month" | "30d" | "year") => {
    const now = new Date();
    const todayStr = toLocalDateKey(now) || now.toISOString().slice(0, 10);
    setValidationError("");

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "7d") {
      const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setFromDate(toLocalDateKey(d) || d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(toLocalDateKey(d) || d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === "30d") {
      const d = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setFromDate(toLocalDateKey(d) || d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === "year") {
      const d = new Date(now.getFullYear(), 0, 1);
      setFromDate(toLocalDateKey(d) || d.toISOString().slice(0, 10));
      setToDate(todayStr);
    }
  };

  const handleDownload = async () => {
    if (!fromDate.trim() || !toDate.trim()) {
      const msg = isRTL
        ? "يجب تحديد الفترة الزمنية أولاً (من يوم - إلى يوم) لاستخراج التقرير"
        : "Please specify both From Date and To Date before exporting the report";
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    if (fromDate > toDate) {
      const msg = isRTL
        ? "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية"
        : "Start date cannot be after end date";
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    setValidationError("");
    setIsExporting(true);

    try {
      const res = await exportProjectExcelAction({
        projectId: selectedPid !== "all" ? Number(selectedPid) : null,
        fromDate,
        toDate,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });

      if (!res.success || !res.base64) {
        const errMsg =
          res.message ||
          (isRTL
            ? "لا توجد حالات اختبار مسجلة في هذه الفترة"
            : "No test cases found in this period");
        setValidationError(errMsg);
        toast.error(errMsg);
        return;
      }

      // Convert base64 to binary .xlsx Blob and trigger download
      const binStr = window.atob(res.base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName || `QA_Report_${fromDate}_to_${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        isRTL
          ? `تم تنزيل تقرير الإكسيل بنجاح (${res.totalCount} Test Case | ${res.bugsCount} Bug)`
          : `Excel report downloaded (${res.totalCount} Test Cases | ${res.bugsCount} Bugs)`
      );
      onClose();
    } catch (err) {
      console.error("Excel download failed:", err);
      toast.error(
        isRTL ? "حدث خطأ أثناء استخراج ملف الإكسيل" : "Failed to generate Excel report"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <CardHeader className="p-5 sm:p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-linear-to-r from-emerald-50/70 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-[#0b1c30]">
                {isRTL ? "تصدير تقرير الجودة (Excel)" : "Export QA Report (Excel)"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                {activeProject?.name ? (
                  <>
                    <span>{isRTL ? "المشروع:" : "Project:"}</span>
                    <strong className="text-slate-800 font-semibold truncate">
                      {activeProject.name}
                    </strong>
                    {activeProject.application && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {activeProject.application}
                      </span>
                    )}
                  </>
                ) : (
                  <span>
                    {isRTL
                      ? "حدد الفترة الزمنية لاستخراج ملف التقرير المعتمد"
                      : "Specify the date range to generate the official QA workbook"}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isExporting}
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* Optional Project Selector when not locked to a single project */}
          {!lockProject && allProjects.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {isRTL ? "المشروع المستهدف" : "Target Project"}
              </Label>
              <Select
                value={selectedPid}
                onValueChange={(val) => {
                  setSelectedPid(val || "all");
                  setValidationError("");
                }}
                disabled={isExporting}
              >
                <SelectTrigger className="h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl">
                  <SelectValue>
                    {selectedPid === "all"
                      ? isRTL
                        ? "جميع المشاريع المتاحة"
                        : "All Available Projects"
                      : activeProject?.name || ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRTL ? "جميع المشاريع المتاحة" : "All Available Projects"}
                  </SelectItem>
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.application ? `${p.name} (${p.application})` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mandatory Date Range Pickers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#0b1c30]">
                {isRTL
                  ? "تحديد الفترة الزمنية للتقرير (إجباري) *"
                  : "Report Date Period (Required) *"}
              </Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRTL ? "من يوم *" : "From Date *"}</span>
                </Label>
                <Input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setValidationError("");
                  }}
                  disabled={isExporting}
                  className={cn(
                    "h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl",
                    validationError && !fromDate && "border-red-400 bg-red-50/30"
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRTL ? "إلى يوم *" : "To Date *"}</span>
                </Label>
                <Input
                  type="date"
                  required
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setValidationError("");
                  }}
                  disabled={isExporting}
                  className={cn(
                    "h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl",
                    validationError && !toDate && "border-red-400 bg-red-50/30"
                  )}
                />
              </div>
            </div>

            {/* Quick Fill Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium me-1">
                {isRTL ? "اختيار سريع:" : "Quick fill:"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => applyPreset("today")}
                className="h-7 text-[11px] rounded-lg px-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                {isRTL ? "اليوم" : "Today"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => applyPreset("7d")}
                className="h-7 text-[11px] rounded-lg px-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                {isRTL ? "آخر 7 أيام" : "Last 7 Days"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => applyPreset("month")}
                className="h-7 text-[11px] rounded-lg px-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                {isRTL ? "هذا الشهر" : "This Month"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => applyPreset("30d")}
                className="h-7 text-[11px] rounded-lg px-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                {isRTL ? "آخر 30 يوم" : "Last 30 Days"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => applyPreset("year")}
                className="h-7 text-[11px] rounded-lg px-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
              >
                {isRTL ? "العام الحالي" : "This Year"}
              </Button>
            </div>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Workbook Tabs Preview */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
            <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isRTL
                  ? "يحتوي ملف الإكسيل المستخرج على 5 تبويبات (Tabs) منفصلة:"
                  : "Exported Excel (.xlsx) contains 5 separate tabs:"}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-700">
                <ListChecks className="w-3 h-3 text-emerald-600" />
                1. Test Cases
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-red-200 text-red-700">
                <Bug className="w-3 h-3 text-red-600" />
                2. Defect Log (Bugs)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                3. Execution Summary
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-700">
                <BarChart3 className="w-3 h-3 text-sky-600" />
                4. Dashboard + Chart
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                5. Test Environment
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isExporting}
            onClick={handleDownload}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isRTL ? "جاري تجهيز ملف الإكسيل..." : "Generating Excel..."}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isRTL ? "تنزيل تقرير الإكسيل (.xlsx)" : "Download Excel (.xlsx)"}
                </span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
