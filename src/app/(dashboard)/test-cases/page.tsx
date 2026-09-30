"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Download, Plus, Eye, Pencil, Trash2,
  ListChecks, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";

/* ── Static data ──────────────────────────────────────────────────── */


export default function TestCasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { dir} = useLanguage();
  
    const isRTL = dir === "rtl";

  const stats = [
  { label: isRTL ? "إجمالي حالات الاختبار" : "Total Test Case", value: "1,284", icon: ListChecks, color: "text-[#006685]", bg: "bg-[#bfe9ff]" },
  { label: isRTL ?  "الاختبارات الناجحة" : "Success",     value: "1,120", icon: CheckCircle, color: "text-[#006c49]", bg: "bg-[#6ffbbe]/30" },
  { label: isRTL ? "الاختبارات الفاشلة" : "Fail",     value: "94",    icon: XCircle,     color: "text-[#ba1a1a]", bg: "bg-[#ffdad6]" },
  { label: isRTL ? "قيد الانتظار" : "Pending",           value: "70",    icon: Clock,       color: "text-[#565e74]", bg: "bg-[#dae2fd]" },
];

const testCases = [
  { id: "TC-8492", module: "بوابة المصادقة الموحدة",         steps: "إدخال بيانات صحيحة والضغط على دخول",      expected: "نجاح تسجيل الدخول والانتقال للوحة",  actual: "تم الانتقال بنجاح تام",              priority: isRTL ? "عالية" : "Critical",    pClass: "bg-[#ffdad6] text-[#ba1a1a]",       status: isRTL ?  "ناجح" :"Success",          sClass: "bg-emerald-50 text-emerald-600 border-emerald-200", tester: "أحمد العتيبي",   date: "2023-10-24" },
  { id: "TC-8493", module: "خدمة الاستعلام عن المعاملات",    steps: "بحث برقم معاملة غير موجود بالنظام",        expected: "ظهور رسالة \"المعاملة غير موجودة\"",  actual: "ظهر خطأ 500 غير متوقع",              priority: isRTL ? "متوسطة" : "Medium",   pClass: "bg-amber-50 text-amber-600 border-amber-200",        status: isRTL ?  "فاشل" : "Fail",          sClass: "bg-red-50 text-red-600 border-red-200",             tester: "سارة القحطاني", date: "2023-10-24" },
  { id: "TC-8494", module: "نظام المدفوعات الحكومية",        steps: "إتمام عملية دفع برقم بطاقة منتهية الصلاحية", expected: "رفض العملية وإظهار تنبيه الصلاحية", actual: "قيد التنفيذ / جاري الاختبار",       priority: isRTL ? "عالية" : "Critical",    pClass: "bg-[#ffdad6] text-[#ba1a1a]",       status: isRTL ?  "قيد الانتظار" : "Pending", sClass: "bg-amber-50 text-amber-600 border-amber-200",       tester: "محمد الدوسري", date: "2023-10-23" },
  { id: "TC-8495", module: "إدارة الملف الشخصي",             steps: "تحديث البريد الإلكتروني برمز تحقق جديد",   expected: "إرسال الرمز وتحديث البريد بنجاح",   actual: "تم التحديث بنجاح",                   priority: isRTL ? "منخفضة" : "Low",  pClass: "bg-[#e5eeff] text-[#565e74]",       status: isRTL ?  "ناجح" : "Success",          sClass: "bg-emerald-50 text-emerald-600 border-emerald-200", tester: "فاطمة الشمري", date: "2023-10-23" },
  { id: "TC-8496", module: "إشعارات النظام",                 steps: "استلام إشعار فوري عند صدور قرار جديد",    expected: "ظهور الإشعار في القائمة المنسدلة",  actual: "تأخر ظهور الإشعار بحدود 15 ثانية", priority: isRTL ? "متوسطة" : "Medium",  pClass: "bg-amber-50 text-amber-600 border-amber-200",        status: isRTL ?  "ناجح" : "Success",          sClass: "bg-emerald-50 text-emerald-600 border-emerald-200", tester: "خالد العمري",  date: "2023-10-22" },
];

