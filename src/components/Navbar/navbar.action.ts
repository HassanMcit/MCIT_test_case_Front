"use server";
import { appFetch } from "@/lib/app-fetch";
import { getUserToken, getCurrentUserSession } from "@/app/myUtil";
import { ChangeProfileResponseType, UserDataResponse } from "./changeProfile.interface";
import { updateTag } from "next/cache";
import { pool } from "@/lib/db";

export async function changeProfileImage(data: FormData): Promise<{
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

    const photoFile = data.get("photo") as File | null;
    let base64Photo = "";
    if (photoFile && typeof photoFile.arrayBuffer === "function") {
      try {
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        const mime = photoFile.type || "image/jpeg";
        base64Photo = `data:${mime};base64,${buffer.toString("base64")}`;
      } catch {}
    }

    let savedPhoto = base64Photo;
    let backendSuccess = false;
    let backendMsg = "";

    // 1. Forward to Render backend
    if (token) {
      try {
        const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users/profile`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
          cache: "no-store",
        });

        if (response.ok) {
          const resData: Partial<ChangeProfileResponseType> = await response.json().catch(() => ({}));
          backendSuccess = true;
          backendMsg = resData.message || "تم تحديث الصورة الشخصية بنجاح";
          if (resData.photo) {
            savedPhoto = resData.photo;
          }
        } else if (response.status === 413) {
          return {
            success: false,
            message: "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 2 ميجابايت",
          };
        }
      } catch (backendErr) {
        console.warn("Backend /api/users/profile unreachable, falling back to direct DB:", backendErr);
      }
    }

    // 2. Direct DB Persistence fallback
    if (userId && savedPhoto) {
      try {
        await pool.query('UPDATE users SET photo = $1, "updatedAt" = NOW() WHERE id = $2', [savedPhoto, userId]);
      } catch (dbErr) {
        console.error("Direct DB update photo error:", dbErr);
        if (!backendSuccess) {
          return {
            success: false,
            message: "تعذر حفظ الصورة في قاعدة البيانات، يرجى المحاولة لاحقاً",
          };
        }
      }
    }

    updateTag("user-me");
    updateTag("users");
    updateTag("dashboard");

    return {
      success: true,
      message: backendMsg || "تم تحديث الصورة الشخصية بنجاح",
      photo: savedPhoto,
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

    if (token) {
      const response = await appFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (response && response.ok) {
        const resData: UserDataResponse = await response.json().catch(() => null);
        if (resData && resData.photo) return resData;
      }
    }

    if (sessionUser?.id) {
      const res = await pool.query('SELECT id, name, email, role, photo, "createdAt" FROM users WHERE id = $1', [sessionUser.id]);
      if (res.rows[0]) {
        return {
          id: res.rows[0].id,
          name: res.rows[0].name,
          email: res.rows[0].email,
          role: res.rows[0].role,
          photo: res.rows[0].photo,
          createdAt: res.rows[0].createdAt instanceof Date ? res.rows[0].createdAt.toISOString() : String(res.rows[0].createdAt),
        };
      }
    }
    return null;
  } catch (err) {
    console.error("getUserData error:", err);
    return null;
  }
}
