"use server";

import { pool } from "@/lib/db";
import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { recordSystemAuditLog } from "@/lib/audit";
import { buildOfficialQaXlsxBuffer } from "./xlsxTemplateBuilder";

export interface ExportReportTestCase {
  id: number;
  testId: string;
  module: string;
  pageName: string | null;
  scenario: string;
  preConditions: string | null;
  steps: any;
  expectedResult: string | null;
  actualResult: string | null;
  status: string;
  priority: string | null;
  severity: string | null;
  notes: string | null;
  executedAt: string | null;
  createdAt: string;
  testerName: string;
}

export interface ExportReportData {
  success: boolean;
  message?: string;
  projectName: string;
  projectApp?: string;
  leadTester?: string;
  assignedTo?: string;
  testCases: ExportReportTestCase[];
}

export interface GenerateExcelActionResult {
  success: boolean;
  message?: string;
  base64?: string;
  fileName?: string;
  projectName?: string;
  totalCount?: number;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  bugsCount?: number;
}

function toClientDayKey(dateVal: any, tzOffsetMinutes: number): string | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() - tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function exportProjectExcelAction(params: {
  projectId?: number | null;
  fromDate: string;
  toDate: string;
  tzOffsetMinutes?: number;
}): Promise<GenerateExcelActionResult> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token) {
      return {
        success: false,
        message: "يرجى تسجيل الدخول أولاً",
      };
    }

    const fromDate = (params.fromDate || "").trim();
    const toDate = (params.toDate || "").trim();
    const tzOffsetMinutes =
      typeof params.tzOffsetMinutes === "number" ? params.tzOffsetMinutes : -180;

    if (!fromDate || !toDate) {
      return {
        success: false,
        message: "يرجى تحديد الفترة الزمنية كاملة (من يوم - إلى يوم) لاستخراج التقرير",
      };
    }

    if (fromDate > toDate) {
      return {
        success: false,
        message: "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية",
      };
    }

    const projectId = params.projectId && Number(params.projectId) > 0 ? Number(params.projectId) : null;

    let projectName = "All_Projects";
    let projectApp: string | undefined = undefined;
    let assignedLead = "";

    const conditions: string[] = [];
    const sqlParams: any[] = [];
    let pidx = 1;

    if (projectId) {
      const projRes = await pool.query(
        `SELECT p.id, p.name, p.application,
                (SELECT u.name FROM project_assignments pa JOIN users u ON pa."userId" = u.id WHERE pa."projectId" = p.id ORDER BY pa.id ASC LIMIT 1) as assigned_lead
         FROM projects p
         WHERE p.id = $1`,
        [projectId]
      );
      const proj = projRes.rows[0];
      if (!proj) {
        return {
          success: false,
          message: "المشروع المحدد غير موجود",
        };
      }
      projectName = proj.name;
      projectApp = proj.application || undefined;
      assignedLead = proj.assigned_lead || "";

      conditions.push(`(tc."projectId" = $${pidx} OR tc.module = $${pidx + 1})`);
      sqlParams.push(projectId, proj.name);
      pidx += 2;
    } else if (sessionUser && sessionUser.role !== "admin") {
      // Tester exporting across their assigned projects
      conditions.push(`(
        (tc."projectId" IS NOT NULL AND tc."projectId" IN (SELECT pa."projectId" FROM project_assignments pa WHERE pa."userId" = $${pidx}))
        OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p INNER JOIN project_assignments pa ON p.id = pa."projectId" WHERE pa."userId" = $${pidx + 1}))
        OR tc."testerId" = $${pidx + 2}
      )`);
      sqlParams.push(Number(sessionUser.id), Number(sessionUser.id), Number(sessionUser.id));
      pidx += 3;
    }

    // Coarse SQL date window (±2 days for timezone safety), then exact local day filter below
    conditions.push(`COALESCE(tc."executedAt", tc."createdAt") >= ($${pidx}::date - INTERVAL '2 days')`);
    sqlParams.push(fromDate);
    pidx++;

    conditions.push(`COALESCE(tc."executedAt", tc."createdAt") < ($${pidx}::date + INTERVAL '3 days')`);
    sqlParams.push(toDate);
    pidx++;

    const query = `
      SELECT 
        tc.id,
        tc."testId",
        tc.module,
        tc."pageName",
        tc.scenario,
        tc."preConditions",
        tc.steps,
        tc."expectedResult",
        tc."actualResult",
        tc.status,
        tc.priority,
        tc.severity,
        tc.notes,
        tc."executedAt",
        tc."createdAt",
        COALESCE(u.name, 'Hassan Ali') as tester_name,
        p.name as proj_name,
        p.application as proj_app
      FROM test_cases tc
      LEFT JOIN users u ON tc."testerId" = u.id
      LEFT JOIN projects p ON tc."projectId" = p.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(tc."executedAt", tc."createdAt") ASC, tc.id ASC
    `;

    const rowsRes = await pool.query(query, sqlParams);

    // Exact timezone-accurate day filtering matching UI local dates
    const matchedRows = rowsRes.rows.filter((r: any) => {
      const dayKey = toClientDayKey(r.executedAt || r.createdAt, tzOffsetMinutes);
      if (!dayKey) return false;
      return dayKey >= fromDate && dayKey <= toDate;
    });

    if (matchedRows.length === 0) {
      return {
        success: false,
        message: `لا توجد حالات اختبار مسجلة في الفترة من (${fromDate}) إلى (${toDate})`,
      };
    }

    const reportData: ExportReportData = {
      success: true,
      projectName,
      projectApp,
      leadTester: assignedLead || matchedRows[0]?.tester_name || "Hassan Ali",
      assignedTo: assignedLead || "",
      testCases: matchedRows.map((r: any) => ({
        id: r.id,
        testId: r.testId || `TC_${String(r.id).padStart(3, "0")}`,
        module: r.module || r.proj_app || r.proj_name || projectApp || projectName,
        pageName: r.pageName,
        scenario: r.scenario || "",
        preConditions: r.preConditions,
        steps: r.steps,
        expectedResult: r.expectedResult,
        actualResult: r.actualResult,
        status: r.status || "passed",
        priority: r.priority,
        severity: r.severity,
        notes: r.notes,
        executedAt: r.executedAt ? new Date(r.executedAt).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
        testerName: r.tester_name || "Hassan Ali",
      })),
    };

    const built = buildOfficialQaXlsxBuffer(reportData, tzOffsetMinutes);
    const cleanProj = (projectName || "QA_Report")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .trim();
    const fileName = `QA_Report_${cleanProj}_${fromDate}_to_${toDate}.xlsx`;

    recordSystemAuditLog({
      action: "تصدير تقرير إكسيل للمشروع",
      actionCategory: "PROJECTS",
      description: `تصدير تقرير Excel للمشروع (${projectName}) عن الفترة من ${fromDate} إلى ${toDate} (${built.totalCount} حالة اختبار، ${built.bugsCount} عيب)`,
      endpoint: "/projects/export-excel",
      method: "POST",
    }).catch(() => {});

    return {
      success: true,
      base64: built.buffer.toString("base64"),
      fileName,
      projectName,
      totalCount: built.totalCount,
      passedCount: built.passedCount,
      failedCount: built.failedCount,
      blockedCount: built.blockedCount,
      bugsCount: built.bugsCount,
    };
  } catch (error: any) {
    console.error("Error in exportProjectExcelAction:", error);
    return {
      success: false,
      message: error?.message || "حدث خطأ أثناء إنشاء تقرير الإكسيل",
    };
  }
}