const statusDot: Record<string, string> = {
  "ناجح": "bg-emerald-500",
  "Success": "bg-emerald-500",
  "فاشل": "bg-red-500",
  "Fail": "bg-red-500",
  "قيد الانتظار": "bg-amber-500 animate-pulse",
  "Pending": "bg-amber-500 animate-pulse",
};

  const filtered = testCases.filter((tc) => {
    const matchSearch = !search || tc.id.includes(search) || tc.module.includes(search);
    const matchStatus = statusFilter === "all" || tc.status === statusFilter;
    const matchPriority = priorityFilter === "all" || tc.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="flex flex-col w-full p-6 gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-[#565e74] mb-1">{s.label}</p>
                <h3 className="text-[24px] font-bold text-[#0b1c30]">{s.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d797f] w-4 h-4" />
              <Input
                className="pr-10 h-9 text-[13px] bg-[#f8f9ff] border-[#bcc8d0] focus-visible:ring-[#006685]/20"
                placeholder={isRTL ? "البحث برقم المعرف، الوحدة، أو الكلمة الرئيسية..." : "Search by ID, module, or keyword..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-9 w-40 text-[13px] bg-[#f8f9ff]">
                <SelectValue placeholder={isRTL ? "جميع الحالات" : "All Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value={isRTL ? "ناجح" : "Success"}>{isRTL ? "ناجح" : "Success"}</SelectItem>
                <SelectItem value={isRTL ? "فاشل" : "Fail"}>{isRTL ? "فاشل" : "Fail"}</SelectItem>
                <SelectItem value={isRTL ? "قيد الانتظار" : "Pending"}>{isRTL ? "قيد الانتظار" : "Pending"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "all")}>
              <SelectTrigger className="h-9 w-40 text-[13px] bg-[#f8f9ff]">
                <SelectValue placeholder="جميع الأولويات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الأولويات" : "All Priorities"}</SelectItem>
                <SelectItem value={isRTL ? "عالية" : "Critical"}>{isRTL ? "عالية" : "Critical"}</SelectItem>
                <SelectItem value={isRTL ? "متوسطة" : "Medium"}>{isRTL ? "متوسطة" : "Medium"}</SelectItem>
                <SelectItem value={isRTL ? "منخفضة" : "Low"}>{isRTL ? "منخفضة" : "Low"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Link
              href="/add"
              className="inline-flex items-center justify-center h-9 px-4 bg-[#00C3F3] hover:bg-[#006685] text-white rounded-lg text-[13px] font-medium transition-colors"
            >
              <Plus className="w-4 h-4 ml-1" />
              {isRTL ? "حالة اختبار جديدة" : "New Test Case"}
            </Link>
            <Button variant="outline" className="h-9 rounded-lg text-[13px]">
              <Download className="w-4 h-4 ml-1" />
              {isRTL ? "تصدير إلى إكسل" : "Export To Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#f8f9ff] h-10 border-b border-[#e5eeff]">
               {isRTL ? 
                ["معرف الحالة", "الوحدة", "الخطوات", "النتيجة المتوقعة", "النتيجة الفعلية", "الأولوية", "الحالة", "المختبر", "تاريخ التنفيذ", "الإجراءات"].map((h) => (
                  <th key={h} className="px-1 text-[11px] text-[#565e74] uppercase font-semibold">{h}</th>
                )) : [
  "Case ID",
  "Module",
  "Steps",
  "Expected Result",
  "Actual Result",
  "Priority",
  "Status",
  "Tester",
  "Execution Date",
  "Actions"
].map((h) => (
  <th key={h} className="px-2 text-[11px] text-[#565e74] uppercase font-semibold">
    {h}
  </th>
))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {filtered.map((row) => (
                <tr key={row.id} className="h-10 hover:bg-[#eff4ff] transition-colors">
                  <td className="px-3 text-[13px] font-mono font-bold text-[#006685]">{row.id}</td>
                  <td className="px-3 text-[13px] text-[#0b1c30]">{row.module}</td>
                  <td className="px-3 text-[13px] text-[#3d484f] max-w-[200px] truncate" title={row.steps}>{row.steps}</td>
                  <td className="px-3 text-[13px] text-[#3d484f] max-w-[150px] truncate">{row.expected}</td>
                  <td className="px-3 text-[13px] text-[#3d484f] max-w-[150px] truncate">{row.actual}</td>
                  <td className="px-3">
                    <Badge variant="outline" className={`text-[11px] font-semibold border ${row.pClass}`}>{row.priority}</Badge>
                  </td>
                  <td className="px-3">
                    <Badge variant="outline" className={`text-[11px] font-semibold border flex items-center gap-1 w-fit ${row.sClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[row.status]}`} />
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-3 text-[13px] text-[#0b1c30]">{row.tester}</td>
                  <td className="px-3 text-[12px] text-[#565e74] font-mono">{row.date}</td>
                  <td className="px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 hover:bg-[#e5eeff] rounded text-[#565e74] hover:text-[#006685] transition-colors" title="عرض"><Eye className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-[#e5eeff] rounded text-[#565e74] hover:text-[#006685] transition-colors" title="تعديل"><Pencil className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-[#e5eeff] rounded text-[#565e74] hover:text-[#ba1a1a] transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="bg-[#f8f9ff] px-4 py-3 flex items-center justify-between border-t border-[#e5eeff]">
          <span className="text-[13px] text-[#565e74]">{isRTL ? `عرض 1 إلى ${filtered.length} من أصل 1,284 حالة اختبار` : `Showing 1 to ${filtered.length} of 1,284 test cases`}</span>
          <div className="flex items-center gap-1">
            <button className="px-3 h-8 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] font-medium hover:bg-[#dce9ff] disabled:opacity-50" disabled>{isRTL ? "السابق" : "Previous"}</button>
            {[1, 2, 3].map((n) => (
              <button key={n} className={`w-8 h-8 rounded-lg text-[13px] font-bold flex items-center justify-center ${n === 1 ? "bg-[#00C3F3] text-white" : "hover:bg-[#e5eeff] text-[#0b1c30]"}`}>{n}</button>
            ))}
            <span className="text-[#565e74] px-1">...</span>
            <button className="w-8 h-8 rounded-lg hover:bg-[#e5eeff] text-[13px] text-[#0b1c30] flex items-center justify-center">257</button>
            <button className="px-3 h-8 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] font-medium hover:bg-[#dce9ff]">{isRTL ? "التالي" : "Next"}</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
