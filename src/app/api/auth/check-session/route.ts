import { NextResponse } from "next/server";
import { getCurrentUserSession, getUserToken } from "@/app/myUtil";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    const token = await getUserToken();

    if (!session || !token) {
      const response = NextResponse.json(
        { valid: false, reason: "revoked" },
        { status: 401 }
      );
      // Clear session cookies
      const cookieNames = [
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.session-token",
      ];
      for (const name of cookieNames) {
        response.cookies.delete(name);
        for (let i = 0; i < 5; i++) {
          response.cookies.delete(`${name}.${i}`);
        }
      }
      return response;
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
      },
    });
  } catch (err) {
    console.error("Error checking session validity:", err);
    return NextResponse.json({ valid: true });
  }
}
