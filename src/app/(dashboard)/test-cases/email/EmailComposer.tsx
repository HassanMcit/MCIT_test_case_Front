"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Eye,
  Edit3,
  Globe,
  AlertTriangle,
  X,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { getUserData } from "@/components/Navbar/navbar.action";
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

/**
 * Returns formatted bug ID (e.g. TC-0001 -> Bug-0001)
 */
export function getBugDisplayId(tc: TestCaseItem): string {
  if (!tc.testId) return "Bug-0001";
  if (tc.testId.toUpperCase().startsWith("TC-")) {
    return tc.testId.replace(/^TC-/i, "Bug-");
  }
  return tc.testId;
}

/**
 * Resolves localized priority details and emojis
 */
/**
 * Resolves localized priority details and emojis
 */
export function getPriorityInfo(priority?: string) {
  const p = (priority || "high").toLowerCase();
  switch (p) {
    case "critical":
      return {
        key: "critical",
        labelEn: "Critical",
        labelAr: "حرجة",
        adjEn: "critical",
        adjAr: "عالي الخطورة",
        badgeEmoji: "🔴",
      };
    case "high":
      return {
        key: "high",
        labelEn: "High",
        labelAr: "عالية",
        adjEn: "high",
        adjAr: "عالي الأولوية",
        badgeEmoji: "🔴",
      };
    case "medium":
      return {
        key: "medium",
        labelEn: "Medium",
        labelAr: "متوسطة",
        adjEn: "medium",
        adjAr: "متوسط الأولوية",
        badgeEmoji: "🟡",
      };
    case "low":
    default:
      return {
        key: "low",
        labelEn: "Low",
        labelAr: "منخفضة",
        adjEn: "low",
        adjAr: "منخفض الأولوية",
        badgeEmoji: "🟢",
      };
  }
}

/**
 * Resolves localized severity details and emojis
 */
export function getSeverityInfo(severity?: string) {
  const s = (severity || "high").toLowerCase();
  switch (s) {
    case "critical":
      return {
        key: "critical",
        labelEn: "Critical",
        labelAr: "حرجة جداً",
        badgeEmoji: "🔴",
      };
    case "high":
      return {
        key: "high",
        labelEn: "High",
        labelAr: "عالية",
        badgeEmoji: "🔴",
      };
    case "medium":
      return {
        key: "medium",
        labelEn: "Medium",
        labelAr: "متوسطة",
        badgeEmoji: "🟡",
      };
    case "low":
    default:
      return {
        key: "low",
        labelEn: "Low",
        labelAr: "منخفضة",
        badgeEmoji: "🟢",
      };
  }
}

/**
 * Formats report date matching the screenshot format:
 * English: October 12, 2026 - 5:38 PM
 * Arabic:  12 أكتوبر 2026 - 5:38 م
 */
export function formatReportDate(dateStr?: string | null, lang: "ar" | "en" = "en"): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  let hours = validDate.getHours();
  const minutes = validDate.getMinutes().toString().padStart(2, "0");

  if (lang === "ar") {
    const monthsAr = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const month = monthsAr[validDate.getMonth()];
    const day = validDate.getDate();
    const year = validDate.getFullYear();
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year} - ${hours}:${minutes} ${ampm}`;
  } else {
    const monthsEn = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthsEn[validDate.getMonth()];
    const day = validDate.getDate();
    const year = validDate.getFullYear();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} - ${hours}:${minutes} ${ampm}`;
  }
}

/**
 * Generates subject line matching user prompt:
 * [Defect Report] High Priority - Bug-0001: Test Attendance Reports
 */
export function generateSubject(tc: TestCaseItem, lang: "ar" | "en"): string {
  const bugId = getBugDisplayId(tc);
  const pInfo = getPriorityInfo(tc.priority);
  const projectName = tc.project?.name || tc.module || "Test Project";

  if (lang === "ar") {
    return `[تقرير خلل] أولوية ${pInfo.labelAr} - ${bugId}: ${projectName}`;
  } else {
    return `[Defect Report] ${pInfo.labelEn} Priority - ${bugId}: ${projectName}`;
  }
}

/**
 * Generates plain-text body matching exact template:
 * - Test Step: instead of Steps to Reproduce
 * - Includes Severity
 * - Best regards signed by senderName (the user currently logged in and sending)
 */
