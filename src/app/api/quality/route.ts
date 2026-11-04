import { getQualityApplications } from "@/app/(dashboard)/quality/quality.action";
import { privateJson } from "@/lib/private-response";
import { getCurrentUserSession } from "@/app/myUtil";
import { revalidatePath, revalidateTag } from "next/cache";
export const dynamic = "force-dynamic";
import { pool } from "@/lib/db";

export async function GET(req: Request){
      const user = await getCurrentUserSession();
      if (!user) return privateJson({ success: false }, { status: 401 });
      const query = new URL(req.url).searchParams;
      return privateJson({ success: true, ...await getQualityApplications(query.get("category") || undefined, query.get("search") || undefined) });
    }

export async function POST(req: Request) {
  const user = await getCurrentUserSession();
  if (user?.role !== "admin") return privateJson({ success: false }, { status: user ? 403 : 401 });

  try {
    const body = await req.json();
    const { name, nameAr, category, url, environment, version, defaultFunctions } = body;

    if (!name || !url) {
      return privateJson(
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

    revalidateTag("quality-apps", { expire: 0 });
    revalidatePath("/quality");
    return privateJson({
      success: true,
      message: "تم تسجيل التطبيق بنجاح",
      application: insertResult.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/quality error:", error);
    return privateJson(
      { success: false, error: error?.message || "Failed to register application" },
      { status: 500 }
    );
  }
}
