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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { changeProfileImage, getUserData } from "./navbar.action";
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
  
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const { data, update } = useSession();

  const [imgSrc, setImgSrc] = useState<string>(() => {
    
    return data?.user?.image || "/avatar.png";
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
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

        {/* Notifications Bell */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#eff4ff] transition-colors cursor-pointer text-[#3d484f]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center font-bold">
            3
          </span>
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
                {/* Change Password */}
                <Link href="/change-password"
                  onClick={_ => setShowDropdown(false)}
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
