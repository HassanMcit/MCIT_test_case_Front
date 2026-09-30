import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  FolderGit2,
  Table,
  X,
  KeyRound,
  ShieldCheck,
  UserPlus,
  FolderKanban,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const navItems = [
    {
      href: "/dashboard",
      label: t("dashboard"),
      icon: LayoutDashboard,
    },
    {
      href: "/add",
      label: t("add_test_case"),
      icon: PlusCircle,
    },
    {
      href: "/test-cases",
      label: t("all_test_cases"),
      icon: ListChecks,
    },
    {
      href: "/projects",
      label: t("projects_management"),
      icon: FolderGit2,
    },
  ];

  

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 h-screen w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-slate-100 select-none overflow-clip transition-transform duration-200 ease-in-out",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        // Desktop (lg+): always visible at translate-x-0
        // Mobile: slide in when isOpen is true, off-screen when false
        isRTL
          ? (isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0")
          : (isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
      )}
    >
      {/* ── Top Section: Brand Header & Navigation ─────────────────── */}
      <div className="flex flex-col">
        {/* Brand Header with Horus Eye Icon & Close button on mobile */}
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity min-w-0"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm ring-1 ring-[#00aee0]/40 bg-slate-900/5">
              <Image
                src="/icon.png"
                alt="Logo Icon"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-[#0b1c30] leading-tight truncate">
                {isRTL ? "التحول الرقمي" : "التحول الرقمي"}
              </span>
              <span className="text-[10px] tracking-wider font-semibold text-[#6d797f] uppercase truncate">
                {isRTL ? "نظام إدارة الاختبارات" : "DIGITAL TRANSFORMATION"}
              </span>
            </div>
          </Link>

          {/* Close Button (Mobile Only) */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-4 py-3">
          <div className="text-[11px] font-bold tracking-wider text-[#6d797f] uppercase px-3 mb-2">
            {t("nav_section")}
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "sidebar-nav-link",
                    isActive && "active"
                  )}
                >
                  <Icon />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Admin Only Navigation */}
          {isAdmin && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-bold tracking-wider text-[#006685] uppercase">
                  {t("admin_section")}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-[#bfe9ff] text-[#004f68] rounded-full">
                  Admin
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                <Link
                  href="/users"
                  onClick={onClose}
                  className={cn(
                    "sidebar-nav-link",
                    pathname === "/users" && "active"
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span className="truncate">{t("users_admin_nav")}</span>
                </Link>

                <Link
                  href="/users/add"
                  onClick={onClose}
                  className={cn(
                    "sidebar-nav-link",
                    pathname === "/users/add" && "active"
                  )}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="truncate">{t("add_new_user")}</span>
                </Link>

                <Link
                  href="/assign-projects"
                  onClick={onClose}
                  className={cn(
                    "sidebar-nav-link",
                    (pathname === "/assign-projects" || pathname.startsWith("/assign-projects/")) && "active"
                  )}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span className="truncate">{t("assign_projects")}</span>
                </Link>

                <Link
                  href="/reset-codes"
                  onClick={onClose}
                  className={cn(
                    "sidebar-nav-link",
                    (pathname === "/reset-codes" || pathname.startsWith("/reset-codes/")) && "active"
                  )}
                >
                  <KeyRound className="w-4 h-4" />
                  <span className="truncate">{t("reset_codes")}</span>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Live Execution Widget & Export ─────────── */}
      <div className="p-3.5 flex flex-col gap-2.5 border-t border-slate-100 shrink-0">
        <div className="p-2.5 rounded-xl bg-[#eff4ff] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6d797f]">
              {t("live_execution")}
            </span>
            <span className="text-[11px] font-mono text-[#0b1c30] font-semibold">
              1,420 {t("total_tests_short")}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="flex flex-col items-center bg-white p-1 rounded-md shadow-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#08b77f]"></span>
                <span className="text-[10px] text-[#3d484f]">{t("passed")}</span>
              </div>
              <span className="text-[13px] font-bold text-[#006c49]">1,180</span>
            </div>
            <div className="flex flex-col items-center bg-white p-1 rounded-md shadow-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                <span className="text-[10px] text-[#3d484f]">{t("failed")}</span>
              </div>
              <span className="text-[13px] font-bold text-[#ba1a1a]">145</span>
            </div>
            <div className="flex flex-col items-center bg-white p-1 rounded-md shadow-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#bec6e0]"></span>
                <span className="text-[10px] text-[#3d484f]">{t("pending")}</span>
              </div>
              <span className="text-[13px] font-bold text-[#565e74]">95</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="w-full p-3 flex items-center justify-center gap-2 h-8.5 rounded-lg bg-white text-[#0b1c30] border border-slate-200 shadow-xs hover:bg-[#eff4ff] transition-all text-[12px] font-medium cursor-pointer"
        >
          <Table className="w-4 h-4 text-[#006c49]" />
          <span>{t("export_excel")}</span>
        </button>
      </div>
    </aside>
  );
}
