"use client"

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  Trash2,
  Lock,
  AlertTriangle,
  FolderGit2,
  FileCheck2,
  Calendar,
  CheckCircle2,
  X,
  Filter,
  UserCheck,
  Info,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { deleteThisUser, getAllUsers } from "./user.action";
import { GetAllUsersResponse } from "./user.interface";

// User entity interface matching backend & schema


;

export default function UsersManagementPage() {
  const { dir, t, lang } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session } = useSession();

  const [usersList, setUsersList] = useState<GetAllUsersResponse[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "tester" | "user">("all");
  const [userToDelete, setUserToDelete] = useState<GetAllUsersResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Attempt to fetch live users from API if accessible
  useEffect(() => {
    // async function loadLiveUsers() {
    //   try {
    //     const token =
    //       (session as any)?.user?.access_token ||
    //       (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);

    //     if (!token) return;

    //     const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/users`, {
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //       },
    //     });

    //     if (res.ok) {
    //       const data = await res.json();
    //       if (Array.isArray(data) && data.length > 0) {
    //         setUsersList(data);
    //       }
    //     }
    //   } catch (err) {
    //     // Fall back seamlessly to INITIAL_USERS
    //     console.warn("Could not fetch remote users, using local seed state:", err);
    //   }
    // }

    // loadLiveUsers();
    getAllUsers().then(res => setUsersList(res))
  }, [session]);

  // console.log(usersList?.filter(e => e.role))


  

  // Filtered users list based on search and role
  const filteredUsers = useMemo(() => {
    return usersList?.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesRole;

      const idMatch = String(user.id).toLowerCase().includes(q);
      const nameMatch = user.name.toLowerCase().includes(q);
      const emailMatch = user.email.toLowerCase().includes(q);

      return matchesRole && (idMatch || nameMatch || emailMatch);
    });
  }, [usersList, searchQuery, roleFilter]);

  // ─────────────────────────────────────────────────────────────
  // Delete Validation & Action Handler
  // ─────────────────────────────────────────────────────────────
  const initiateDelete = (user: GetAllUsersResponse) => {
    // STRICT VALIDATION: Under NO circumstance may an admin delete another admin
    if (user.role === "admin") {
      const msg = isRTL
        ? "غير مسموح نهائياً بحذف حسابات مديري النظام (Admin). صلاحية الحذف متاحة على المستخدمين والفاحصين فقط."
        : "Admin accounts cannot be deleted under any circumstances per system security rules.";
      toast.error(msg);
      setFeedbackBanner({
        type: "error",
        message: msg,
      });
      return;
    }

    // Check if user is attempting to delete themselves
    const currentUserId = (session?.user as any)?.id;
    if (currentUserId && String(currentUserId) === String(user.id)) {
      const msg = isRTL
        ? "لا يمكنك حذف حسابك الشخصي المسجل به حالياً."
        : "You cannot delete your own active account.";
      toast.error(msg);
      setFeedbackBanner({
        type: "error",
        message: msg,
      });
      return;
    }


    

    

    // Open confirmation modal
    setUserToDelete(user);
  };

  function confirmDeleteUser() {
    if (!userToDelete) return;

    // Safety re-check
    if (userToDelete.role === "admin") {
      setUserToDelete(null);
      toast.error(
        isRTL
          ? "ممنوع: حسابات مديري النظام محمية بالكامل."
          : "Forbidden: Admin accounts are protected."
      );
      return;
    }

    setIsDeleting(true);

    toast.promise(deleteThisUser(userToDelete.id), {
      loading: "Deleting User...",
      success: _ => {
        setUsersList(prev => prev ? prev.filter(user => user.id !== userToDelete.id) : null);
        setIsDeleting(false);
        setUserToDelete(null);
        return <h1 className="text-emerald-500">{userToDelete.name} is Deleted Successfully</h1>
      }
    })
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return isRTL ? "غير محدد" : "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative max-w-7xl mx-auto">
      {/* ── Breadcrumb & Page Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-[#38CAF0] transition-colors"
            >
              {t("dashboard")}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-[#38CAF0]">
              {t("users_admin_nav")}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#38CAF0]/10 text-[#38CAF0] flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              {t("users_management_title")}
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-[#38CAF0]/30 text-[#38CAF0] bg-[#38CAF0]/5">
              {usersList?.length} {isRTL ? "حساب مسجل" : "accounts"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            {t("users_management_subtitle")}
          </p>
        </div>

        {/* Quick Add Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/users/add">
            <Button className="h-11 px-5 bg-[#00A2D2] hover:bg-[#008eb8] text-white rounded-xl shadow-sm font-semibold text-xs sm:text-sm gap-2 cursor-pointer transition-all">
              <UserPlus className="w-4 h-4" />
              <span>{t("users_add_button")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Feedback Banner ────────────────────────────────────── */}
      {feedbackBanner && (
        <div
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-xs transition-all",
            feedbackBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Summary Stats Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {/* Total Users */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("users_total_count")}
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#38CAF0] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30]">
              {usersList?.length}
            </div>
            <span className="text-[11px] text-slate-400 mt-1.5 block">
              {isRTL ? "مستخدم مسجل بالنظام" : "Registered system accounts"}
            </span>
          </CardContent>
        </Card>

        {/* Admins */}
        <Card className="border-purple-200/80 shadow-xs bg-purple-50/30">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                {t("users_admins_count")}
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-950">
                {usersList?.filter(e => e.role === "admin").length}
                
              </div>
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px] font-semibold border-purple-200">
                <Lock className="w-2.5 h-2.5 mr-1" />
                {isRTL ? "محمي من الحذف" : "Protected"}
              </Badge>
            </div>
            <span className="text-[11px] text-purple-600/80 mt-1.5 block">
              {isRTL ? "صلاحيات إدارة كاملة" : "Full governance access"}
            </span>
          </CardContent>
        </Card>

        {/* QA Testers */}
        <Card className="border-teal-200/80 shadow-xs bg-teal-50/30">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                {t("users_testers_count")}
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-950">
              {usersList?.filter(e => e.role === "tester").length}
            </div>
            <span className="text-[11px] text-teal-600/80 mt-1.5 block">
              {isRTL ? "تنفيذ وفحص الجودة" : "Execution & bug logging"}
            </span>
          </CardContent>
        </Card>

        {/* Standard Users */}
        
      </div>

      {/* ── Permissions Matrix Overview (Design Component) ──────── */}
     

      {/* ── Search and Filter Controls ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            className={cn(
              "w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none",
              isRTL ? "right-3.5" : "left-3.5"
            )}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("users_search_placeholder")}
            className={cn(
              "h-11 text-xs sm:text-sm rounded-xl border-slate-200 focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25",
              isRTL ? "pr-10 pl-3 text-right" : "pl-10 pr-3 text-left"
            )}
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0",
              roleFilter === "all"
                ? "bg-white text-[#0b1c30] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t("users_filter_all")} ({usersList?.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("admin")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0",
              roleFilter === "admin"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-500 hover:text-purple-700"
            )}
          >
            {t("users_role_admin_badge")} ({usersList?.filter(e => e.role === "admin").length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("tester")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0",
              roleFilter === "tester"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-500 hover:text-teal-700"
            )}
          >
            {t("users_role_tester_badge")} ({usersList?.filter(e => e.role === "tester").length})
          </button>
          
        </div>
      </div>

      {/* ── Users Table ────────────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">{t("users_col_id")}</th>
                <th className="py-4 px-6">{t("users_col_user")}</th>
                <th className="py-4 px-6">{t("users_col_role")}</th>
                <th className="py-4 px-6 text-center">{t("users_col_projects")}</th>
                <th className="py-4 px-6 text-center">{t("users_col_testcases")}</th>
                <th className="py-4 px-6">{t("users_col_joined")}</th>
                <th className="py-4 px-6 text-center">{t("users_col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-xs">{t("users_empty_search")}</p>
                  </td>
                </tr>
              ) : (
                filteredUsers?.map((user) => {
                  const isAdmin = user.role === "admin";
                  const isTester = user.role === "tester";

                  return (
                    <tr
                      key={String(user.id)}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Employee ID */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-700">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 text-xs">
                          #{user.id}
                        </span>
                      </td>

                      {/* User Avatar, Name, Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/80 shrink-0">
                            <Image
                              src={user.profileImage || user.photo || "/avatar.png"}
                              alt={user.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#0b1c30] truncate text-sm">
                              {user.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Permissions Badge */}
                      <td className="py-4 px-6">
                        {isAdmin ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 gap-1 text-[11px] font-semibold py-0.5">
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            {t("users_role_admin")}
                          </Badge>
                        ) : isTester ? (
                          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200 gap-1 text-[11px] font-semibold py-0.5">
                            <FileCheck2 className="w-3 h-3 text-teal-600" />
                            {t("users_role_tester")}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 gap-1 text-[11px] font-semibold py-0.5">
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            {t("users_role_user")}
                          </Badge>
                        )}
                      </td>

                      {/* Assigned Projects */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                          <FolderGit2 className="w-3 h-3 text-blue-500" />
                          {user._count?.assignedProjects || user.assignedProjects?.length || 0}
                        </span>
                      </td>

                      {/* Test Cases Count */}
                      <td className="py-4 px-6 text-center">
                        <span className="font-mono font-bold text-slate-600 text-xs">
                          {user._count?.testCases || 0}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-slate-500 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions: Red Delete Button (or Disabled Lock for Admin) */}
                      <td className="py-4 px-6 text-center">
                        {isAdmin ? (
                          // STRICT SECURITY: Admin is protected and CANNOT be deleted
                          <div className="relative group/tooltip inline-block">
                            <Button
                              disabled
                              size="sm"
                              className="h-8 px-2.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed rounded-lg opacity-70 gap-1 text-xs"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[11px]">
                                {isRTL ? "محمي" : "Locked"}
                              </span>
                            </Button>
                            {/* Hover tooltip explaining admin protection */}
                            <div
                              className={cn(
                                "absolute bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center leading-tight pointer-events-none",
                                isRTL ? "right-1/2 translate-x-1/2" : "left-1/2 -translate-x-1/2"
                              )}
                            >
                              {t("users_delete_tooltip_admin")}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>
                        ) : (
                          // RED DELETE BUTTON for regular users & testers
                          <Button
                            type="button"
                            onClick={() => initiateDelete(user)}
                            className="h-8 px-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 transition-all rounded-lg cursor-pointer shadow-xs gap-1 text-xs font-semibold"
                            title={t("users_delete_btn")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t("users_delete_btn")}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Deletion Confirmation Modal Dialog ──────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5"
            dir={dir}
          >
            {/* Header with red warning badge */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#0b1c30]">
                  {t("users_delete_confirm_title")}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t("users_delete_confirm_desc")}
                </p>
              </div>
            </div>

            {/* User Target Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {t("users_col_id")}:
                </span>
                <span className="font-mono font-bold text-slate-800">
                  #{userToDelete.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {isRTL ? "اسم المستخدم" : "Name"}:
                </span>
                <span className="font-bold text-[#0b1c30]">
                  {userToDelete.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {isRTL ? "البريد الإلكتروني" : "Email"}:
                </span>
                <span className="font-mono text-slate-600">
                  {userToDelete.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {t("users_col_role")}:
                </span>
                <Badge
                  className={cn(
                    "text-[10px] py-0.5",
                    userToDelete.role === "tester"
                      ? "bg-teal-100 text-teal-800 border-teal-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {userToDelete.role}
                </Badge>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t("users_delete_cannot_undo")}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="h-10 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {t("users_cancel")}
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeleting
                    ? isRTL
                      ? "جاري الحذف..."
                      : "Deleting..."
                    : t("users_confirm_delete")}
                    
                </span>
                
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
