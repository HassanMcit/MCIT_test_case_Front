"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Send,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bug,
  RefreshCw,
  FileText,
  Check,
  User,
  Download,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/language-context";
import type { TestCaseItem } from "../test-cases.interface";
import toast from "react-hot-toast";

interface EmailComposerProps {
  initialTestCase: TestCaseItem | null;
  failedCases: TestCaseItem[];
}

function generateBugTemplate(tc: TestCaseItem, lang: "ar" | "en") {
  const isAr = lang === "ar";
  const priorityLabels: Record<string, string> = {
    critical: isAr ? "حرجة (Critical)" : "Critical",
    high: isAr ? "عالية (High)" : "High",
    medium: isAr ? "متوسطة (Medium)" : "Medium",
    low: isAr ? "منخفضة (Low)" : "Low",
  };

  const stepsList =
    Array.isArray(tc.steps) && tc.steps.length > 0
      ? tc.steps.map((s, i) => `${i + 1}. ${s}`).join("\r\n")
      : isAr
      ? "- لا توجد خطوات مسجلة"
      : "- No steps recorded";

  if (isAr) {
    const lines = [
      `=== تقرير عيب برمجي (Defect Report) ===`,
      ``,
      `• معرّف حالة الاختبار: ${tc.testId}`,
      `• المشروع: ${tc.project?.name || tc.module || "غير محدد"}`,
      `• الوحدة / الصفحة: ${tc.module}${tc.pageName ? ` / ${tc.pageName}` : ""}`,
      `• درجة الأولوية: ${priorityLabels[tc.priority] || tc.priority}`,
      `• الحالة: فشل (Failed)`,
      tc.tester?.name ? `• تم الفحص بواسطة: ${tc.tester.name}` : "",
      tc.executedAt ? `• تاريخ الفحص: ${new Date(tc.executedAt).toLocaleString("ar-EG")}` : "",
      ``,
      `--- سيناريو الاختبار (Scenario) ---`,
      `${tc.scenario}`,
      ``,
      `--- خطوات إعادة الإنتاج (Steps to Reproduce) ---`,
      stepsList,
      ``,
      tc.preConditions ? `--- الشروط المسبقة (Pre-conditions) ---\r\n${tc.preConditions}\r\n` : "",
      `--- النتيجة المتوقعة (Expected Result) ---`,
      `${tc.expectedResult || "-"}`,
      ``,
      `--- النتيجة الفعلية (Actual Result) ---`,
      `${tc.actualResult || "فشل الاختبار، حدث خطأ غير متوقع"}`,
      ``,
      tc.notes ? `--- ملاحظات إضافية (Notes) ---\r\n${tc.notes}\r\n` : "",
      `=== تم إنشاء هذا التقرير عبر نظام إدارة اختبارات الجودة MCIT ===`,
    ].filter(Boolean);
    return lines.join("\r\n");
  } else {
    const lines = [
      `=== Defect Report ===`,
      ``,
      `• Test Case ID: ${tc.testId}`,
      `• Project: ${tc.project?.name || tc.module || "N/A"}`,
      `• Module / Page: ${tc.module}${tc.pageName ? ` / ${tc.pageName}` : ""}`,
      `• Priority: ${priorityLabels[tc.priority] || tc.priority}`,
      `• Status: Failed`,
      tc.tester?.name ? `• Reported By: ${tc.tester.name}` : "",
      tc.executedAt ? `• Date: ${new Date(tc.executedAt).toLocaleString("en-US")}` : "",
      ``,
      `--- Test Scenario ---`,
      `${tc.scenario}`,
      ``,
      `--- Steps to Reproduce ---`,
      stepsList,
      ``,
      tc.preConditions ? `--- Pre-conditions ---\r\n${tc.preConditions}\r\n` : "",
      `--- Expected Result ---`,
      `${tc.expectedResult || "-"}`,
      ``,
      `--- Actual Result ---`,
      `${tc.actualResult || "Test failed with unexpected error"}`,
      ``,
      tc.notes ? `--- Additional Notes ---\r\n${tc.notes}\r\n` : "",
      `=== Generated via MCIT QA Test Management System ===`,
    ].filter(Boolean);
    return lines.join("\r\n");
  }
}