export function generateBugTextTemplate(
  tc: TestCaseItem,
  lang: "ar" | "en",
  senderName: string = "Tester Name"
): string {
  const isAr = lang === "ar";
  const bugId = getBugDisplayId(tc);
  const pInfo = getPriorityInfo(tc.priority);
  const sInfo = getSeverityInfo(tc.severity || tc.priority);
  const projectName = tc.project?.name || tc.module || (isAr ? "مشروع الاختبار" : "Test Project");
  const modulePage = tc.pageName ? `${tc.module} / ${tc.pageName}` : tc.module;
  const reporterName = tc.tester?.name || "Tester Name";
  const dateFormatted = formatReportDate(tc.executedAt, lang);
  const preConditions = (tc.preConditions || (isAr ? "لا توجد شروط مسبقة" : "None"))
    .replace(/(\r?\n)+/g, " - ")
    .trim();
  const scenario = (tc.scenario || (isAr ? "سيناريو الاختبار" : "Test Scenario"))
    .replace(/(\r?\n)+/g, " - ")
    .trim();
  const expectedResult = (tc.expectedResult || (isAr ? "النتيجة المتوقعة" : "Expected Result"))
    .replace(/(\r?\n)+/g, " - ")
    .trim();
  const actualResult = (tc.actualResult || (isAr ? "فشل الاختبار، حدث خطأ غير متوقع" : "Test failed with unexpected error"))
    .replace(/(\r?\n)+/g, " - ")
    .trim();

  const stepsList =
    Array.isArray(tc.steps) && tc.steps.length > 0
      ? tc.steps.map((s, i) => `${i + 1}.\t${s.trim()}`).join("\n")
      : isAr
      ? "1.\tتنفيذ خطوات السيناريو"
      : "1.\tExecute scenario steps";

  if (isAr) {
    return [
      `فريق العمل المحترم،`,
      ``,
      `يرجى مراجعة الخلل البرمجي ${pInfo.adjAr} التالي والمسجل أثناء تنفيذ الاختبارات الأخيرة لمشروع ${projectName}.`,
      ``,
      `معلومات تتبع الخلل`,
      `•\tمعرّف حالة الاختبار: ${bugId}`,
      `•\tالمشروع: ${projectName}`,
      `•\tالوحدة / الصفحة: ${modulePage}`,
      `•\tدرجة الأولوية: ${pInfo.labelAr} ${pInfo.badgeEmoji}`,
      `•\tدرجة الخطورة: ${sInfo.labelAr} ${sInfo.badgeEmoji}`,
      `•\tالحالة: فشل ❌`,
      `•\tتم الفحص بواسطة: ${reporterName}`,
      `•\tتاريخ الإبلاغ: ${dateFormatted}`,
      ``,
      `تفاصيل الاختبار`,
      `•\tالشروط المسبقة: ${preConditions}`,
      `•\tسيناريو الاختبار: ${scenario}`,
      ``,
      `التنفيذ والنتائج`,
      `Test Step:`,
      stepsList,
      `•\tالنتيجة المتوقعة: ${expectedResult}`,
      `•\tالنتيجة الفعلية: ${actualResult}`,
      ``,
      `إشعار آلي تم إنشاؤه عبر نظام إدارة اختبارات الجودة MCIT.`,
      ``,
      `مع أطيب التحيات،`,
      senderName,
    ].join("\n");
  } else {
    return [
      `Dear Team,`,
      ``,
      `Please review the following ${pInfo.adjEn}-priority defect logged during the recent test execution for the ${projectName} project.`,
      ``,
      `Bug Tracking Information`,
      `•\tTest Case ID: ${bugId}`,
      `•\tProject: ${projectName}`,
      `•\tModule / Page: ${modulePage}`,
      `•\tPriority: ${pInfo.labelEn} ${pInfo.badgeEmoji}`,
      `•\tSeverity: ${sInfo.labelEn} ${sInfo.badgeEmoji}`,
      `•\tStatus: Failed ❌`,
      `•\tReported By: ${reporterName}`,
      `•\tDate Reported: ${dateFormatted}`,
      ``,
      `Testing Details`,
      `•\tPre-conditions: ${preConditions}`,
      `•\tTest Scenario: ${scenario}`,
      ``,
      `Execution & Results`,
      `Test Step:`,
      stepsList,
      `•\tExpected Result: ${expectedResult}`,
      `•\tActual Result: ${actualResult}`,
      ``,
      `Automated dispatch generated via MCIT QA Test Management System.`,
      ``,
      `Best regards,`,
      senderName,
    ].join("\n");
  }
}

/**
 * Generates rich HTML template matching screenshot typography and bold styling
 */
