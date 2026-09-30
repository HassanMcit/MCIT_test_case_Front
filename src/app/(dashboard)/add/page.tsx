"use client";

import { useState } from "react";
import { Plus, Minus, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";

interface Step {
  id: number;
  value: string;
}

export default function AddTestCasePage() {
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, value: "" },
    { id: 2, value: "" },
  ]);

  const addStep = () =>
    setSteps((prev) => [...prev, { id: Date.now(), value: "" }]);

  const removeStep = (id: number) =>
    setSteps((prev) => prev.filter((s) => s.id !== id));

  const updateStep = (id: number, value: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));

  const { dir} = useLanguage();
  
    const isRTL = dir === "rtl";

  return (
    <div className="flex flex-col w-full p-6 gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] leading-10 font-bold text-[#0b1c30]">{isRTL ? "إضافة حالة اختبار جديدة" : "Add New Test Case"}</h1>
          <p className="text-[14px] text-[#3d484f] mt-1">
            {isRTL ? " أدخل تفاصيل حالة الاختبار بعناية لضمان دقة وتغطية معايير الجودة للتحول الرقمي." : "Enter test case details carefully to ensure accuracy and comprehensive digital transformation quality standards."}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#eff4ff] px-4 py-2 rounded-xl">
          <span className="text-[#006685] text-lg">✓</span>
          <span className="text-[14px] font-bold text-[#0b1c30]">{isRTL ? "حالة جديدة" : "New Test Case"}: TC_003</span>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              alert("تم حفظ حالة الاختبار بنجاح!");
            }}
          >
            {/* Row 1: ID, Module, Page */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "معرف الحالة " : "Test ID"}</Label>
                <Input readOnly value="TC_003" className="bg-[#f8f9ff] text-[13px] font-mono rounded-xl border-[#bcc8d0]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "الوحدة " : "Module"}</Label>
                <Select>
                  <SelectTrigger className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]">
                    <SelectValue placeholder={isRTL ? "اختر المشروع" : "Select Project"} />
                  </SelectTrigger>
                  <SelectContent className="px-1 w-56">
                    <SelectItem value="auth">نظام المصادقة والدخول</SelectItem>
                    <SelectItem value="portal">بوابة الخدمات الإلكترونية</SelectItem>
                    <SelectItem value="dashboard">لوحة مؤشرات الأداء</SelectItem>
                    <SelectItem value="users">إدارة المستخدمين والصلاحيات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "اسم الصفحة" : "Page Name"}</Label>
                <Input placeholder={isRTL ? "مثال: صفحة تسجيل الدخول الموحد" : "e.g.: Login Page"} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]" />
              </div>
            </div>

            {/* Row 2: Scenario */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "سيناريو الاختبار " : "Test Scenario"}</Label>
              <Textarea rows={2} placeholder={isRTL ? "صف السيناريو العام للتحقق من هذا الاختبار بالتفصيل..." : "Describe the overall test scenario in detail..."} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none" />
            </div>

            {/* Row 3: Pre-conditions */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "الشروط المسبقة" : "Pre-conditions"} </Label>
              <Input placeholder={isRTL ? "مثال: يجب أن يكون المستخدم مسجلاً مسبقاً ولديه صلاحية مدير نظام" : "e.g., User must be pre-registered and have System Administrator privileges."} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]" />
            </div>

            {/* Row 4: Dynamic Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "خطوات الاختبار الديناميكية " : "Test Steps"}</Label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-[#006685] bg-green-500/10 p-2 cursor-pointer rounded-4xl hover:text-[#003d51] text-[13px] font-medium transition-all"
                >
                  <Plus className="w-4 h-4 " /> {isRTL ? "إضافة خطوة" : "Add New Step"}
                </button>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 bg-[#f8f9ff] p-2 rounded-xl border border-[#e5eeff]">
                    <Badge variant="outline" className="text-[11px] font-bold bg-[#bfe9ff] text-[#006685] border-[#bfe9ff] min-w-[28px] justify-center">
                      {idx + 1}
                    </Badge>
                    <Input
                      value={step.value}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      placeholder={`${isRTL ? "الخطوة" : "Step"} ${idx + 1}: ${isRTL ? "صف الإجراء المطلوب..." : "Describe the required action..."}`}
                      className="flex-1 h-8 text-[13px] border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-none"
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeStep(step.id)}
                        className="p-1 hover:bg-[#ffdad6] flex items-center gap-1 rounded-lg text-[#3d484f] hover:text-[#ba1a1a] cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" /> {isRTL ? "حذف" : "Remove"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Row 5: Expected + Actual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "النتيجة المتوقعة " : "Expected Result"}</Label>
                <Textarea rows={3} placeholder={isRTL ? "ما الذي يجب أن يحدث عند تنفيذ الخطوات أعلاه..." : "What should happen once the above steps are executed"} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "النتيجة الفعلية " : "Actual Result"}</Label>
                <Textarea rows={3} placeholder={isRTL ? "ما الذي حدث فعلياً أثناء التنفيذ..." : "What actually happened during execution..."} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none" />
              </div>
            </div>

            {/* Row 6: Priority, Status, Tester, Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "الأولوية " : "Priority"}</Label>
                <Select>
                  <SelectTrigger className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]">
                    <SelectValue placeholder={isRTL ? "اختر الأولوية" : "Priority"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">{isRTL ? "عالية جداً" : "Critical"}</SelectItem>
                    <SelectItem value="high">{isRTL ? "عالية" : "High"}</SelectItem>
                    <SelectItem value="medium">{isRTL ? "متوسطة" : "Medium"}</SelectItem>
                    <SelectItem value="low">{isRTL ? "منخفضة" : "Low" }</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "حالة التنفيذ " : "Status"}</Label>
                <Select>
                  <SelectTrigger className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]">
                    <SelectValue placeholder={isRTL ? "اختر الحالة" : "Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">{isRTL ? "ناجح" : "Passed"}</SelectItem>
                    <SelectItem value="failed">{isRTL ?  "فاشل" : "Failed"}</SelectItem>
                    <SelectItem value="pending">{isRTL ? "قيد الانتظار" : "Pending"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "اسم المختبر " : "Tester"}</Label>
                <Input placeholder={isRTL ? "اسم المختبر المسؤول" : "Tester Name"} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "تاريخ التنفيذ" : "Execution Date"}</Label>
                <Input type="date" className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]" />
              </div>
            </div>

            {/* Row 7: Notes */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">{isRTL ? "ملاحظات إضافية " : "Notes"}</Label>
              <Textarea rows={2} placeholder={isRTL ? "أي ملاحظات أو تعليقات إضافية حول هذه الحالة..." : "Add Note About Test Case"} className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e5eeff]">
              <Button type="button" variant="outline" className="gap-2 rounded-xl">
                <RotateCcw className="w-4 h-4" /> {isRTL ? "إعادة تعيين" : "Reset"}
              </Button>
              <Button type="submit" className="gap-2 rounded-xl bg-[#006685] hover:bg-[#004d65] text-white">
                <Save className="w-4 h-4" /> {isRTL ? "حفظ حالة الاختبار" : "Save Test Case"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
