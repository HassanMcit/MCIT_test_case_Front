"use server";

import { pool } from "@/lib/db";
import { getUserToken } from "@/app/myUtil";

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

export async function getProjectTestCasesForExport(
  projectId: number,
  fromDate?: string,
  toDate?: string
): Promise<ExportReportData> {
  try {
    const token = await getUserToken();
    if (!token) {
      return {
        success: false,
        message: "يرجى تسجيل الدخول أولاً",
        projectName: "",
        testCases: [],
      };
    }

    // 1. Fetch project info
    const projRes = await pool.query(
      `SELECT p.id, p.name, p.application,
              (SELECT u.name FROM project_assignments pa JOIN users u ON pa."userId" = u.id WHERE pa."projectId" = p.id LIMIT 1) as assigned_lead
       FROM projects p
       WHERE p.id = $1`,
      [projectId]
    );

    const proj = projRes.rows[0] || {
      id: projectId,
      name: `Project ${projectId}`,
      application: null,
      assigned_lead: "Mostafa Rokaya",
    };

    // 2. Build test cases query
    const conditions: string[] = [
      '(tc."projectId" = $1 OR tc.module = $2)'
    ];
    const params: any[] = [projectId, proj.name];

    let pidx = 3;
    if (fromDate && fromDate.trim()) {
      conditions.push(`COALESCE(tc."executedAt", tc."createdAt") >= $${pidx}::date`);
      params.push(fromDate.trim());
      pidx++;
    }
    if (toDate && toDate.trim()) {
      conditions.push(`COALESCE(tc."executedAt", tc."createdAt") < ($${pidx}::date + INTERVAL '1 day')`);
      params.push(toDate.trim());
      pidx++;
    }

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
        COALESCE(u.name, 'Hassan Ali') as tester_name
      FROM test_cases tc
      LEFT JOIN users u ON tc."testerId" = u.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY tc.id ASC
    `;

    const rowsRes = await pool.query(query, params);

    return {
      success: true,
      projectName: proj.name,
      projectApp: proj.application || undefined,
      leadTester: proj.assigned_lead || "Hassan Ali",
      assignedTo: proj.assigned_lead || "Mostafa Rokaya",
      testCases: rowsRes.rows.map((r: any) => ({
        id: r.id,
        testId: r.testId || `TC_${String(r.id).padStart(3, "0")}`,
        module: r.module || proj.application || proj.name,
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
  } catch (error: any) {
    console.error("Error in getProjectTestCasesForExport:", error);
    return {
      success: false,
      message: error?.message || "فشل جلب بيانات حالات الاختبار للمشروع",
      projectName: "",
      testCases: [],
    };
  }
}