export function generateBugHtmlTemplate(
  tc: TestCaseItem,
  lang: "ar" | "en",
  senderName: string = "Tester Name"
): string {
  const isAr = lang === "ar";
  const bugId = getBugDisplayId(tc);
  const pInfo = getPriorityInfo(tc.priority);
  const sInfo = getSeverityInfo(tc.severity || tc.priority);
  const projectName = tc.project?.name || tc.module || (isAr ? "مشروع الاختبار" : "Test Project");
  const modulePage = tc.pageName ? `${tc.module} / ${tc.pageName}` : tc.module;
  const reporterName = tc.tester?.name || "Tester Name";
  const dateFormatted = formatReportDate(tc.executedAt, lang);
  const preConditions = (tc.preConditions || (isAr ? "لا توجد شروط مسبقة" : "None")).replace(/\r?\n/g, "<br/>");
  const scenario = (tc.scenario || (isAr ? "سيناريو الاختبار" : "Test Scenario")).replace(/\r?\n/g, "<br/>");
  const expectedResult = (tc.expectedResult || (isAr ? "النتيجة المتوقعة" : "Expected Result")).replace(/\r?\n/g, "<br/>");
  const actualResult = (tc.actualResult || (isAr ? "فشل الاختبار، حدث خطأ غير متوقع" : "Test failed with unexpected error")).replace(/\r?\n/g, "<br/>");

  const stepsHtml =
    Array.isArray(tc.steps) && tc.steps.length > 0
      ? tc.steps
          .map(
            (s) =>
              `<li style="margin-bottom: 3px; font-size: 11pt; color: #000000; line-height: 1.6;">${s}</li>`
          )
          .join("")
      : isAr
      ? `<li style="margin-bottom: 3px; font-size: 11pt; color: #000000; line-height: 1.6;">تنفيذ خطوات السيناريو</li>`
      : `<li style="margin-bottom: 3px; font-size: 11pt; color: #000000; line-height: 1.6;">Execute scenario steps</li>`;

  if (isAr) {
    return `<div dir="rtl" style="font-family: 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #000000; text-align: right;">
  <p style="margin: 0 0 10px 0; font-size: 11pt; color: #000000;">فريق العمل المحترم،</p>
  <p style="margin: 0 0 16px 0; font-size: 11pt; color: #000000;">
    يرجى مراجعة الخلل البرمجي ${pInfo.adjAr} التالي والمسجل أثناء تنفيذ الاختبارات الأخيرة لمشروع <b>${projectName}</b>.
  </p>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>معلومات تتبع الخلل</b></p>
  <ul style="margin: 4px 0 16px 0; padding-right: 28px; padding-left: 0; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>معرّف حالة الاختبار:</b> ${bugId}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>المشروع:</b> ${projectName}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>الوحدة / الصفحة:</b> ${modulePage}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>درجة الأولوية:</b> ${pInfo.labelAr} ${pInfo.badgeEmoji}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>درجة الخطورة:</b> ${sInfo.labelAr} ${sInfo.badgeEmoji}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>الحالة:</b> فشل ❌</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>تم الفحص بواسطة:</b> ${reporterName}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>تاريخ الإبلاغ:</b> ${dateFormatted}</li>
  </ul>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>تفاصيل الاختبار</b></p>
  <ul style="margin: 4px 0 16px 0; padding-right: 28px; padding-left: 0; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>الشروط المسبقة:</b> ${preConditions}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>سيناريو الاختبار:</b> ${scenario}</li>
  </ul>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>التنفيذ والنتائج</b></p>
  <p style="margin: 8px 0 4px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Test Step:</b></p>
  <ol style="margin: 4px 0 8px 0; padding-right: 28px; padding-left: 0;">
    ${stepsHtml}
  </ol>
  <ul style="margin: 4px 0 16px 0; padding-right: 28px; padding-left: 0; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>النتيجة المتوقعة:</b> ${expectedResult}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>النتيجة الفعلية:</b> ${actualResult}</li>
  </ul>

  <p style="margin: 18px 0 12px 0; font-size: 11pt; font-style: italic; color: #000000;">
    <i>إشعار آلي تم إنشاؤه عبر <b>نظام إدارة اختبارات الجودة MCIT</b>.</i>
  </p>

  <p style="margin: 12px 0 0 0; font-size: 11pt; color: #000000; line-height: 1.4;">
    مع أطيب التحيات،<br/>
    <b>${senderName}</b>
  </p>
</div>`;
  } else {
    return `<div style="font-family: 'Almarai', 'Segoe UI', Calibri, Aptos, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #000000; text-align: left;">
  <p style="margin: 0 0 10px 0; font-size: 11pt; color: #000000;">Dear Team,</p>
  <p style="margin: 0 0 16px 0; font-size: 11pt; color: #000000;">
    Please review the following ${pInfo.adjEn}-priority defect logged during the recent test execution for the <b>${projectName}</b> project.
  </p>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Bug Tracking Information</b></p>
  <ul style="margin: 4px 0 16px 0; padding-left: 28px; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Test Case ID:</b> ${bugId}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Project:</b> ${projectName}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Module / Page:</b> ${modulePage}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Priority:</b> ${pInfo.labelEn} ${pInfo.badgeEmoji}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Severity:</b> ${sInfo.labelEn} ${sInfo.badgeEmoji}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Status:</b> Failed ❌</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Reported By:</b> ${reporterName}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Date Reported:</b> ${dateFormatted}</li>
  </ul>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Testing Details</b></p>
  <ul style="margin: 4px 0 16px 0; padding-left: 28px; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Pre-conditions:</b> ${preConditions}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Test Scenario:</b> ${scenario}</li>
  </ul>

  <p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Execution & Results</b></p>
  <p style="margin: 8px 0 4px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Test Step:</b></p>
  <ol style="margin: 4px 0 8px 0; padding-left: 28px;">
    ${stepsHtml}
  </ol>
  <ul style="margin: 4px 0 16px 0; padding-left: 28px; list-style-type: disc;">
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Expected Result:</b> ${expectedResult}</li>
    <li style="margin-bottom: 3px; font-size: 11pt; color: #000000;"><b>Actual Result:</b> ${actualResult}</li>
  </ul>

  <p style="margin: 18px 0 12px 0; font-size: 11pt; font-style: italic; color: #000000;">
    <i>Automated dispatch generated via <b>MCIT QA Test Management System</b>.</i>
  </p>

  <p style="margin: 12px 0 0 0; font-size: 11pt; color: #000000; line-height: 1.4;">
    Best regards,<br/>
    <b>${senderName}</b>
  </p>
</div>`;
  }
}

/**
 * Converts user-edited plain text back to structured HTML with bold labels and lists
 */
