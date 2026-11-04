import { getQualityAppById } from "@/app/(dashboard)/quality/quality.action";
import { privateJson } from "@/lib/private-response";
import { getCurrentUserSession } from "@/app/myUtil";
import { revalidatePath, revalidateTag } from "next/cache";
export const dynamic = "force-dynamic";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
){
      const user = await getCurrentUserSession();
      if (!user) return privateJson({ success: false }, { status: 401 });
      const id = Number((await params).id);
      if (!Number.isInteger(id) || id <= 0) return privateJson({ success: false }, { status: 400 });
      const data = await getQualityAppById(id);
      return privateJson({ success: !!data.application, ...data }, { status: data.application ? 200 : 404 });
    }

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserSession();
  if (user?.role !== "admin") return privateJson({ success: false }, { status: user ? 403 : 401 });

  try {
    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return privateJson({ success: false, message: "Invalid App ID" }, { status: 400 });
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
      return privateJson({ success: false, message: "No fields to update" }, { status: 400 });
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
      return privateJson({ success: false, message: "App not found" }, { status: 404 });
    }

    revalidateTag("quality-apps", { expire: 0 });
    revalidatePath("/quality");
    return privateJson({
      success: true,
      message: "تم تحديث بيانات التطبيق بنجاح",
      application: result.rows[0],
    });
  } catch (error: any) {
    console.error("PATCH /api/quality/[id] error:", error);
    return privateJson(
      { success: false, error: error?.message || "Failed to update app" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserSession();
  if (user?.role !== "admin") return privateJson({ success: false }, { status: user ? 403 : 401 });

  try {
    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return privateJson({ success: false, message: "Invalid App ID" }, { status: 400 });
    }

    await pool.query("DELETE FROM quality_applications WHERE id = $1", [appId]);

    revalidateTag("quality-apps", { expire: 0 });
    revalidatePath("/quality");
    return privateJson({
      success: true,
      message: "تم حذف التطبيق بنجاح",
    });
  } catch (error: any) {
    console.error("DELETE /api/quality/[id] error:", error);
    return privateJson(
      { success: false, error: error?.message || "Failed to delete app" },
      { status: 500 }
    );
  }
}