function generateSubject(tc: TestCaseItem, lang: "ar" | "en") {
  const prefix = lang === "ar" ? "[تقرير خلل]" : "[Defect Report]";
  return `${prefix} ${tc.testId}: ${tc.scenario}`;
}

export default function EmailComposer({
  initialTestCase,
  failedCases,
}: EmailComposerProps) {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Selected failed test case
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(
    initialTestCase || failedCases[0] || null
  );

  // Form Fields
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    selectedCase ? generateSubject(selectedCase, lang) : ""
  );
  const [content, setContent] = useState(
    selectedCase ? generateBugTemplate(selectedCase, lang) : ""
  );

  const [copied, setCopied] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // When changing selected test case, regenerate default subject and content
  const handleSelectCase = (caseId: string | null) => {
    if (!caseId) return;
    const found = failedCases.find((c) => String(c.id) === caseId);
    if (found) {
      setSelectedCase(found);
      setSubject(generateSubject(found, lang));
      setContent(generateBugTemplate(found, lang));
      router.replace(`/test-cases/email?id=${found.id}`);
    }
  };

  // Reset to default template
  const handleResetTemplate = () => {
    if (selectedCase) {
      setSubject(generateSubject(selectedCase, lang));
      setContent(generateBugTemplate(selectedCase, lang));
      toast.success(
        isRTL
          ? "تمت استعادة قالب التقرير الافتراضي بنجاح"
          : "Default template restored"
      );
    }
  };

  // Copy to clipboard
  const handleCopyContent = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t("email_copied_toast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isRTL ? "فشل نسخ النص" : "Failed to copy text");
    }
  };

  // Download .eml file (opens in Outlook Classic when double-clicked)
  const handleDownloadEml = () => {
    if (!subject.trim()) {
      toast.error(t("email_error_no_subject"));
      return;
    }

    const emlContent = [
      `To: ${to.trim()}`,
      cc.trim() ? `Cc: ${cc.trim()}` : "",
      `Subject: ${subject.trim()}`,
      `X-Unsent: 1`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      content,
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([emlContent], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedCase?.testId || "Defect"}-Report.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      isRTL
        ? "تم تحميل ملف الرسالة (.eml) - يمكنك فتحه مباشرة في Outlook (classic)"
        : "Downloaded (.eml) message file for Outlook (classic)"
    );
  };

  // Open Windows Settings for Default Apps
  const handleOpenDefaultApps = async () => {
    try {
      await fetch("/api/open-default-apps", { method: "POST" });
      toast.success(
        isRTL
          ? "تم فتح إعدادات التطبيقات الافتراضية في ويندوز"
          : "Opened Windows Default Apps settings"
      );
    } catch {
      toast.error(isRTL ? "تعذر فتح الإعدادات" : "Could not open settings");
    }
  };

  // Launch Outlook Classic via COM / direct desktop handler with mailto fallback
  const handleSendOutlook = async () => {
    if (!to.trim()) {
      toast.error(t("email_error_no_to"));
      return;
    }
    if (!subject.trim()) {
      toast.error(t("email_error_no_subject"));
      return;
    }

    setIsLaunching(true);

    try {
      // 1. First attempt: Direct Outlook (classic) launch via local COM backend
      const res = await fetch("/api/open-outlook-classic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim(),
          subject: subject.trim(),
          content,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data?.success) {
        toast.success(
          isRTL
            ? "تم فتح Outlook (classic) وتجهيز الرسالة بنجاح!"
            : "Outlook (classic) launched and message composed!",
          {
            icon: "📧",
            duration: 4000,
          }
        );
        setIsLaunching(false);
        return;
      }
    } catch (err) {
      console.warn("Direct Outlook COM launch unavailable, falling back to mailto:", err);
    }

    // 2. Fallback: mailto protocol
    const queryParts: string[] = [];
    if (cc.trim()) {
      queryParts.push(`cc=${encodeURIComponent(cc.trim())}`);
    }
    if (subject.trim()) {
      queryParts.push(`subject=${encodeURIComponent(subject.trim())}`);
    }
    if (content.trim()) {
      const bodyFormatted = content.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
      queryParts.push(`body=${encodeURIComponent(bodyFormatted)}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    const mailtoUrl = `mailto:${encodeURIComponent(to.trim())}${queryString}`;

    toast.success(t("email_opening_outlook_toast"), {
      icon: "📧",
      duration: 3500,
    });

    window.location.href = mailtoUrl;
    setIsLaunching(false);
  };

  // Open in MCIT Outlook Web App (OWA)
  const handleOpenMcitOwa = async () => {
    if (!to.trim()) {
      toast.error(t("email_error_no_to"));
      return;
    }

    const params = new URLSearchParams();
    params.set("path", "/mail/action/compose");
    params.set("to", to.trim());
    if (cc.trim()) params.set("cc", cc.trim());
    if (subject.trim()) params.set("subject", subject.trim());
    if (content.trim()) params.set("body", content.trim());

    // Official MCIT Exchange Outlook Web App URL
    const mcitOwaUrl = `https://mail.mcit.gov.eg/owa/?${params.toString()}`;

    // Also copy report content to clipboard for maximum reliability
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore
    }

    window.open(mcitOwaUrl, "_blank", "noopener,noreferrer");

    toast.success(
      isRTL
        ? "جاري فتح بريد الوزارة MCIT OWA (تم نسخ التقرير أيضاً للحافظة)"
        : "Opening MCIT OWA (report copied to clipboard as well)"
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8" dir={dir}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/test-cases"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#006685] hover:text-[#00aee0] transition-colors cursor-pointer"
          >
            <BackArrow className="w-4 h-4" />
            <span>{t("email_back_to_test_cases")}</span>
          </Link>

          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 text-xs px-3 py-1 font-bold flex items-center gap-1.5"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{t("email_failed_only_badge")}</span>
          </Badge>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">
                    {t("email_page_title")}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-[#006685] text-white text-[11px] font-bold">
                    Classic
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#6d797f]">
                  {t("email_page_subtitle")}
                </p>
              </div>
            </div>

            {/* Outlook Classic Badge with Settings Helper */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#eff4ff] border border-[#006685]/20 rounded-xl text-xs font-bold text-[#006685]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Outlook (classic)</span>
              </div>
              <button
                type="button"
                onClick={handleOpenDefaultApps}
                className="text-[11px] text-slate-500 hover:text-[#006685] flex items-center gap-1 transition-colors cursor-pointer"
                title={isRTL ? "فتح إعدادات ويندوز لاختيار التطبيق الافتراضي" : "Open Windows Default Apps"}
              >
                <Settings className="w-3 h-3" />
                <span>{t("email_set_default_win")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* If no failed cases exist */}
        {failedCases.length === 0 && !selectedCase ? (
          <Card className="rounded-2xl border-slate-200 text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0b1c30] mb-2">
              {t("email_no_failed_found")}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {isRTL
                ? "جميع حالات الاختبار الحالية ناجحة أو معلقة، لا توجد أي حالات فاشلة تتطلب إرسال تقرير عيب برمجي."
                : "All current test cases are passing or pending. No failed cases require bug reporting."}
            </p>
            <Link href="/test-cases">
              <Button className="bg-[#00A2D2] hover:bg-[#008eb8] text-white rounded-xl text-xs font-bold px-6 shadow-xs transition-colors">
                {t("email_back_to_test_cases")}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form Inputs (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-[#0b1c30]">
                        {isRTL ? "بيانات البريد الإلكتروني" : "Email Message Details"}
                      </CardTitle>
                      <CardDescription className="text-xs text-[#6d797f] mt-0.5">
                        {isRTL
                          ? "قم بتحديد المستلم ومراجعة التقرير قبل الفتح في Outlook (classic)"
                          : "Specify recipients and review report before launching Outlook (classic)"}
                      </CardDescription>
                    </div>

                    {selectedCase && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetTemplate}
                        className="text-xs text-[#006685] hover:text-[#00aee0] hover:bg-[#eff4ff] rounded-lg gap-1.5 h-8 px-2.5 cursor-pointer"
                        title={isRTL ? "إعادة تعيين القالب" : "Reset Template"}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isRTL ? "إعادة ضبط" : "Reset"}</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Select Failed Test Case (if multiple) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#3d484f] flex items-center justify-between">
                      <span>{t("email_select_failed_case")}</span>
                      {selectedCase && (
                        <span className="font-mono text-[#006685] font-semibold">
                          {selectedCase.testId}
                        </span>
                      )}
                    </Label>
                    <Select
                      value={selectedCase ? String(selectedCase.id) : undefined}
                      onValueChange={handleSelectCase}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs font-medium">
                        <SelectValue placeholder={t("email_select_failed_case")} />
                      </SelectTrigger>
                      <SelectContent>
                        {failedCases.map((tc) => (
                          <SelectItem
                            key={tc.id}
                            value={String(tc.id)}
                            className="text-xs cursor-pointer"
                          >
                            <span className="font-mono font-bold text-[#ba1a1a] mr-2">
                              {tc.testId}
                            </span>
                            <span>{tc.scenario}</span>
                            <span className="text-slate-400 text-[11px] ml-2">
                              ({tc.module})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To (Recipient) */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email-to"
                      className="text-xs font-bold text-[#3d484f] flex items-center gap-1.5"
                    >
                      <span>{t("email_to_label")}</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email-to"
                        type="email"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder={t("email_to_placeholder")}
                        className={`h-11 rounded-xl text-xs border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 ${
                          isRTL ? "pr-10" : "pl-10"
                        }`}
                        required
                      />
                      <span
                        className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${
                          isRTL ? "right-3.5" : "left-3.5"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* CC (Carbon Copy - "css") */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email-cc"
                      className="text-xs font-bold text-[#3d484f] flex items-center gap-1.5"
                    >
                      <span>{t("email_cc_label")}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({isRTL ? "اختياري" : "Optional"})
                      </span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email-cc"
                        type="text"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        placeholder={t("email_cc_placeholder")}
                        className={`h-11 rounded-xl text-xs border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 ${
                          isRTL ? "pr-10" : "pl-10"
                        }`}
                      />
                      <span
                        className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${
                          isRTL ? "right-3.5" : "left-3.5"
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email-subject"
                      className="text-xs font-bold text-[#3d484f] flex items-center gap-1.5"
                    >
                      <span>{t("email_subject_label")}</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t("email_subject_placeholder")}
                      className="h-11 rounded-xl text-xs border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 font-medium"
                      required
                    />
                  </div>

                  {/* Content (Body) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="email-content"
                        className="text-xs font-bold text-[#3d484f] flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#006685]" />
                        <span>{t("email_content_label")}</span>
                      </Label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyContent}
                        className="text-[11px] text-slate-500 hover:text-[#006685] h-7 px-2 gap-1 rounded-lg cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">
                              {isRTL ? "تم النسخ" : "Copied"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isRTL ? "نسخ النص" : "Copy"}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <Textarea
                      id="email-content"
                      rows={14}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("email_content_placeholder")}
                      className="rounded-xl text-xs font-mono leading-relaxed border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 p-4 bg-slate-50/50 resize-y"
                    />
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Primary Button: Send via Outlook (classic) */}
                    <Button
                      type="button"
                      onClick={handleSendOutlook}
                      disabled={isLaunching}
                      className="h-12 flex-1 rounded-xl text-sm font-bold text-white bg-[#00A2D2] hover:bg-[#008eb8] active:scale-[0.99] shadow-[0_4px_14px_0_rgba(0,162,210,0.3)] hover:shadow-[0_6px_20px_rgba(0,162,210,0.4)] transition-all cursor-pointer gap-2 disabled:opacity-75"
                    >
                      {isLaunching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t("email_opening_outlook_toast")}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t("email_send_outlook_btn")}</span>
                        </>
                      )}
                    </Button>

                    {/* Secondary: Download (.eml) */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadEml}
                      className="h-12 rounded-xl text-xs font-semibold border-slate-200 hover:bg-[#eff4ff] text-[#006685] transition-all cursor-pointer gap-1.5 px-4"
                      title={isRTL ? "تحميل ملف رسالة لفتحه مباشرة في Outlook (classic)" : "Download .eml file for Outlook (classic)"}
                    >
                      <Download className="w-4 h-4" />
                      <span>{t("email_download_eml_btn")}</span>
                    </Button>

                    {/* Secondary: Open in MCIT OWA */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenMcitOwa}
                      className="h-12 rounded-xl text-xs font-semibold border-slate-200 hover:bg-[#eff4ff] text-[#006685] transition-all cursor-pointer gap-1.5 px-3.5"
                      title="https://mail.mcit.gov.eg/owa/#path=/mail"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{t("email_open_web_btn")}</span>
                    </Button>

                    {/* Copy Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyContent}
                      className="h-12 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer gap-1.5 px-3.5"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{t("email_copy_content_btn")}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Defect Summary Card (1 col) */}
            <div className="space-y-6">
              {selectedCase ? (
                <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden sticky top-6">
                  <CardHeader className="bg-gradient-to-br from-red-50 to-amber-50/30 border-b border-red-100/60 pb-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs px-2.5 py-0.5 font-bold">
                        {isRTL ? "فشل (Failed)" : "Failed"}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-[#ba1a1a]">
                        {selectedCase.testId}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-[#0b1c30] mt-2 line-clamp-2">
                      {selectedCase.scenario}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {selectedCase.project?.name || selectedCase.module}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Module & Page */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">
                          {isRTL ? "الوحدة:" : "Module:"}
                        </span>
                        <span className="font-bold text-[#0b1c30]">
                          {selectedCase.module}
                        </span>
                      </div>
                      {selectedCase.pageName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">
                            {isRTL ? "الصفحة:" : "Page:"}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {selectedCase.pageName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">
                          {isRTL ? "الأولوية:" : "Priority:"}
                        </span>
                        <span className="font-bold text-amber-700 capitalize">
                          {selectedCase.priority}
                        </span>
                      </div>
                    </div>

                    {/* Expected Result */}
                    <div className="space-y-1">
                      <span className="text-emerald-700 font-bold block text-[11px]">
                        {isRTL ? "النتيجة المتوقعة:" : "Expected Result:"}
                      </span>
                      <p className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900 leading-relaxed text-[11px]">
                        {selectedCase.expectedResult}
                      </p>
                    </div>

                    {/* Actual Result */}
                    <div className="space-y-1">
                      <span className="text-red-700 font-bold block text-[11px]">
                        {isRTL ? "النتيجة الفعلية (الخلل):" : "Actual Result (Defect):"}
                      </span>
                      <p className="p-2.5 rounded-lg bg-red-50/70 border border-red-100 text-red-900 leading-relaxed text-[11px]">
                        {selectedCase.actualResult || (isRTL ? "لم تُسجل تفاصيل الخطأ" : "No details recorded")}
                      </p>
                    </div>

                    {/* Steps count & Tester */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {isRTL ? "عدد الخطوات:" : "Steps:"}{" "}
                        <strong className="text-slate-700">
                          {Array.isArray(selectedCase.steps) ? selectedCase.steps.length : 0}
                        </strong>
                      </span>
                      {selectedCase.tester?.name && (
                        <span>
                          {isRTL ? "المختبر:" : "Tester:"}{" "}
                          <strong className="text-slate-700">{selectedCase.tester.name}</strong>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-200 p-6 text-center text-xs text-slate-500">
                  {isRTL ? "اختر حالة اختبار لعرض تفاصيلها" : "Select a test case to view details"}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
