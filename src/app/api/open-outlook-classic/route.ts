import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to = "", cc = "", subject = "", content = "" } = body;

    // Check if running on Windows server/machine
    if (process.platform !== "win32") {
      return NextResponse.json({
        success: false,
        message: "Server is not Windows. Fallback to mailto link.",
        fallbackToMailto: true,
      });
    }

    const toB64 = Buffer.from(String(to), "utf-8").toString("base64");
    const ccB64 = Buffer.from(String(cc), "utf-8").toString("base64");
    const subjectB64 = Buffer.from(String(subject), "utf-8").toString("base64");
    const bodyB64 = Buffer.from(String(content), "utf-8").toString("base64");

    const script = `
$ErrorActionPreference = 'Stop'
try {
  $o = New-Object -ComObject Outlook.Application
  $m = $o.CreateItem(0)
  $m.To = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${toB64}'))
  $m.CC = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${ccB64}'))
  $m.Subject = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${subjectB64}'))
  $m.Body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${bodyB64}'))
  $m.Display($false)
  exit 0
} catch {
  exit 1
}
`;

    const encodedCommand = Buffer.from(script, "utf16le").toString("base64");

    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedCommand]
    );

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: true });
      }, 6000);

      let errOutput = "";
      child.stderr?.on("data", (chunk) => {
        errOutput += chunk.toString();
      });

      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: errOutput });
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({ success: false, error: err.message });
      });
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        method: "outlook_classic_com",
        message: "Outlook (classic) launched successfully",
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Failed to launch Outlook",
      fallbackToMailto: true,
    });
  } catch (error) {
    console.error("Error in open-outlook-classic route:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallbackToMailto: true,
    });
  }
}
