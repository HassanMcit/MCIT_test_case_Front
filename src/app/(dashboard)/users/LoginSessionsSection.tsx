"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Laptop,
  Smartphone,
  MapPin,
  Clock,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  User,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import toast from "react-hot-toast";
import {
  getLoginSessions,
  revokeLoginSession,
  revokeAllOtherSessions,
  type LoginSessionItem,
} from "./sessions.action";

export default function LoginSessionsSection({ currentUserId }: { currentUserId?: number }) {
  const { dir, lang } = useLanguage();
  const isRTL = dir === "rtl";
  const [sessions, setSessions] = useState<LoginSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getLoginSessions();
      setSessions(data);
    } catch {
      toast.error(isRTL ? "فشل تحميل سجل الجلسات" : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success(isRTL ? "تم النسخ" : "Copied to clipboard");
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await revokeLoginSession(sessionId);
      if (res.success) {
        toast.success(res.message);
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === sessionId ? { ...s, isActive: false } : s))
        );
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error(isRTL ? "حدث خطأ" : "Error");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!currentUserId) return;
    try {
      const res = await revokeAllOtherSessions(currentUserId);
      if (res.success) {
        toast.success(res.message);
        loadSessions();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error(isRTL ? "حدث خطأ" : "Error");
    }
  };

  const formatSessionDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(isRTL ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const activeCount = sessions.filter((s) => s.isActive).length;

  return (
    <Card className="border-slate-200/80 shadow-xs overflow-hidden bg-white mt-8">
      <CardHeader className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold text-[#0b1c30]">
              {isRTL ? "سجل الأجهزة والجلسات النشطة (Security & Devices)" : "Active Devices & Login Audit"}
            </CardTitle>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-mono">
              {activeCount} {isRTL ? "جلسة نشطة" : "active"}
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm text-slate-500">
            {isRTL
              ? "بيانات الأجهزة التي قامت بتسجيل الدخول (عنوان IP، معرّف الجهاز/MAC، الموقع الجغرافي، ونوع الجهاز) مع إمكانية إنهاء أي جلسة عن بُعد."
              : "Track login sessions with IP, MAC/Device ID, location, and device details with remote force logout."}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={loading}
            className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{isRTL ? "تحديث السجل" : "Refresh"}</span>
          </Button>

          {currentUserId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevokeAllOther}
              className="h-9 px-3 rounded-xl border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isRTL ? "تسجيل خروج من جميع الأجهزة الأخرى" : "Logout other devices"}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5">{isRTL ? "المستخدم" : "User"}</th>
                <th className="py-3.5 px-5">{isRTL ? "عنوان الـ IP" : "IP Address"}</th>
                <th className="py-3.5 px-5">{isRTL ? "معرّف الجهاز (MAC ID)" : "Device MAC"}</th>
                <th className="py-3.5 px-5">{isRTL ? "الموقع الجغرافي" : "Location"}</th>
                <th className="py-3.5 px-5">{isRTL ? "نوع الجهاز والمتصفح" : "Device / OS"}</th>
                <th className="py-3.5 px-5">{isRTL ? "وقت الدخول" : "Login Time"}</th>
                <th className="py-3.5 px-5 text-center">{isRTL ? "الحالة والإجراء" : "Status & Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Laptop className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-xs">
                      {isRTL ? "لا توجد جلسات مسجلة حالياً" : "No sessions logged yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                sessions.map((item) => {
                  const isMobile = /Android|iPhone|iPad/i.test(item.userAgent || item.deviceInfo || "");
                  return (
                    <tr key={item.sessionId || String(item.id)} className="hover:bg-slate-50/60 transition-colors">
                      {/* User */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#006685] flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0b1c30] text-xs">
                              {item.userName || item.email}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 font-mono text-[11.5px] font-semibold text-slate-700 border border-slate-200/80">
                          <span>{item.ip || "Unknown"}</span>
                          {item.ip && (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.ip)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={isRTL ? "نسخ الـ IP" : "Copy IP"}
                            >
                              {copiedText === item.ip ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* MAC Address / Device ID */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50/60 font-mono text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                          <span>{item.macAddress || "02:00:00:00:00:01"}</span>
                          {item.macAddress && (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.macAddress)}
                              className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                              title={isRTL ? "نسخ معرّف الجهاز" : "Copy MAC"}
                            >
                              {copiedText === item.macAddress ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 max-w-[220px]">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate" title={item.location || "Egypt"}>
                            {item.location || "Egypt"}
                          </span>
                        </div>
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-[#0b1c30]">
                          {isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-[#006685] shrink-0" />
                          )}
                          <span className="truncate max-w-[200px]" title={item.deviceInfo || item.userAgent}>
                            {item.deviceInfo || "Desktop Browser"}
                          </span>
                        </div>
                      </td>

                      {/* Login Time */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatSessionDate(item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Status & Revoke Action */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {item.isActive ? (
                          <div className="inline-flex items-center gap-2">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10.5px] font-bold py-0.5 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{isRTL ? "نشط حالياً" : "Active"}</span>
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleRevoke(item.sessionId)}
                              disabled={revokingId === item.sessionId}
                              className="h-7 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer text-[11px] font-bold gap-1"
                              title={isRTL ? "تسجيل خروج هذا الجهاز فوراً" : "Force logout this device"}
                            >
                              <LogOut className="w-3 h-3" />
                              <span>{isRTL ? "تسجيل خروج" : "Logout"}</span>
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10.5px]">
                            {isRTL ? "تم إنهاء الجلسة" : "Revoked"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
