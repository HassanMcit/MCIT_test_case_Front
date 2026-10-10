import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST() {
  try {
    if (process.platform === "win32") {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-Command", 'Start-Process "ms-settings:defaultapps?registeredappname=Outlook.Application.16"'],
        { detached: true, stdio: "ignore" }
      );
      child.unref();
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false });
  } catch {
    return NextResponse.json({ success: false });
  }
}