function plainTextToHtml(text: string, isAr: boolean): string {
  if (text.trim().startsWith("<div") || text.trim().startsWith("<p")) {
    return text;
  }
  const lines = text.split(/\r?\n/);
  const htmlLines: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }
      continue;
    }

    // Bullet lines: starts with • or - or *
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlLines.push(
          isAr
            ? `<ul style="margin: 4px 0 14px 0; padding-right: 28px; padding-left: 0; list-style-type: disc;">`
            : `<ul style="margin: 4px 0 14px 0; padding-left: 28px; list-style-type: disc;">`
        );
        inUl = true;
      }
      const itemContent = trimmed.replace(/^[•\-*]\s*/, "");
      const colonIdx = itemContent.indexOf(":");
      let formattedItem = itemContent;
      if (colonIdx > 0 && colonIdx < 40) {
        const label = itemContent.slice(0, colonIdx);
        const val = itemContent.slice(colonIdx + 1);
        formattedItem = `<b>${label}:</b>${val}`;
      }
      htmlLines.push(`<li style="margin-bottom: 3px; font-size: 11pt; color: #000000;">${formattedItem}</li>`);
      continue;
    }

    // Numbered step: starts with 1. 2. etc.
    const stepMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
    if (stepMatch) {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlLines.push(
          isAr
            ? `<ol style="margin: 4px 0 8px 0; padding-right: 28px; padding-left: 0;">`
            : `<ol style="margin: 4px 0 8px 0; padding-left: 28px;">`
        );
        inOl = true;
      }
      htmlLines.push(`<li style="margin-bottom: 3px; font-size: 11pt; color: #000000;">${stepMatch[2]}</li>`);
      continue;
    }

    // Close any open lists
    if (inUl) {
      htmlLines.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlLines.push("</ol>");
      inOl = false;
    }

    // Section Titles
    if (
      trimmed === "Bug Tracking Information" ||
      trimmed === "Testing Details" ||
      trimmed === "Execution & Results" ||
      trimmed === "معلومات تتبع الخلل" ||
      trimmed === "تفاصيل الاختبار" ||
      trimmed === "التنفيذ والنتائج"
    ) {
      htmlLines.push(`<p style="margin: 16px 0 6px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>${trimmed}</b></p>`);
      continue;
    }

    if (
      trimmed === "Steps to Reproduce:" ||
      trimmed === "خطوات إعادة الإنتاج:" ||
      trimmed === "Test Step:" ||
      trimmed === "Test Step"
    ) {
      htmlLines.push(`<p style="margin: 8px 0 4px 0; font-size: 11pt; font-weight: bold; color: #000000;"><b>Test Step:</b></p>`);
      continue;
    }

    if (
      trimmed.includes("Automated dispatch generated via") ||
      trimmed.includes("إشعار آلي تم إنشاؤه عبر")
    ) {
      htmlLines.push(`<p style="margin: 18px 0 12px 0; font-size: 11pt; font-style: italic; color: #000000;"><i>${trimmed}</i></p>`);
      continue;
    }

    if (trimmed === "Best regards," || trimmed === "مع أطيب التحيات،") {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine) {
        htmlLines.push(`<p style="margin: 12px 0 0 0; font-size: 11pt; color: #000000; line-height: 1.4;">${trimmed}<br/><b>${nextLine}</b></p>`);
        i++;
        continue;
      }
    }

    htmlLines.push(`<p style="margin: 0 0 10px 0; font-size: 11pt; color: #000000;">${trimmed}</p>`);
  }

  if (inUl) htmlLines.push("</ul>");
  if (inOl) htmlLines.push("</ol>");

  const font = isAr
    ? "'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Almarai', 'Segoe UI', Calibri, Aptos, Arial, sans-serif";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  return `<div dir="${dir}" style="font-family: ${font}; font-size: 11pt; line-height: 1.5; color: #000000; text-align: ${align};">\n${htmlLines.join("\n")}\n</div>`;
}

/**
 * Wraps inner HTML into a complete RFC-compliant email document
 * with embedded Google Fonts (Almarai) and Outlook MSO fallbacks
 */
