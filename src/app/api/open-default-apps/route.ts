import { NextResponse } from "next/server";

// Hosted runtimes cannot open desktop settings on an employee computer.
export async function POST() {
  return NextResponse.json({ success: false });
}
