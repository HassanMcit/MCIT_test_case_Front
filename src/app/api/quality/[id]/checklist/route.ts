import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { QualityFunctionResult } from "@/app/(dashboard)/quality/quality.interface";

export async function POST(
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
      isUpAndRunning = true,
      functionsResults = [],
      notes = "",
      testerId = null,
      testerName = "QA Tester",
    } = body;

    const list: QualityFunctionResult[] = Array.isArray(functionsResults) ? functionsResults : [];
    const passedCount = list.filter((f) => f.status === "pass").length;
    const issuesCount = list.filter((f) => f.status === "fail").length;

    // Total evaluation points: functions count + 1 for availability
    const totalChecks = list.length + 1;
    const totalPassedChecks = passedCount + (isUpAndRunning ? 1 : 0);
    const rawScore = totalChecks > 0 ? (totalPassedChecks / totalChecks) * 100 : 100;
    const performanceScore = parseFloat(rawScore.toFixed(1));

    // Determine status
    let status: "Healthy" | "Warning" | "Attention" | "Operational" = "Healthy";
    if (!isUpAndRunning) {
      status = "Attention";
    } else if (performanceScore >= 95) {
      status = "Healthy";
    } else if (performanceScore >= 80) {
      status = "Warning";
    } else {
      status = "Attention";
    }

    // 1. Insert assessment record
    const insertResult = await pool.query(
      `INSERT INTO quality_checklists
        ("appId", "testerId", "testerName", "isUpAndRunning", "functionsResults", "passedCount", "issuesCount", "performanceScore", notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
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

    // 2. Update parent application live stats
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

    return NextResponse.json({
      success: true,
      message: "تم حفظ فحص الجودة وتحديث مؤشرات التطبيق بنجاح",
      assessment: insertResult.rows[0],
      performanceScore,
      status,
    });
  } catch (error: any) {
    console.error("POST /api/quality/[id]/checklist error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to submit checklist" },
      { status: 500 }
    );
  }
}