export function wrapFullEmailHtml(innerHtml: string, isAr: boolean): string {
  const lang = isAr ? "ar" : "en";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
    * {
      font-family: 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif !important;
    }
    body, table, td, p, div, span, li, b, strong, i, a {
      font-family: 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif !important;
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, div, span, li, b, strong, i, a {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body dir="${dir}" style="margin: 0; padding: 0; font-family: 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #000000; text-align: ${align}; background-color: #ffffff;">
${innerHtml}
</body>
</html>`;
}

/**
 * Suggested MCIT Team Emails list for defect reports
 */
export const MCIT_TEAM_EMAILS: string[] = [
  "sat-sr@mcit.gov.eg",
  "aaezzat@mcit.gov.eg",
  "asgomaa@mcit.gov.eg",
  "m.rokaya@mcit.gov.eg",
  "mrefaei@mcit.gov.eg",
  "knoreldin@mcit.gov.eg",
  "hemabdelwahed@mcit.gov.eg",
  "aelshapani@mcit.gov.eg",
  "h.ali@mcit.gov.eg",
];

interface EmailRecipientInputProps {
  id: string;
  label: string;
  placeholder?: string;
  optionalLabel?: string;
  required?: boolean;
  icon: React.ReactNode;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  suggestions: string[];
  currentUserEmail?: string;
  isRTL: boolean;
  t: (key: any) => string;
}

/**
 * Multi-recipient email input with chip badges, autocomplete dropdown,
 * and quick-pick suggestion pills excluding the current logged-in user.
 */
function EmailRecipientInput({
  id,
  label,
  placeholder,
  optionalLabel,
  required,
  icon,
  selectedEmails,
  onChange,
  suggestions,
  currentUserEmail,
  isRTL,
  t,
}: EmailRecipientInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out the logged-in user's email completely (case-insensitive)
  const normalizedUserEmail = currentUserEmail?.trim().toLowerCase() || "";
  const filteredSuggestions = suggestions.filter(
    (email) => !normalizedUserEmail || email.trim().toLowerCase() !== normalizedUserEmail
  );

  // Suggestions matching the current search input that are NOT already selected
  const matchingSuggestions = filteredSuggestions.filter((email) => {
    const isAlreadySelected = selectedEmails.some(
      (sel) => sel.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (isAlreadySelected) return false;
    if (!inputValue.trim()) return true;
    return email.toLowerCase().includes(inputValue.trim().toLowerCase());
  });

  // Pills for unselected suggestions
  const unselectedPills = filteredSuggestions.filter(
    (email) => !selectedEmails.some((sel) => sel.trim().toLowerCase() === email.trim().toLowerCase())
  );

  const addEmail = (raw: string) => {
    const email = raw.trim().replace(/[,;]+$/, "");
    if (!email) return;
    const exists = selectedEmails.some((sel) => sel.toLowerCase() === email.toLowerCase());
    if (!exists) {
      onChange([...selectedEmails, email]);
    }
    setInputValue("");
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(selectedEmails.filter((e) => e.toLowerCase() !== emailToRemove.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
      if (inputValue.trim()) {
        e.preventDefault();
        addEmail(inputValue);
        setShowDropdown(false);
      }
    } else if (e.key === "Backspace" && !inputValue && selectedEmails.length > 0) {
      removeEmail(selectedEmails[selectedEmails.length - 1]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData("text");
    if (pasteData && (pasteData.includes(",") || pasteData.includes(";") || pasteData.includes("\n") || pasteData.includes(" "))) {
      e.preventDefault();
      const parts = pasteData
        .split(/[,;\s\n]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const newSelected = [...selectedEmails];
      parts.forEach((part) => {
        if (!newSelected.some((sel) => sel.toLowerCase() === part.toLowerCase())) {
          newSelected.push(part);
        }
      });
      onChange(newSelected);
      setInputValue("");
    }
  };

  // Close dropdown on click outside & commit any typed text
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (inputValue.trim()) {
          addEmail(inputValue);
        }
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, selectedEmails]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label
        htmlFor={id}
        className="text-xs font-bold text-[#3d484f] flex items-center justify-between"
      >
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
          {optionalLabel && (
            <span className="text-[11px] text-slate-400 font-normal">
              ({optionalLabel})
            </span>
          )}
        </span>
        {selectedEmails.length > 0 && (
          <span className="text-[11px] text-[#006685] font-semibold">
            {selectedEmails.length} {isRTL ? "مستلم" : "recipient(s)"}
          </span>
        )}
      </Label>

      {/* Input Box with Chips */}
      <div className="relative">
        <div
          onClick={() => inputRef.current?.focus()}
          className={`min-h-[46px] p-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00A2D2] focus-within:ring-2 focus-within:ring-[#00A2D2]/25 transition-all flex flex-wrap items-center gap-1.5 cursor-text ${
            isRTL ? "pr-9 pl-2" : "pl-9 pr-2"
          }`}
        >
          {/* Static leading icon */}
          <span
            className={`absolute top-3 pointer-events-none text-slate-400 ${
              isRTL ? "right-3" : "left-3"
            }`}
          >
            {icon}
          </span>

          {/* Selected Chips */}
          {selectedEmails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#006685] border border-[#bfe9ff] text-xs font-semibold shadow-2xs group animate-in fade-in zoom-in-95 duration-100"
            >
              <Mail className="w-3 h-3 text-[#00aee0] shrink-0" />
              <span className="font-mono text-[11px]">{email}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#ba1a1a] transition-colors cursor-pointer shrink-0"
                title={isRTL ? "إزالة" : "Remove"}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {/* Inline Text Input */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              selectedEmails.length === 0
                ? placeholder || (isRTL ? "اكتب بريداً أو اختر من المقترحات..." : "Type email or choose from suggestions...")
                : (isRTL ? "أضف بريداً آخر..." : "Add another email...")
            }
            className="flex-1 min-w-[170px] h-8 bg-transparent text-xs text-[#0b1c30] placeholder:text-slate-400 focus:outline-hidden px-1 font-mono"
          />

          {/* Add button if text typed */}
          {inputValue.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addEmail(inputValue);
                setShowDropdown(false);
              }}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#006685] hover:bg-[#00aee0] text-white shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              {isRTL ? "إضافة" : "Add"}
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && (matchingSuggestions.length > 0 || (inputValue.trim() && !matchingSuggestions.includes(inputValue.trim()))) && (
          <div
            className={`absolute top-full mt-1.5 w-full max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
              isRTL ? "right-0 text-right" : "left-0 text-left"
            }`}
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
              <span>{isRTL ? "مقترحات البريد الإلكتروني المتاحة (MCIT):" : "Available MCIT Email Suggestions:"}</span>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                {matchingSuggestions.length}
              </span>
            </div>

            {/* If user typed custom email that isn't already a suggestion */}
            {inputValue.trim() && !filteredSuggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addEmail(inputValue);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs hover:bg-[#eff4ff] hover:text-[#006685] transition-colors cursor-pointer bg-slate-50/50 border-b border-slate-100 text-[#006685]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Plus className="w-3.5 h-3.5 text-[#00aee0] shrink-0" />
                  <span className="font-semibold">
                    {isRTL ? `إضافة البريد: "${inputValue.trim()}"` : `Add custom: "${inputValue.trim()}"`}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#bfe9ff] text-[#006685] font-bold">
                  Enter
                </span>
              </button>
            )}

            {matchingSuggestions.map((sugEmail) => (
              <button
                key={sugEmail}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addEmail(sugEmail);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs hover:bg-[#eff4ff] hover:text-[#006685] transition-colors cursor-pointer text-[#3d484f] group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#e5eeff] text-[#006685] group-hover:bg-[#00aee0] group-hover:text-white flex items-center justify-center text-[10px] font-bold font-mono transition-colors">
                    @
                  </div>
                  <span className="font-mono text-[11px] font-medium">{sugEmail}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#006685] transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Suggestion Pills */}
      {unselectedPills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{isRTL ? "مقترحات سريعة:" : "Quick suggestions:"}</span>
          </span>
          {unselectedPills.map((sugEmail) => (
            <button
              key={sugEmail}
              type="button"
              onClick={() => addEmail(sugEmail)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white hover:bg-[#eff4ff] text-[#3d484f] hover:text-[#006685] border border-slate-200 hover:border-[#00aee0] shadow-2xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={isRTL ? `إضافة ${sugEmail}` : `Add ${sugEmail}`}
            >
              <Plus className="w-3 h-3 text-[#006685]" />
              <span>{sugEmail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmailComposer({
  initialTestCase,
  failedCases,
}: EmailComposerProps) {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { data: session } = useSession();
  const senderName = session?.user?.name || "Tester Name";

  // Current logged in user email to filter out from suggestion list
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(
    () => session?.user?.email || ""
  );

  useEffect(() => {
    if (session?.user?.email) {
      setCurrentUserEmail(session.user.email);
    } else {
      getUserData()
        .then((u) => {
          if (u?.email) setCurrentUserEmail(u.email);
        })
        .catch(() => {});
    }
  }, [session?.user?.email]);

  // Selected failed test case
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(
    initialTestCase || failedCases[0] || null
  );

  // Email language toggle ("en" or "ar")
  const [emailLang, setEmailLang] = useState<"ar" | "en">(lang === "en" ? "en" : "ar");

  // View Mode: "preview" (Rich formatted card) or "edit" (Plain Textarea)
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  // Form Fields - multiple recipient lists
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const to =
    toEmails
      .map((e) => e.trim().replace(/[,;]+$/, ""))
      .filter(Boolean)
      .join("; ") + (toEmails.length > 0 ? "; " : "");
  const cc =
    ccEmails
      .map((e) => e.trim().replace(/[,;]+$/, ""))
      .filter(Boolean)
      .join("; ") + (ccEmails.length > 0 ? "; " : "");
  const [subject, setSubject] = useState(
    selectedCase ? generateSubject(selectedCase, emailLang) : ""
  );
  const [content, setContent] = useState(
    selectedCase ? generateBugTextTemplate(selectedCase, emailLang, senderName) : ""
  );
  const [htmlContent, setHtmlContent] = useState(
    selectedCase ? generateBugHtmlTemplate(selectedCase, emailLang, senderName) : ""
  );

  const [copied, setCopied] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Sync templates if session user loads late and user hasn't edited
  useEffect(() => {
    if (session?.user?.name && selectedCase) {
      setContent(generateBugTextTemplate(selectedCase, emailLang, session.user.name));
      setHtmlContent(generateBugHtmlTemplate(selectedCase, emailLang, session.user.name));
    }
  }, [session?.user?.name]);

  // When changing selected test case, regenerate default subject and content
  const handleSelectCase = (caseId: string | null) => {
    if (!caseId) return;
    const found = failedCases.find((c) => String(c.id) === caseId);
    if (found) {
      setSelectedCase(found);
      setSubject(generateSubject(found, emailLang));
      setContent(generateBugTextTemplate(found, emailLang, senderName));
      setHtmlContent(generateBugHtmlTemplate(found, emailLang, senderName));
      router.replace(`/test-cases/email?id=${found.id}`);
    }
  };

  // Toggle Email Language
  const handleToggleEmailLang = (newLang: "ar" | "en") => {
    setEmailLang(newLang);
    if (selectedCase) {
      setSubject(generateSubject(selectedCase, newLang));
      setContent(generateBugTextTemplate(selectedCase, newLang, senderName));
      setHtmlContent(generateBugHtmlTemplate(selectedCase, newLang, senderName));
    }
  };

  // Handle plain text editing in textarea
  const handleContentChange = (newText: string) => {
    setContent(newText);
    setHtmlContent(plainTextToHtml(newText, emailLang === "ar"));
  };

  // Reset to default template
  const handleResetTemplate = () => {
    if (selectedCase) {
      setSubject(generateSubject(selectedCase, emailLang));
      setContent(generateBugTextTemplate(selectedCase, emailLang, senderName));
      setHtmlContent(generateBugHtmlTemplate(selectedCase, emailLang, senderName));
      toast.success(
        isRTL
          ? "تمت استعادة قالب التقرير الافتراضي بنجاح"
          : "Default template restored"
      );
    }
  };

  // Copy to clipboard (rich HTML + plain text)
  const handleCopyContent = async () => {
    if (!content.trim()) return;
    try {
      const fullHtml = wrapFullEmailHtml(htmlContent, emailLang === "ar");
      if (typeof window !== "undefined" && window.ClipboardItem) {
        const blobHtml = new Blob([fullHtml], { type: "text/html" });
        const blobText = new Blob([content], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ]);
        setCopied(true);
        toast.success(t("email_copied_rich") || t("email_copied_toast"));
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t("email_copied_toast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        toast.success(t("email_copied_toast"));
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(isRTL ? "فشل نسخ النص" : "Failed to copy text");
      }
    }
  };

  // Download .eml file (opens in Outlook Classic when double-clicked with rich HTML)
  const handleDownloadEml = () => {
    if (!subject.trim()) {
      toast.error(t("email_error_no_subject"));
      return;
    }

    const fullHtml = wrapFullEmailHtml(htmlContent, emailLang === "ar");
    const boundary = `----=_Part_${Date.now()}`;
    const emlContent = [
      `To: ${to.trim()}`,
      cc.trim() ? `Cc: ${cc.trim()}` : "",
      `Subject: ${subject.trim()}`,
      `X-Unsent: 1`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      content,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      fullHtml,
      ``,
      `--${boundary}--`,
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([emlContent], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedCase ? getBugDisplayId(selectedCase) : "Defect"}-Report.eml`;
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

    const fullHtml = wrapFullEmailHtml(htmlContent, emailLang === "ar");

    // 1. Auto-copy rich HTML to clipboard so the user always has full Almarai font & bold formatting
    try {
      await handleCopyContent();
    } catch {}

    try {
      // 2. Direct Outlook (classic) launch via local COM backend
      const res = await fetch("/api/open-outlook-classic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim(),
          subject: subject.trim(),
          content,
          htmlContent: fullHtml,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data?.success) {
        toast.success(
          isRTL
            ? "تم فتح Outlook (classic) وتجهيز الرسالة بالخط والخط العريض بنجاح!"
            : "Outlook (classic) launched with formatted HTML message!",
          {
            icon: "📧",
            duration: 4000,
          }
        );
        setIsLaunching(false);
        return;
      }
    } catch (err) {
      console.warn("Direct Outlook COM launch unavailable, falling back to eml & mailto:", err);
    }

    // 3. Fallback: Automatically download the full HTML .eml file
    // Clicking the downloaded .eml opens Outlook immediately in 100% full rich HTML with BOLD & system fonts!
    try {
      handleDownloadEml();
    } catch {}

    // 4. Also trigger mailto protocol with clean single-line spacing (strictly single \n, NO duplicate breaks)
    const queryParts: string[] = [];
    if (cc.trim()) {
      queryParts.push(`cc=${encodeURIComponent(cc.trim())}`);
    }
    if (subject.trim()) {
      queryParts.push(`subject=${encodeURIComponent(subject.trim())}`);
    }
    if (content.trim()) {
      const bodyFormatted = content.replace(/\r\n/g, "\n");
      queryParts.push(`body=${encodeURIComponent(bodyFormatted)}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    const mailtoUrl = `mailto:${encodeURIComponent(to.trim())}${queryString}`;

    toast.success(
      isRTL
        ? "تم تحميل ملف التقرير المنسق (HTML) وفتح Outlook! اضغط على الملف المنسق لفتحه بالـ BOLD وخط النظام 100%."
        : "Downloaded HTML report file (.eml) & opening Outlook! Click the file for 100% bold & system fonts.",
      {
        icon: "📧",
        duration: 6000,
      }
    );

    window.location.href = mailtoUrl;
    setIsLaunching(false);
  };

  // Open in MCIT Outlook Web App (OWA) based on https://mail.mcit.gov.eg/
  const handleOpenMcitOwa = async () => {
    if (!to.trim()) {
      toast.error(t("email_error_no_to"));
      return;
    }

    const cleanTo = to.trim();
    const cleanCc = cc.trim();
    const cleanSubject = subject.trim();
    const cleanBody = content.trim();

    // Base URL: https://mail.mcit.gov.eg/ (Exchange OWA)
    const params = new URLSearchParams();
    params.set("path", "/mail/action/compose");
    params.set("to", cleanTo);
    if (cleanCc) params.set("cc", cleanCc);
    if (cleanSubject) params.set("subject", cleanSubject);
    if (cleanBody) params.set("body", cleanBody);

    const mcitOwaUrl = `https://mail.mcit.gov.eg/owa/?${params.toString()}`;

    // Also copy rich HTML report content to clipboard for 1-click rich paste in OWA
    await handleCopyContent();

    window.open(mcitOwaUrl, "_blank", "noopener,noreferrer");

    toast.success(
      isRTL
        ? "جاري فتح بريد الوزارة (mail.mcit.gov.eg) - تم نسخ التقرير المنسق للحافظة (يمكنك لصقه بـ Ctrl+V)"
        : "Opening MCIT Web Mail (mail.mcit.gov.eg) - Rich report copied to clipboard (press Ctrl+V to paste)",
      {
        icon: "🌐",
        duration: 4500,
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8" dir={dir}>
      <div className="max-w-5xl mx-auto space-y-6">
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
            {/* Left Column: Form Inputs & Rich Body (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {/* Controls: Language selector & Reset */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {/* Language Toggle */}
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleToggleEmailLang("ar")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            emailLang === "ar"
                              ? "bg-[#006685] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>🇪🇬</span>
                          <span>عربي</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEmailLang("en")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            emailLang === "en"
                              ? "bg-[#006685] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>🇺🇸</span>
                          <span>English</span>
                        </button>
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
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Select Failed Test Case (if multiple) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#3d484f] flex items-center justify-between">
                      <span>{t("email_select_failed_case")}</span>
                      {selectedCase && (
                        <span className="font-mono text-[#006685] font-bold">
                          {getBugDisplayId(selectedCase)}
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
                              {getBugDisplayId(tc)}
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

                  {/* To (Recipient) with Multi-select & Suggestions */}
                  <EmailRecipientInput
                    id="email-to"
                    label={t("email_to_label")}
                    placeholder={t("email_to_placeholder")}
                    required
                    icon={<Mail className="w-4 h-4" />}
                    selectedEmails={toEmails}
                    onChange={setToEmails}
                    suggestions={MCIT_TEAM_EMAILS}
                    currentUserEmail={currentUserEmail}
                    isRTL={isRTL}
                    t={t}
                  />

                  {/* CC (Carbon Copy) with Multi-select & Suggestions */}
                  <EmailRecipientInput
                    id="email-cc"
                    label={t("email_cc_label")}
                    placeholder={t("email_cc_placeholder")}
                    optionalLabel={isRTL ? "اختياري" : "Optional"}
                    icon={<Users className="w-4 h-4" />}
                    selectedEmails={ccEmails}
                    onChange={setCcEmails}
                    suggestions={MCIT_TEAM_EMAILS}
                    currentUserEmail={currentUserEmail}
                    isRTL={isRTL}
                    t={t}
                  />

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
                      className="h-11 rounded-xl text-xs border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 font-bold text-[#0b1c30]"
                      required
                    />
                  </div>

                  {/* Content (Body) with Rich Preview / Edit Switcher */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="email-content"
                        className="text-xs font-bold text-[#3d484f] flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#006685]" />
                        <span>{t("email_content_label")}</span>
                      </Label>

                      <div className="flex items-center gap-2">
                        {/* Tab Switcher: Preview vs Edit */}
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setViewMode("preview")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                              viewMode === "preview"
                                ? "bg-white text-[#006685] shadow-2xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t("email_rich_preview") || (isRTL ? "معاينة منسقة" : "Rich Preview")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("edit")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                              viewMode === "edit"
                                ? "bg-white text-[#006685] shadow-2xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t("email_edit_mode") || (isRTL ? "تعديل النص" : "Edit Text")}</span>
                          </button>
                        </div>

                        {/* Copy Button */}
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
                              <span className="text-emerald-600 font-bold">
                                {isRTL ? "تم النسخ" : "Copied"}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{isRTL ? "نسخ المنسق" : "Copy"}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* View: Rich Preview Mode (Matching screenshot 1:1) */}
                    {viewMode === "preview" ? (
                      <div className="relative rounded-xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs overflow-x-auto min-h-[360px]">
                        <div
                          className="prose prose-sm max-w-none text-black select-text"
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                      </div>
                    ) : (
                      /* View: Edit Plain Text Mode */
                      <Textarea
                        id="email-content"
                        rows={16}
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder={t("email_content_placeholder")}
                        className="rounded-xl text-xs font-mono leading-relaxed border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 p-4 bg-slate-50/50 resize-y"
                      />
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>
                        {isRTL
                          ? "تنسيق مخصص لبرنامج Outlook (classic) و OWA"
                          : "Tailored format for Outlook (classic) & OWA"}
                      </span>
                      <span>
                        {viewMode === "preview"
                          ? (isRTL ? "يتم الإرسال بصيغة HTML بالخط والخط العريض" : "Sends rich HTML with bold & lists")
                          : (isRTL ? "يتم تحديث المعاينة المنسقة تلقائياً" : "Rich preview auto-syncs with text edits")}
                      </span>
                    </div>
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
                      title="https://mail.mcit.gov.eg/"
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

                  {/* Guidance Box for Full HTML & BOLD in Outlook */}
                  <div className="mt-4 p-4 rounded-xl bg-[#eff4ff] border border-[#bfe9ff] text-xs text-[#0b1c30] space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#006685]">
                      <Sparkles className="w-4 h-4 text-[#00aee0] shrink-0" />
                      <span>
                        {isRTL
                          ? "للحصول على نفس التنسيق والـ BOLD وخط النظام في Outlook بنسبة 100%:"
                          : "To get 100% exact BOLD formatting and system font in Outlook:"}
                      </span>
                    </div>
                    <ul className={`space-y-1.5 text-[11px] text-[#3d484f] ${isRTL ? "pr-5 list-disc" : "pl-5 list-disc"}`}>
                      <li>
                        <b>{isRTL ? "الطريقة الأسهل والمباشرة (ملف HTML):" : "Direct HTML File (Recommended):"}</b>{" "}
                        {isRTL
                          ? "اضغط «تحميل (.eml)» وافتحه — يفتح برنامج Outlook كمسودة جديدة كاملة التنسيق بالخط العريض (BOLD) وخط النظام وقوائم التنقيط فوراً."
                          : "Click «Download (.eml)» and open it — Outlook opens an instant draft with 100% bold headings, system fonts, and bullet lists."}
                      </li>
                      <li>
                        <b>{isRTL ? "إذا فتحت Outlook عبر الرابط المباشر:" : "If opened via direct Outlook link:"}</b>{" "}
                        {isRTL
                          ? "يفتح ويندوز الرسائل المباشرة كنص عادي. لتحويلها لنفس شكل النظام، حوّل الصيغة إلى HTML من شريط Outlook (Format Text ⬅ HTML) ثم اضغط (Ctrl + V) لأن التنسيق الغني تم نسخه لحافظتك تلقائياً."
                          : "Windows opens direct links in Plain Text mode. To apply formatting, click Format Text -> HTML in Outlook ribbon, then press Ctrl + V."}
                      </li>
                    </ul>
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
                        {getBugDisplayId(selectedCase)}
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
                    {/* Module & Page & Severity */}
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
                      {selectedCase.severity && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">
                            {isRTL ? "درجة الخطورة:" : "Severity:"}
                          </span>
                          <span className="font-bold text-red-600 capitalize">
                            {selectedCase.severity}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">
                          {isRTL ? "الأولوية:" : "Priority:"}
                        </span>
                        <span className="font-bold text-amber-700 capitalize flex items-center gap-1">
                          <span>{selectedCase.priority}</span>
                          <span>{getPriorityInfo(selectedCase.priority).badgeEmoji}</span>
                        </span>
                      </div>
                    </div>

                    {/* Pre-conditions */}
                    {selectedCase.preConditions && (
                      <div className="space-y-1">
                        <span className="text-slate-600 font-bold block text-[11px]">
                          {isRTL ? "الشروط المسبقة:" : "Pre-conditions:"}
                        </span>
                        <p className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200 text-slate-800 leading-relaxed text-[11px]">
                          {selectedCase.preConditions}
                        </p>
                      </div>
                    )}

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
