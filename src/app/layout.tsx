import type { Metadata } from "next";
import { Almarai, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/context/language-context";

const almarai = Almarai({
  weight: ["400", "700"], 
  subsets: ["arabic"],
  variable: "--font-almarai",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "نظام إدارة اختبارات الجودة | QA Test Suite Manager",
  description: "Quality Assurance Management Portal",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("qa_lang")?.value;
  const initialLang = rawLang === "en" || rawLang === "ar" ? rawLang : "ar";
  const dir = initialLang === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={initialLang}
      dir={dir}
      suppressHydrationWarning
      className={cn("h-full antialiased", almarai.variable, geistMono.variable)}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className="min-h-full flex flex-col font-[family-name:var(--font-almarai),sans-serif]"
        suppressHydrationWarning
      >
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}