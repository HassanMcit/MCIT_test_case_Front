"use server";

import { revalidatePath, updateTag } from "next/cache";
import { pool } from "@/lib/db";
import { getCurrentUserSession } from "@/app/myUtil";
import type {
  QualityApplication,
  QualityAssessment,
  QualityFunctionResult,
  QualityMetricsSummary,
  QualityPageData,
  CreateQualityAppDto,
} from "./quality.interface";

/**
 * Fetch all Quality Applications and portfolio metrics.
 * Strictly uses cache: "force-cache" with tag "quality-apps".
 */
export async function getQualityApplications(
  category?: string,
  search?: string
): Promise<QualityPageData> {
  const defaultMetrics: QualityMetricsSummary = {
    totalApps: 16,
    avgPassRate: 94.6,
    totalSuites: 3124,
    totalDefects: 145,
    criticalDefects: 12,
  };

  try {
    const qs = new URLSearchParams();
    if (category && category !== "All") qs.set("category", category);
    if (search && search.trim() !== "") qs.set("search", search.trim());

    const host = process.env.INTERNAL_APP_URL || "http://localhost:3000";
    const res = await fetch(`${host}/api/quality?${qs.toString()}`, {
      method: "GET",
      cache: "force-cache",
      next: { tags: ["quality-apps"] },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.applications)) {
        return {
          applications: data.applications,
          metrics: data.metrics || defaultMetrics,
        };
      }
    }
  } catch (err) {
    // Fallback to direct DB query if loopback fetch is not ready
  }

  // Resilient DB fallback directly from Supabase pool
  try {
    let query = "SELECT * FROM quality_applications";
    const conditions: string[] = [];
    const params: any[] = [];

    if (category && category !== "All") {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE("nameAr", '')) LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    const applications: QualityApplication[] = result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      nameAr: r.nameAr || "",
      category: r.category || "Government Services",
      url: r.url || "",
      environment: r.environment || "Production",
      version: r.version || "v1.0",
      status: r.status || "Healthy",
      passRate: parseFloat(r.passRate) || 0,
      suitesCount: parseInt(r.suitesCount, 10) || 0,
      bugsCount: parseInt(r.bugsCount, 10) || 0,
      lastCheck: r.lastCheck || "Recently",
      defaultFunctions: Array.isArray(r.defaultFunctions)
        ? r.defaultFunctions
        : typeof r.defaultFunctions === "string"
        ? JSON.parse(r.defaultFunctions || "[]")
        : [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    const totalApps = applications.length;
    const avgPassRate =
      totalApps > 0
        ? parseFloat(
            (
              applications.reduce((acc, curr) => acc + (curr.passRate || 0), 0) /
              totalApps
            ).toFixed(1)
          )
        : defaultMetrics.avgPassRate;

    const totalSuites = applications.reduce(
      (acc, curr) => acc + (curr.suitesCount || 0),
      0
    );
    const totalDefects = applications.reduce(
      (acc, curr) => acc + (curr.bugsCount || 0),
      0
    );

    return {
      applications,
      metrics: {
        totalApps,
        avgPassRate,
        totalSuites,
        totalDefects,
        criticalDefects: 12,
      },
    };
  } catch (dbErr) {
    console.error("Direct DB fallback error in getQualityApplications:", dbErr);
    return {
      applications: [],
      metrics: defaultMetrics,
    };
  }
}

/**
 * Fetch application details by ID and its assessment history.
 */
