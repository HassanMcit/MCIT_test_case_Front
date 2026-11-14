"use server";
import { appFetch } from "@/lib/app-fetch";
import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { ChangeProfileResponseType, UserDataResponse } from "./changeProfile.interface";
import { revalidatePath, updateTag } from "next/cache";
import { extractSafeDataUrl, resolveAvatarForDisplay } from "@/lib/avatar";
import { pool } from "@/lib/db";

export async function changeProfileImage(
  data: { photoBase64?: string; name?: string } | FormData
): Promise<{
  success: boolean;
  message: string;
  photo?: string;
}> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    const userId = sessionUser?.id ? Number(sessionUser.id) : null;

    if (!token && !userId) {
      return {
        success: false,
        message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً",
      };
    }

    let base64Photo = "";
    if (data && typeof data === "object" && !(data instanceof FormData) && "photoBase64" in data) {
      base64Photo = String(data.photoBase64 || "");
    } else if (data instanceof FormData) {
      const photoFile = data.get("photo") as File | null;
      if (photoFile && typeof photoFile.arrayBuffer === "function") {
        try {
          const buffer = Buffer.from(await photoFile.arrayBuffer());
          const mime = photoFile.type || "image/jpeg";
          base64Photo = `data:${mime};base64,${buffer.toString("base64")}`;
        } catch {}
      }
    }

    const validBase64 = extractSafeDataUrl(base64Photo);
    if (!validBase64) {
      return {
        success: false,
        message: "الصورة غير صالحة أو بصيغة غير مدعومة (يرجى استخدام JPG أو PNG أو WebP)",
      };
    }

    let backendSuccess = false;
    let backendMsg = "";
    let dbUpdatedAtMs = Date.now();

    // 1. Forward to Render backend with bounded timeout so cold starts do not block
    if (token && process.env.NEXT_PUBLIC_BASE_URL) {
      try {
        const dataUrlMatch = validBase64.match(/^data:([^;]+);base64,(.+)$/);
        const fetchBody = new FormData();
        if (dataUrlMatch) {
          const mime = dataUrlMatch[1] === "image/jpg" ? "image/jpeg" : dataUrlMatch[1];
          const bytes = Buffer.from(dataUrlMatch[2], "base64");
          const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
          fetchBody.append("photo", new Blob([bytes], { type: mime }), `avatar.${ext}`);
        } else {
          fetchBody.append("photo", validBase64);
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };

        const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/profile`, {
          method: "PATCH",
          headers,
          body: fetchBody,
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });

        if (response.ok) {
          const resData: Partial<ChangeProfileResponseType> = await response.json().catch(() => ({}));
          backendSuccess = true;
          backendMsg = resData.message || "تم تحديث الصورة الشخصية بنجاح";
        } else if (response.status === 413) {
          return {
            success: false,
            message: "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 2 ميجابايت",
          };
        }
      } catch (backendErr) {
        console.warn("Backend /api/users/profile unreachable or timed out, persisting directly in DB:", backendErr);
      }
    }

    // 2. Always persist the actual base64 image in BOTH photo and profileImage columns.
    // Never overwrite DB photo with /api/users/:id/photo (which triggers default fallback).
    let dbSuccess = false;
    if (userId) {
      try {
        const dbRes = await pool.query(
          'UPDATE users SET photo = $1, "profileImage" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING "updatedAt"',
          [validBase64, userId],
        );
        dbSuccess = true;
        if (dbRes.rows[0]?.updatedAt) {
          const ts = new Date(dbRes.rows[0].updatedAt).getTime();
          if (Number.isFinite(ts) && ts > 0) dbUpdatedAtMs = ts;
        }
      } catch (dbErr) {
        console.error("Direct DB update photo error:", dbErr);
        if (!backendSuccess) {
          return {
            success: false,
            message: "تعذر حفظ الصورة في قاعدة البيانات، يرجى المحاولة لاحقاً",
          };
        }
      }
    } else if (!backendSuccess) {
      return {
        success: false,
        message: "فشل في تحديث الصورة الشخصية",
      };
    }

    updateTag("user-me");
    updateTag("users");
    updateTag("dashboard");
    updateTag("projects");
    revalidatePath("/users");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/assign-projects");

    const avatarUrl = userId ? `/api/avatar/${userId}?v=${dbUpdatedAtMs}` : validBase64;

    return {
      success: true,
      message: backendMsg || "تم تحديث الصورة الشخصية بنجاح",
      photo: avatarUrl,
    };
  } catch (err: any) {
    console.error("changeProfileImage uncaught error:", err);
    return {
      success: false,
      message: err?.message || "حدث خطأ غير متوقع أثناء تحديث الصورة",
    };
  }
}

export async function getUserData(): Promise<UserDataResponse | null> {
  try {
    const sessionUser = await getCurrentUserSession();
    const token = sessionUser?.token || (await getUserToken());
    if (!token && !sessionUser?.id) return null;

    if (sessionUser?.id) {
      try {
        const res = await pool.query(
          'SELECT id, name, email, role, photo, "profileImage", "createdAt", "updatedAt" FROM users WHERE id = $1 LIMIT 1',
          [sessionUser.id],
        );
        const row = res.rows[0];
        if (row) {
          return {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            photo: resolveAvatarForDisplay(
              row.id,
              row.photo,
              row.profileImage,
              row.updatedAt,
              "/avatar.png",
            ),
            createdAt:
              row.createdAt instanceof Date
                ? row.createdAt.toISOString()
                : String(row.createdAt),
          };
        }
      } catch (dbErr) {
        console.warn("Direct DB getUserData failed, falling back to backend:", dbErr);
      }
    }

    if (token && process.env.NEXT_PUBLIC_BASE_URL) {
      const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (response && response.ok) {
        const resData: UserDataResponse & { profileImage?: string; updatedAt?: string } =
          await response.json().catch(() => null);
        if (resData) {
          return {
            ...resData,
            photo: resolveAvatarForDisplay(
              resData.id,
              resData.photo,
              resData.profileImage,
              resData.updatedAt,
              "/avatar.png",
            ),
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("getUserData error:", err);
    return null;
  }
}
