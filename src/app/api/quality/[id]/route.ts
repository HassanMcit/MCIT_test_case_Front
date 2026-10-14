import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { QualityApplication, QualityAssessment } from "@/app/(dashboard)/quality/quality.interface";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ success: false, message: "Invalid App ID" }, { status: 400 });
    }

    const appResult = await pool.query("SELECT * FROM quality_applications WHERE id = $1", [appId]);
    if (appResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    const r = appResult.rows[0];
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

    // Fetch recent assessments
    const checklistResult = await pool.query(
      'SELECT * FROM quality_checklists WHERE "appId" = $1 ORDER BY id DESC LIMIT 10',
      [appId]
    );

    const assessments: QualityAssessment[] = checklistResult.rows.map((c: any) => ({
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

    return NextResponse.json({
      success: true,
      application,
      assessments,
    });
  } catch (error: any) {
    console.error("GET /api/quality/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch app details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ success: false, message: "Invalid App ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      nameAr,
      category,
      url,
      environment,
      version,
      status,
      passRate,
      suitesCount,
      bugsCount,
      defaultFunctions,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let pidx = 1;

    if (name !== undefined) {
      updates.push(`name = $${pidx++}`);
      values.push(name.trim());
    }
    if (nameAr !== undefined) {
      updates.push(`"nameAr" = $${pidx++}`);
      values.push(nameAr.trim());
    }
    if (category !== undefined) {
      updates.push(`category = $${pidx++}`);
      values.push(category);
    }
    if (url !== undefined) {
      updates.push(`url = $${pidx++}`);
      values.push(url.trim());
    }
    if (environment !== undefined) {
      updates.push(`environment = $${pidx++}`);
      values.push(environment);
    }
    if (version !== undefined) {
      updates.push(`version = $${pidx++}`);
      values.push(version);
    }
    if (status !== undefined) {
      updates.push(`status = $${pidx++}`);
      values.push(status);
    }
    if (passRate !== undefined) {
      updates.push(`"passRate" = $${pidx++}`);
      values.push(parseFloat(passRate) || 0);
    }
    if (suitesCount !== undefined) {
      updates.push(`"suitesCount" = $${pidx++}`);
      values.push(parseInt(suitesCount, 10) || 0);
    }
    if (bugsCount !== undefined) {
      updates.push(`"bugsCount" = $${pidx++}`);
      values.push(parseInt(bugsCount, 10) || 0);
    }
    if (defaultFunctions !== undefined) {
      updates.push(`"defaultFunctions" = $${pidx++}`);
      values.push(JSON.stringify(defaultFunctions));
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(appId);

    const updateQuery = `
      UPDATE quality_applications
      SET ${updates.join(", ")}
      WHERE id = $${pidx}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات التطبيق بنجاح",
      application: result.rows[0],
    });
  } catch (error: any) {
    console.error("PATCH /api/quality/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update app" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ success: false, message: "Invalid App ID" }, { status: 400 });
    }

    await pool.query("DELETE FROM quality_applications WHERE id = $1", [appId]);

    return NextResponse.json({
      success: true,
      message: "تم حذف التطبيق بنجاح",
    });
  } catch (error: any) {
    console.error("DELETE /api/quality/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete app" },
      { status: 500 }
    );
  }
}