export async function getQualityAppById(
  id: number
): Promise<{ application: QualityApplication | null; assessments: QualityAssessment[] }> {
  try {
    const host = process.env.INTERNAL_APP_URL || "http://localhost:3000";
    const res = await fetch(`${host}/api/quality/${id}`, {
      method: "GET",
      cache: "force-cache",
      next: { tags: ["quality-apps", `quality-app-${id}`] },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.application) {
        return {
          application: data.application,
          assessments: data.assessments || [],
        };
      }
    }
  } catch {}

  // Direct DB Fallback
  try {
    const appRes = await pool.query("SELECT * FROM quality_applications WHERE id = $1", [id]);
    if (appRes.rows.length === 0) {
      return { application: null, assessments: [] };
    }
    const r = appRes.rows[0];
    const application: QualityApplication = {
      id: r.id,
      name: r.name,
      nameAr: r.nameAr || "",
      category: r.category || "Government Services",
      url: r.url || "",
      environment: r.environment || "Production",
      version: r.version || "v1.0",
      status: r.status || "Healthy",
      passRate: parseFloat(r.passRate) || 0,
      suitesCount: parseInt(r.suitesCount, 10) || 0,
      bugsCount: parseInt(r.bugsCount, 10) || 0,
      lastCheck: r.lastCheck || "Recently",
      defaultFunctions: Array.isArray(r.defaultFunctions)
        ? r.defaultFunctions
        : typeof r.defaultFunctions === "string"
        ? JSON.parse(r.defaultFunctions || "[]")
        : [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };

    const histRes = await pool.query(
      'SELECT * FROM quality_checklists WHERE "appId" = $1 ORDER BY id DESC LIMIT 10',
      [id]
    );
    const assessments: QualityAssessment[] = histRes.rows.map((c: any) => ({
      id: c.id,
      appId: c.appId,
      testerId: c.testerId,
      testerName: c.testerName || "Tester",
      isUpAndRunning: c.isUpAndRunning,
      functionsResults: Array.isArray(c.functionsResults)
        ? c.functionsResults
        : typeof c.functionsResults === "string"
        ? JSON.parse(c.functionsResults || "[]")
        : [],
      passedCount: parseInt(c.passedCount, 10) || 0,
      issuesCount: parseInt(c.issuesCount, 10) || 0,
      performanceScore: parseFloat(c.performanceScore) || 0,
      notes: c.notes || "",
      createdAt: c.createdAt,
    }));

    return { application, assessments };
  } catch (err) {
    console.error("Direct DB error in getQualityAppById:", err);
    return { application: null, assessments: [] };
  }
}

/**
 * Submit QA Checklist Assessment for an application.
 */
export async function submitQualityAssessment(payload: {
  appId: number;
  isUpAndRunning: boolean;
  functionsResults: QualityFunctionResult[];
  notes?: string;
}) {
  const sessionUser = await getCurrentUserSession();
  const testerName = sessionUser?.name || "QA Tester";
  const testerId = sessionUser?.id ? Number(sessionUser.id) : null;

  const { appId, isUpAndRunning, functionsResults, notes = "" } = payload;
  const list = functionsResults || [];
  const passedCount = list.filter((f) => f.status === "pass").length;
  const issuesCount = list.filter((f) => f.status === "fail").length;

  const totalChecks = list.length + 1;
  const totalPassedChecks = passedCount + (isUpAndRunning ? 1 : 0);
  const rawScore = totalChecks > 0 ? (totalPassedChecks / totalChecks) * 100 : 100;
  const performanceScore = parseFloat(rawScore.toFixed(1));

  let status: "Healthy" | "Warning" | "Attention" = "Healthy";
  if (!isUpAndRunning) {
    status = "Attention";
  } else if (performanceScore >= 95) {
    status = "Healthy";
  } else if (performanceScore >= 80) {
    status = "Warning";
  } else {
    status = "Attention";
  }

  // Insert into quality_checklists
  await pool.query(
    `INSERT INTO quality_checklists
      ("appId", "testerId", "testerName", "isUpAndRunning", "functionsResults", "passedCount", "issuesCount", "performanceScore", notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      appId,
      testerId,
      testerName,
      isUpAndRunning,
      JSON.stringify(list),
      passedCount,
      issuesCount,
      performanceScore,
      notes,
    ]
  );

  // Update application live stats
  await pool.query(
    `UPDATE quality_applications
     SET "passRate" = $1,
         status = $2,
         "bugsCount" = $3,
         "lastCheck" = 'Just now',
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [performanceScore, status, issuesCount, appId]
  );

  // Revalidate caches
  updateTag("quality-apps");
  updateTag(`quality-app-${appId}`);
  revalidatePath("/quality");
  revalidatePath(`/quality/${appId}`);

  return {
    success: true,
    performanceScore,
    status,
    passedCount,
    issuesCount,
    message: "تم حفظ التقييم بنجاح وتحديث مؤشرات التطبيق",
  };
}

/**
 * Register a new Quality Application (Admin only).
 */
export async function registerQualityApplication(dto: CreateQualityAppDto) {
  const sessionUser = await getCurrentUserSession();
  if (sessionUser?.role !== "admin") {
    throw new Error("عفواً، إضافة تطبيق جديد متاحة فقط لمديري النظام (Admin)");
  }

  const { name, nameAr, category, url, environment = "Production", version = "v1.0", defaultFunctions = [] } = dto;
  if (!name.trim() || !url.trim()) {
    throw new Error("اسم التطبيق والرابط مطلوبان");
  }

  const functionsList = defaultFunctions.length > 0
    ? defaultFunctions
    : ["تسجيل الدخول والمصادقة", "لوحة التحكم الرئيسية", "إدخال واستعراض البيانات", "التصدير والتقارير"];

  const res = await pool.query(
    `INSERT INTO quality_applications
      (name, "nameAr", category, url, environment, version, status, "passRate", "suitesCount", "bugsCount", "lastCheck", "defaultFunctions")
     VALUES ($1, $2, $3, $4, $5, $6, 'Healthy', 100.0, 10, 0, 'Just registered', $7)
     RETURNING *`,
    [
      name.trim(),
      nameAr?.trim() || name.trim(),
      category || "Government Services",
      url.trim(),
      environment,
      version,
      JSON.stringify(functionsList),
    ]
  );

  updateTag("quality-apps");
  revalidatePath("/quality");

  return {
    success: true,
    application: res.rows[0],
    message: "تم تسجيل التطبيق بنجاح",
  };
}
