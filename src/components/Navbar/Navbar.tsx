"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import {
  Bell,
  ChevronDown,
  ImagePlusIcon,
  KeyRound,
  LogOut,
  Menu,
  FolderKanban,
  CheckCheck,
  ExternalLink,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { changeProfileImage, getUserData } from "./navbar.action";
import {
  getMyNotifications,
  refreshNotifications,
  getClientToken,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "./notifications.action";
import toast from "react-hot-toast";
import { getUserToken } from "@/app/myUtil";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps = {}) {
  const router = useRouter();
  const { lang, dir, setLanguage, t } = useLanguage();
  const isRTL = dir === "rtl";

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const { data, status, update } = useSession();
  const isLoggingOutRef = useRef(false);

  const [imgSrc, setImgSrc] = useState<string>(() => {
    return data?.user?.image || "/avatar.png";
  });

  const handleExpiredTokenRedirect = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
      await signOut({ redirect: false });
    } catch {}
    router.replace("/login");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      handleExpiredTokenRedirect();
    }
  }, [status]);

  // Fetch notifications on mount and periodically (0ms real-time sync with force-cache)
  const fetchNotifications = async (forceRefresh = false) => {
    try {
      const res = forceRefresh ? await refreshNotifications() : await getMyNotifications();
      if (res?.unauthorized) {
        handleExpiredTokenRedirect();
        return;
      }
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // 1. Listen for local window event dispatched immediately upon assignment (0ms)
    const handleLocalAssignment = () => {
      fetchNotifications(true);
    };
    window.addEventListener("mcit:notification_assigned", handleLocalAssignment);

    // 2. Listen for cross-tab BroadcastChannel notifications
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("mcit_notifications_stream");
        bc.onmessage = (event) => {
          if (event?.data?.type === "NOTIFICATION_ASSIGNED") {
            fetchNotifications(true);
          }
        };
      }
    } catch {}

    // 3. Connect to real-time Server-Sent Events (SSE) via same-origin proxy (no CORS issues)
    //    and schedule exact timer for JWT expiration
    let eventSource: EventSource | null = null;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    getClientToken().then((token) => {
      if (isCancelled) return;
      if (!token) {
        handleExpiredTokenRedirect();
        return;
      }

      // Decode JWT exp claim to schedule automatic redirect the moment token expires
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          if (payload.exp && typeof payload.exp === "number") {
            const msRemaining = payload.exp * 1000 - Date.now();
            if (msRemaining <= 0) {
              handleExpiredTokenRedirect();
              return;
            }
            // Max safe 32-bit timeout is ~24.8 days (2147483647 ms)
            expiryTimer = setTimeout(
              () => {
                handleExpiredTokenRedirect();
              },
              Math.min(msRemaining, 2147483647)
            );
          }
        }
      } catch {}

      try {
        const sseUrl = `/api/users/notifications/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed?.type === "UNAUTHORIZED") {
              handleExpiredTokenRedirect();
              return;
            }
            if (parsed?.type === "NOTIFICATION") {
              fetchNotifications(true);
              toast(
                () => (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0b1c30]">
                      {parsed?.payload?.title || (isRTL ? "إشعار إسناد جديد 🔔" : "New notification 🔔")}
                    </span>
                  </div>
                ),
                { duration: 5000, position: isRTL ? "bottom-left" : "bottom-right" }
              );
            }
          } catch {}
        };

        eventSource.onerror = () => {
          // Silent fallback to polling if SSE drops
        };
      } catch (err) {
        console.warn("SSE stream setup skipped:", err);
      }
    });

    // 4. Refetch on tab focus or visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications(true);
      }
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    // 5. Fallback periodic polling every 5s
    const interval = setInterval(() => fetchNotifications(false), 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (expiryTimer) clearTimeout(expiryTimer);
      window.removeEventListener("mcit:notification_assigned", handleLocalAssignment);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
    };
  }, [isRTL]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // console.log(data?.user.image);

  useEffect(function () {
    getUserData().then(res => {
      setImgSrc(res.photo);
      setUploadImage(res.photo)
    })
  }, []);

  
  return (
    
    <header
    className={cn(
        "fixed top-0 h-16 bg-white/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-3 sm:px-6 border-b border-slate-100 transition-all duration-200",
        "left-0 right-0",
        isRTL ? "lg:right-72 lg:left-0" : "lg:left-72 lg:right-0"
      )}
    >
      {/* ── Start Side: Hamburger (Mobile) + Logos ─────────── */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-[#3d484f] hover:bg-[#eff4ff] transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-4 hover:opacity-90 transition-opacity">
          <div className="relative h-8 sm:h-10 w-24 sm:w-28 flex items-center">
            <Image
              src="/mcit-logo.png"
              alt="MCIT Logo"
              width={112}
              height={40}
              className="object-contain max-h-8 sm:max-h-10"
              priority
            />
          </div>
          <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
          <div className="hidden sm:flex relative h-10 w-28 items-center">
            <Image
              src="/logo.png"
              alt="Digital Transformation Logo"
              width={112}
              height={40}
              className="object-contain max-h-10"
              priority
            />
          </div>
        </Link>
      </div>

      {/* ── End Side: Language Toggle + Bell + User Menu ────────────── */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Bilingual Toggle Pill */}
        <div className="flex items-center bg-[#eff4ff] rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              lang === "en"
                ? "bg-[#00A2D2] text-white shadow-xs"
                : "text-[#3d484f] hover:text-[#0b1c30]"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              lang === "ar"
                ? "bg-[#00A2D2] text-white shadow-xs"
                : "text-[#3d484f] hover:text-[#0b1c30]"
            }`}
          >
            AR
          </button>
        </div>

        {/* Notifications Bell with Interactive Menu */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              fetchNotifications(true);
            }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#eff4ff] transition-colors cursor-pointer text-[#3d484f]"
            aria-label="Notifications"
            title={isRTL ? "الإشعارات" : "Notifications"}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center font-bold animate-pulse shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className={`absolute top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isRTL ? "left-0" : "right-0"
              }`}
            >
              {/* Notifications Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0b1c30]">
                    {isRTL ? "الإشعارات" : "Notifications"}
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      {unreadCount} {isRTL ? "جديد" : "new"}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await markAllNotificationsAsRead();
                      setUnreadCount(0);
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true }))
                      );
                      toast.success(
                        isRTL
                          ? "تم تحديد جميع الإشعارات كمقروءة"
                          : "Marked all as read"
                      );
                    }}
                    className="text-[11px] font-bold text-[#006685] hover:text-[#00aee0] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{isRTL ? "تحديد الكل كمقروء" : "Mark all read"}</span>
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-300" />
                    <span>
                      {isRTL
                        ? "لا توجد إشعارات حتى الآن"
                        : "No notifications yet"}
                    </span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        await markNotificationAsRead(n.id);
                        setUnreadCount((c) => Math.max(0, c - 1));
                        setNotifications((prev) =>
                          prev.map((item) =>
                            item.id === n.id ? { ...item, read: true } : item
                          )
                        );
                        setShowNotifications(false);
                        router.push("/projects");
                      }}
                      className={`p-3.5 flex items-start gap-3 hover:bg-[#eff4ff] transition-colors cursor-pointer group ${
                        !n.read ? "bg-[#f8f9ff]" : "bg-white"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#bfe9ff]/60 text-[#006685] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#0b1c30] truncate">
                            {n.title}
                          </h4>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#565e74] line-clamp-2 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-[#6d797f] font-mono mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString(
                            isRTL ? "ar-EG" : "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer: Direct Link to Projects Management */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    router.push("/projects");
                  }}
                  className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-[#006685] hover:bg-white hover:shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>
                    {isRTL
                      ? "الانتقال إلى إدارة المشاريع (Projects Management)"
                      : "Go to Projects Management"}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-xs ring-1 ring-slate-200 bg-slate-100">
              <Image
                src={imgSrc || "/avatar.png"}
                alt={data?.user?.name || "user"}
                fill
                sizes="32px"
                className="object-cover"
                unoptimized
                onError={() => {
                  setImgSrc("/avatar.png");
                }}
              />
            </div>
            <div className={cn("hidden sm:flex flex-col", isRTL ? "text-right" : "text-left")}>
              <span className="text-[13px] font-bold text-[#0b1c30] leading-none">
                {data?.user?.name!}
              </span>
              <span className="text-[11px] text-[#6d797f] mt-0.5">
                {data?.user?.role}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#6d797f] transition-transform duration-200 ${
                showDropdown ? "rotate-180" : ""
              }`}
            />
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className={`absolute top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 py-2 z-50 ${
                isRTL ? "left-0" : "right-0"
              }`}
            >
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-xs ring-1 ring-slate-200 bg-slate-100 shrink-0">
                    <Image
                      src={uploadImage || imgSrc || "/avatar.png"}
                      alt={data?.user?.name || "user"}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                      onError={() => {
                        
                        setUploadImage("/avatar.png");
                      }}
                    />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[13px] font-bold text-[#0b1c30] truncate">
                      {data?.user?.name}
                    </span>
                    <span className="text-[11px] text-[#6d797f] truncate">
                      {data?.user?.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* Devices & Security for Hassan Ali */}
                {(data?.user?.email?.trim().toLowerCase() === "h.ali@mcit.gov.eg" ||
                  String(data?.user?.id) === "1") && (
                  <Link
                    href="/devices"
                    onClick={() => setShowDropdown(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>{isRTL ? "مراقبة الأجهزة والدخول" : "Devices & Security"}</span>
                  </Link>
                )}

                {/* Change Password */}
                <Link
                  href="/change-password"
                  onClick={() => setShowDropdown(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3d484f] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{t("change_password")}</span>
                </Link>
              </div>

              {/* Logout Divider */}
              <div className="border-t border-slate-100 my-1"></div>
              <div onClick={_ => inputFileRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3d484f] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                >
                  <ImagePlusIcon className="w-4 h-4" />
                  <span>{t("change_image")}</span>
              </div>
                <input
                  type="file"
                  hidden
                  ref={inputFileRef}
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const previewUrl = URL.createObjectURL(file);
                    setUploadImage(previewUrl);
                    
                    
                    
                    const data = new FormData();
                    data.append("photo", file);
                    
                  
                    async function handlePromise() {
                      const res = await changeProfileImage(data);
                      await update({ image: res.photo, user: { image: res.photo } });
                      setShowDropdown(false)
                      return res
                    }

                    toast.promise(handlePromise, {
                      loading: isRTL ? "جاري تغيير الصورة الشخصية..." : "Changing Profile Image...",
                      success: (msg) => {
                        setImgSrc(previewUrl);
                        return <h1 className="text-green-500 font-medium">
                          {isRTL ? msg.message : "Profile updated successfully."}
                        </h1>
                    },
                      error: (err) => (
                        <h1 className="text-red-500 font-medium">
                          {err?.message || (isRTL ? "فشل تحديث الصورة" : "Failed to update profile image.")}
                        </h1>
                      ),
                    });
                  }}
                />
              <div className="border-t border-slate-100 my-1"></div>

              {/* Logout */}
              <span
                onClick={() => {
                  setShowDropdown(false);
                 
                  signOut({redirect: false}).then(_ => router.push('/login'))
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3d484f] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("logout")}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
