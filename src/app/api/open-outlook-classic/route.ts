import { NextResponse } from "next/server";

// Preserve the existing non-Windows response and client-side mailto fallback.
export async function POST() {
  return NextResponse.json({
    success: false,
    message: "Server is not Windows. Fallback to mailto link.",
    fallbackToMailto: true,
  });
}
