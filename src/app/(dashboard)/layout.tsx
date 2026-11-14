"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import MySession from "@/components/MySession/MySession";
import Navbar from "@/components/Navbar/Navbar";
import ResumeGuard from "@/components/ResumeGuard";
import Sidebar from "@/components/Sidebar/Sidebar";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <MySession>
      <ResumeGuard />
      <div className="dashboard-shell min-h-screen min-w-0 w-full bg-[#f8f9ff] text-[#0b1c30] antialiased overflow-x-hidden">
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* 1. Sidebar: Fixed on desktop, Drawer on mobile */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* 2. Fixed Navbar */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* 3. Main Content: Full width on mobile, padded beside sidebar on desktop */}
        <div
          className={cn(
            "min-h-screen min-w-0 w-full pt-16 transition-all duration-200 overflow-x-hidden",
            isRTL ? "lg:pr-72" : "lg:pl-72"
          )}
        >
          <main className="dashboard-content w-full min-w-0 max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </MySession>
  );
}
