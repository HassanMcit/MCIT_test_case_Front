"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import MySession from "@/components/MySession/MySession";
import Navbar from "@/components/Navbar/Navbar";
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
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
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
            "min-h-screen pt-16 transition-all duration-200",
            isRTL ? "lg:pr-72" : "lg:pl-72"
          )}
        >
          <main className="w-full">
            {children}
          </main>
        </div>
      </div>
    </MySession>
  );
}
