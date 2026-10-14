"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Plus,
  Trash2,
  Save,
  Clock,
  User,
  ShieldCheck,
  Layers,
  Bug,
  Globe,
  Radio,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  QualityApplication,
  QualityAssessment,
  QualityFunctionResult,
} from "../quality.interface";
import { submitQualityAssessment } from "../quality.action";

interface AppDetailClientProps {
  initialApp: QualityApplication;
  initialAssessments: QualityAssessment[];
}

export default function AppDetailClient({
  initialApp,
  initialAssessments,
}: AppDetailClientProps) {
  const { lang, dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const router = useRouter();
  const { data: session } = useSession();

  const [app, setApp] = useState<QualityApplication>(initialApp);
  const [assessments, setAssessments] = useState<QualityAssessment[]>(initialAssessments);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ── Checklist State ────────────────────────────────────────────────
  // 1. Up & Running
  const [isUpAndRunning, setIsUpAndRunning] = useState<boolean>(true);

  // 2. Functions Checks List
  const [functionChecks, setFunctionChecks] = useState<QualityFunctionResult[]>(() => {
    const defaultList =
      app.defaultFunctions && app.defaultFunctions.length > 0
        ? app.defaultFunctions
        : [
            "تسجيل الدخول والمصادقة",
            "استعراض الشاشة الرئيسية والبيانات",
            "إدخال وتعديل البيانات وحفظها",
            "التصدير وطباعة التقارير",
          ];

    return defaultList.map((name, index) => ({
      id: `fn-${index + 1}`,
      name,
      status: "pass",
      issueDescription: "",
    }));
  });

  const [newFunctionName, setNewFunctionName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Copy URL Helper
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(app.url);
      setCopiedUrl(true);
      toast.success(isRTL ? "تم نسخ الرابط للحافظة" : "URL copied to clipboard");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error(isRTL ? "فشل نسخ الرابط" : "Failed to copy URL");
    }
  };

  // Toggle Function Status
  const handleFunctionStatus = (id: string, status: "pass" | "fail") => {
    setFunctionChecks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              // Keep issueDescription if failing, clear if switching to pass
              issueDescription: status === "pass" ? "" : item.issueDescription || "",
            }
          : item
      )
    );
  };

  // Update Function Issue Description
  const handleIssueDescriptionChange = (id: string, description: string) => {
    setFunctionChecks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, issueDescription: description } : item
      )
    );
  };

  // Add Custom Function
  const handleAddFunction = () => {
    const trimmed = newFunctionName.trim();
    if (!trimmed) {
      toast.error(isRTL ? "يرجى كتابة اسم الوظيفة أو الجزء المراد فحصه" : "Please enter function name");
      return;
    }
    const newId = `fn-custom-${Date.now()}`;
    setFunctionChecks((prev) => [
      ...prev,
      {
        id: newId,
        name: trimmed,
        status: "pass",
        issueDescription: "",
      },
    ]);
    setNewFunctionName("");
    toast.success(isRTL ? "تمت إضافة الوظيفة لقائمة الفحص" : "Function added to checklist");
  };

  // Remove Function
  const handleRemoveFunction = (id: string) => {
    setFunctionChecks((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Real-Time Performance & Stability Calculations ─────────────────
  const calculations = useMemo(() => {
    const passedFunctions = functionChecks.filter((f) => f.status === "pass").length;
    const issuesFunctions = functionChecks.filter((f) => f.status === "fail").length;
    const totalFunctions = functionChecks.length;

    // Total evaluation points: functions + up/down check
    const totalChecks = totalFunctions + 1;
    const totalPassed = passedFunctions + (isUpAndRunning ? 1 : 0);

    // Score calculation
    let score = totalChecks > 0 ? (totalPassed / totalChecks) * 100 : 100;
    // If system is totally down, performance drops significantly
    if (!isUpAndRunning) {
      score = Math.min(score, 40);
    }
    const scoreFormatted = parseFloat(score.toFixed(1));

    // Stability Rating
    let rating = {
      labelAr: "ممتاز ومستقر بأعلى كفاءة",
      labelEn: "Optimal Performance & Stability",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      barColor: "bg-emerald-500",
    };

    if (scoreFormatted < 60 || !isUpAndRunning) {
      rating = {
        labelAr: "حرج - يتطلب تدخلاً فورياً",
        labelEn: "Critical - Immediate Action Required",
        color: "text-red-700 bg-red-50 border-red-200",
        barColor: "bg-red-500",
      };
    } else if (scoreFormatted < 85) {
      rating = {
        labelAr: "متوسط - توجد بعض الأعطال الجزئية",
        labelEn: "Warning - Degraded Functionality",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        barColor: "bg-amber-500",
      };
    }

    return {
      passedFunctions,
      issuesFunctions,
      totalFunctions,
      totalChecks,
      totalPassed,
      score: scoreFormatted,
      rating,
    };
  }, [functionChecks, isUpAndRunning]);

  // Submit Assessment
  const handleSubmitAssessment = async () => {
    // Validate that if there's any failed function, tester provided issue details
    const failedWithoutReason = functionChecks.find(
      (f) => f.status === "fail" && (!f.issueDescription || f.issueDescription.trim() === "")
    );

    if (failedWithoutReason) {
      toast.error(
        isRTL
          ? `يرجى توضيح سبب المشكلة أو الجزء المعطل في وظيفة: "${failedWithoutReason.name}"`
          : `Please describe the issue in: "${failedWithoutReason.name}"`,
        { duration: 4000 }
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await submitQualityAssessment({
        appId: app.id,
        isUpAndRunning,
        functionsResults: functionChecks,
        notes,
      });

      if (res.success) {
        toast.success(
          isRTL
            ? `تم حفظ التقييم بنجاح! نسبة الاستقرار: ${res.performanceScore}% ✅`
            : `Assessment saved successfully! Stability score: ${res.performanceScore}% ✅`,
          { duration: 4500 }
        );

        // Update local app state
        setApp((prev) => ({
          ...prev,
          passRate: res.performanceScore,
          status: res.status,
          bugsCount: res.issuesCount,
          lastCheck: "Just now",
        }));

        // Prepend to assessments history
        const newHist: QualityAssessment = {
          id: Date.now(),
          appId: app.id,
          testerName: session?.user?.name || "QA Tester",
          isUpAndRunning,
          functionsResults: functionChecks,
          passedCount: res.passedCount,
          issuesCount: res.issuesCount,
          performanceScore: res.performanceScore,
          notes,
          createdAt: new Date().toISOString(),
        };
        setAssessments((prev) => [newHist, ...prev]);
        setNotes("");
      }
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل حفظ التقييم" : "Failed to save assessment"));
    } finally {
      setIsSaving(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8" dir={dir}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Breadcrumb & Navigation Bar ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/quality"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#006685] hover:text-[#00aee0] transition-colors cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{isRTL ? "العودة إلى مصفوفة جودة الأنظمة" : "Back to Quality Matrix"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
              {app.environment} {app.version}
            </span>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold border",
                app.status === "Healthy"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : app.status === "Warning"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}
            >
              {app.status}
            </span>
          </div>
        </div>

        {/* ── Application Details Header Card ──────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#00A2D2] uppercase tracking-wider">
                {app.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0b1c30]">
                {app.name}
              </h1>
              {app.nameAr && (
                <p className="text-sm font-semibold text-[#6d797f]">{app.nameAr}</p>
              )}
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex items-center gap-3">
              <div className="text-center p-3 rounded-xl bg-[#f8f9ff] border border-slate-100 min-w-[90px]">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">
                  {isRTL ? "معدل النجاح" : "Pass Rate"}
                </span>
                <span className="text-xl font-black text-[#006685]">{app.passRate}%</span>
              </div>

              <div className="text-center p-3 rounded-xl bg-[#f8f9ff] border border-slate-100 min-w-[90px]">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">
                  {isRTL ? "الأعطال الحالية" : "Defects"}
                </span>
                <span className="text-xl font-black text-red-600">{app.bugsCount}</span>
              </div>
            </div>
          </div>

          {/* URL & Link Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#eff4ff] border border-[#bfe9ff]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Globe className="w-4 h-4 text-[#006685] shrink-0" />
              <span className="text-xs font-mono text-[#0b1c30] truncate select-all">
                {app.url}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#006685] bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isRTL ? "تم النسخ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isRTL ? "نسخ الرابط" : "Copy URL"}</span>
                  </>
                )}
              </button>

              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] transition-colors cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isRTL ? "فتح التطبيق في نافذة جديدة" : "Launch Application"}</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Section 1: Availability Check (Up & Running) ─────────────── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0b1c30]">
                  {isRTL ? "فحص حالة التوفر والتشغيل (Up & Running Check)" : "System Availability Check"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? "هل السيرفر يعمل حالياً وصفحة التطبيق تستجيب بدون انقطاع؟"
                    : "Is the application server active, reachable, and responding?"}
                </p>
              </div>
            </div>

            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border",
                isUpAndRunning
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}
            >
              {isUpAndRunning ? (isRTL ? "متاح وشغال (Up)" : "Up & Running") : isRTL ? "متوقف (Down)" : "Service Down"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsUpAndRunning(true)}
              className={cn(
                "p-4 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between",
                isUpAndRunning
                  ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50 opacity-70"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    isUpAndRunning ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                  )}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#0b1c30] block">
                    {isRTL ? "Pass - شغال ومتاح بالكامل" : "PASS - Up & Running"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isRTL ? "التطبيق يستجيب والخدمة متاحة للمستخدمين" : "Server responds normally with HTTP 200"}
                  </span>
                </div>
              </div>
              {isUpAndRunning && <Check className="w-5 h-5 text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => setIsUpAndRunning(false)}
              className={cn(
                "p-4 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between",
                !isUpAndRunning
                  ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50 opacity-70"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    !isUpAndRunning ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                  )}
                >
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#0b1c30] block">
                    {isRTL ? "Fail - متوقف أو لا يستجيب" : "FAIL - Down / Unreachable"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isRTL ? "توقف كامل للخدمة أو خطأ 500/404 بالخادم" : "Server unreachable, timeout or HTTP 5xx error"}
                  </span>
                </div>
              </div>
              {!isUpAndRunning && <Check className="w-5 h-5 text-red-600" />}
            </button>
          </div>
        </div>

        {/* ── Section 2: Interactive Functions Checklist ───────────────── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0b1c30]">
                  {isRTL ? "فحص الوظائف والميزات (Functions Checklist)" : "Functions & Features Verification"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? "حدد لكل وظيفة Pass أو Fail. عند اختيار Fail يظهر حقل لإدخال تفاصيل العطل."
                    : "Verify each feature: Select Pass or Fail. Entering failure details is required on Fail."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                {calculations.passedFunctions} {isRTL ? "شغال" : "Pass"}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">
                {calculations.issuesFunctions} {isRTL ? "أعطال" : "Issues"}
              </span>
            </div>
          </div>

          {/* Functions Items List */}
          <div className="space-y-3 pt-1">
            {functionChecks.map((item, index) => {
              const isPassed = item.status === "pass";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    isPassed
                      ? "bg-white border-slate-200 hover:border-slate-300"
                      : "bg-red-50/30 border-red-300 ring-1 ring-red-300/40"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-[#0b1c30]">{item.name}</span>
                    </div>

                    {/* Pass / Fail Toggle Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFunctionStatus(item.id, "pass")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          isPassed
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isRTL ? "Pass (شغال)" : "Pass"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFunctionStatus(item.id, "fail")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          !isPassed
                            ? "bg-red-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700"
                        )}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isRTL ? "Fail (فيه مشكلة)" : "Fail"}</span>
                      </button>

                      {/* Remove custom function button */}
                      {item.id.startsWith("fn-custom-") && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFunction(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title={isRTL ? "حذف الوظيفة" : "Remove function"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Required Input When Status is FAIL (Matching User Requirement) ── */}
                  {!isPassed && (
                    <div className="mt-3 pt-3 border-t border-red-200/80 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>
                          {isRTL
                            ? "توضيح الجزء المعطل أو تفاصيل المشكلة (مطلوب) *"
                            : "Describe the specific issue / failing part (Required) *"}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={item.issueDescription || ""}
                        onChange={(e) => handleIssueDescriptionChange(item.id, e.target.value)}
                        placeholder={
                          isRTL
                            ? "اكتب هنا بالتحديد: أنهي جزء مش شغال، أو كود الخطأ، أو الاستجابة غير المتوقعة..."
                            : "Specify: which part is failing, error code, or unexpected behavior..."
                        }
                        className="w-full h-10 px-3.5 rounded-xl bg-white border border-red-300 text-xs text-[#0b1c30] placeholder:text-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Another Function Input Box */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={newFunctionName}
              onChange={(e) => setNewFunctionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFunction();
                }
              }}
              placeholder={isRTL ? "+ إضافة وظيفة أخرى للقائمة للفحص..." : "+ Add another function to check..."}
              className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0b1c30] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00A2D2] focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={handleAddFunction}
              className="h-10 px-4 rounded-xl text-xs font-bold text-[#006685] bg-[#eff4ff] hover:bg-[#dce9ff] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRTL ? "إضافة" : "Add"}</span>
            </button>
          </div>
        </div>

        {/* ── Section 3: Live Real-time Performance & Stability Calculator ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#00A2D2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">
                {isRTL ? "مؤشر الأداء والاستقرار الفوري (Functions Performance & Stability)" : "Performance & Stability Score"}
              </h2>
              <p className="text-xs text-slate-500">
                {isRTL
                  ? "يُحسب تلقائياً وبدقة بناءً على عدد الوظائف الشغالة (Pass) مقابل الأعطال (Issues) وحالة الـ Up & Running."
                  : "Automatically computed based on passed vs. failed functions and overall availability."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Score Ring Display */}
            <div className="bg-[#f8f9ff] p-5 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <span className="text-[11px] font-bold text-[#6d797f] uppercase tracking-wider block">
                {isRTL ? "نسبة الأداء والاستقرار" : "Performance & Stability"}
              </span>

              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black text-[#006685]">
                  {calculations.score}
                </span>
                <span className="text-xl font-bold text-[#6d797f]">%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mt-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", calculations.rating.barColor)}
                  style={{ width: `${calculations.score}%` }}
                />
              </div>

              <span
                className={cn(
                  "inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border",
                  calculations.rating.color
                )}
              >
                {isRTL ? calculations.rating.labelAr : calculations.rating.labelEn}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                    {isRTL ? "شغال تمام (Pass)" : "Passed Checks"}
                  </span>
                  <span className="text-2xl font-black text-emerald-700">
                    {calculations.totalPassed}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-[10px] text-red-800 font-bold block uppercase">
                    {isRTL ? "أعطال (Issues)" : "Issues / Fail"}
                  </span>
                  <span className="text-2xl font-black text-red-700">
                    {calculations.issuesFunctions}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-bold block uppercase">
                    {isRTL ? "إجمالي الفحوصات" : "Total Checks"}
                  </span>
                  <span className="text-2xl font-black text-slate-800">
                    {calculations.totalChecks}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-[#bfe9ff] text-xs text-[#0b1c30] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#006685]">
                  <Sparkles className="w-4 h-4 text-[#00A2D2]" />
                  <span>{isRTL ? "معادلة القياس المعتمدة:" : "Measurement Formula:"}</span>
                </div>
                <p className="text-[11px] text-[#3d484f] leading-relaxed">
                  {isRTL
                    ? `نسبة الاستقرار = (${calculations.totalPassed} نقطة فحص ناجحة ÷ ${calculations.totalChecks} إجمالي النقاط) × 100% = ${calculations.score}%`
                    : `Score = (${calculations.totalPassed} Passed ÷ ${calculations.totalChecks} Total Points) × 100% = ${calculations.score}%`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: Notes & Save Action ───────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] block">
              {isRTL ? "ملاحظات وتوصيات المختبر (اختياري)" : "Tester Recommendations & Notes (Optional)"}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRTL
                  ? "أضف أي ملاحظات بخصوص بيئة الاختبار، سرعة الاستجابة، أو أرقام التذاكر المرتبطة بالخلل..."
                  : "Add any remarks about staging/prod environment, response latency, or defect ticket IDs..."
              }
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-[#0b1c30] focus:border-[#00A2D2] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#6d797f]">
              <User className="w-4 h-4 text-[#00A2D2]" />
              <span>
                {isRTL ? "المختبر المسؤول:" : "Assessor:"}{" "}
                <strong className="text-[#0b1c30]">{session?.user?.name || "Tester"}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitAssessment}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] active:scale-[0.99] shadow-[0_4px_14px_0_rgba(0,162,210,0.3)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.4)] transition-all cursor-pointer disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRTL ? "جاري حفظ التقييم..." : "Saving Assessment..."}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isRTL ? "حفظ تقرير الفحص وتحديث مؤشرات التطبيق" : "Save Assessment & Update App"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Section 5: Past Assessment History ────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006685] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {isRTL ? "سجل التقييمات والفحوصات السابقة" : "Assessment History & Audit Trail"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? "سجل الفحوصات الدورية المنفذة على هذا التطبيق بواسطة فريق الجودة"
                    : "Historical execution logs conducted by QA team"}
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-500 font-bold">
              {assessments.length} {isRTL ? "تقييم مسجل" : "records"}
            </span>
          </div>

          <div className="space-y-3">
            {assessments.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl border border-slate-100 bg-[#f8f9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0b1c30]">{record.testerName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono">
                      {new Date(record.createdAt).toLocaleDateString(
                        isRTL ? "ar-EG" : "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>

                  {record.notes && (
                    <p className="text-slate-600 line-clamp-1 italic">
                      &quot;{record.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold",
                      record.isUpAndRunning
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    )}
                  >
                    {record.isUpAndRunning ? "Up & Running" : "Service Down"}
                  </span>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-white border border-slate-200 text-[#006685]">
                    {record.performanceScore}% {isRTL ? "استقرار" : "Stability"}
                  </span>
                </div>
              </div>
            ))}

            {assessments.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                {isRTL ? "لا توجد فحوصات سابقة بعد. قم بإجراء أول فحص أعلاه." : "No prior assessments. Conduct the first check above."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
