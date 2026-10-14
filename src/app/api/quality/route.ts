import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { QualityApplication, QualityMetricsSummary } from "@/app/(dashboard)/quality/quality.interface";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

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

    query += ' ORDER BY id ASC';

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

    // Calculate overall metrics
    const totalApps = applications.length;
    const avgPassRate =
      totalApps > 0
        ? parseFloat(
            (
              applications.reduce((acc, curr) => acc + (curr.passRate || 0), 0) /
              totalApps
            ).toFixed(1)
          )
        : 0;

    const totalSuites = applications.reduce(
      (acc, curr) => acc + (curr.suitesCount || 0),
      0
    );
    const totalDefects = applications.reduce(
      (acc, curr) => acc + (curr.bugsCount || 0),
      0
    );

    const metrics: QualityMetricsSummary = {
      totalApps,
      avgPassRate,
      totalSuites,
      totalDefects,
      criticalDefects: 12,
    };

    return NextResponse.json({
      success: true,
      applications,
      metrics,
    });
  } catch (error: any) {
    console.error("GET /api/quality error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch quality apps" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, nameAr, category, url, environment, version, defaultFunctions } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, message: "اسم التطبيق والرابط مطلوبان" },
        { status: 400 }
      );
    }

    const functionsList = Array.isArray(defaultFunctions) && defaultFunctions.length > 0
      ? defaultFunctions
      : ["تسجيل الدخول", "استعراض البيانات الرئيسية", "إدخال وتعديل البيانات", "التقارير والتصدير"];

    const insertResult = await pool.query(
      `INSERT INTO quality_applications 
        (name, "nameAr", category, url, environment, version, status, "passRate", "suitesCount", "bugsCount", "lastCheck", "defaultFunctions")
       VALUES ($1, $2, $3, $4, $5, $6, 'Healthy', 100.0, 10, 0, 'Just registered', $7)
       RETURNING *`,
      [
        name.trim(),
        nameAr?.trim() || name.trim(),
        category || "Government Services",
        url.trim(),
        environment || "Production",
        version || "v1.0",
        JSON.stringify(functionsList),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "تم تسجيل التطبيق بنجاح",
      application: insertResult.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/quality error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to register application" },
      { status: 500 }
    );
  }
}
