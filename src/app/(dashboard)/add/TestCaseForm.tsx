"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { ProjectApiItem } from "../projects/getProjects.action";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { TestCaseFormValues } from "./test-case-interface";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTestCaseSchema } from "./test-case.zod";
import { addNewTestCase, getNextTestCaseId } from "./test-case.action";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  value: string;
}

export default function AddTestCasePage({
  allProjects,
}: {
  allProjects: ProjectApiItem[];
}) {
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

  const { dir, lang } = useLanguage();
  const isRTL = dir === "rtl";
  const schema = useMemo(() => getTestCaseSchema(lang), [lang]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const {
    handleSubmit,
    register,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<TestCaseFormValues>({
    defaultValues: {
      testId: "TC-0001",
      module: "",
      pageName: "",
      scenario: "",
      preConditions: "",
      steps: ["", "", ""],
      expectedResult: "",
      actualResult: "",
      priority: undefined,
      status: undefined,
      notes: "",
      executedAt: "",
      testerId: 1,
      userId: 1,
      projectId: 1,
    },
    mode: "all",
    resolver: zodResolver(schema),
  });

  const { data } = useSession();
  const currentTestId = watch("testId");

  // Auto-select project if user only has 1 project assigned
  useEffect(() => {
    if (allProjects.length === 1 && !selectedProjectId) {
      const singleProj = allProjects[0];
      const idStr = String(singleProj.id);
      setSelectedProjectId(idStr);
      setValue("module", singleProj.name, { shouldValidate: true });
      setValue("projectId", singleProj.id, { shouldValidate: true });
      getNextTestCaseId(singleProj.name, singleProj.id).then((nextId) => {
        setValue("testId", nextId, { shouldValidate: true });
      });
    }
  }, [allProjects, selectedProjectId, setValue]);

  function handleAddNewTestCase(userData: TestCaseFormValues) {
    const targetProjId =
      Number(selectedProjectId) ||
      allProjects.find((e) => e.name === userData.module)?.id ||
      1;
    const matchedProj =
      allProjects.find((e) => e.id === targetProjId) ||
      allProjects.find((e) => e.name === userData.module);

    const validSteps = steps
      .filter((e) => e.value.trim() !== "")
      .map((e) => e.value);

    const updateUserdata: TestCaseFormValues = {
      ...userData,
      steps: validSteps.length > 0 ? validSteps : ["Initial step"],
      executedAt: new Date().toISOString(),
      testerId: Number(data?.user.id) || 1,
      userId: Number(data?.user.id) || 1,
      projectId: targetProjId,
    };

    toast.promise(addNewTestCase(updateUserdata), {
      loading: isRTL ? "جاري إضافة حالة الاختبار..." : "Adding test case...",
      success: () => {
        const currentMod = userData.module;
        const currentPid = targetProjId;
        reset({
          module: currentMod,
          testId: "TC-0001",
          pageName: "",
          scenario: "",
          preConditions: "",
          steps: ["", "", ""],
          expectedResult: "",
          actualResult: "",
          priority: undefined,
          status: undefined,
          notes: "",
          executedAt: "",
          testerId: Number(data?.user.id) || 1,
          userId: Number(data?.user.id) || 1,
          projectId: currentPid,
        });
        setSteps([
          { id: 1, value: "" },
          { id: 2, value: "" },
        ]);
        if (currentPid) {
          getNextTestCaseId(currentMod, currentPid).then((nextId) => {
            setValue("testId", nextId, { shouldValidate: true });
          });
        }
        return (
          <h1 className="text-emerald-500 font-bold">
            {isRTL
              ? "تمت إضافة حالة الاختبار بنجاح"
              : "Test case created successfully"}
          </h1>
        );
      },
      error: (err) => (
        <h1 className="text-red-500 font-bold">
          {isRTL
            ? err?.message?.includes("already exists") ||
              err?.message?.includes("موجودة")
              ? `حالة الاختبار برقم ${updateUserdata.testId} موجودة مسبقاً في هذا المشروع`
              : err?.message || "فشلت إضافة حالة الاختبار"
            : err?.message || "Failed to add test case"}
        </h1>
      ),
    });
  }

  return (
    <div className="flex flex-col w-full p-6 gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] leading-10 font-bold text-[#0b1c30]">
            {isRTL ? "إضافة حالة اختبار جديدة" : "Add New Test Case"}
          </h1>
          <p className="text-[14px] text-[#3d484f] mt-1">
            {isRTL
              ? "أدخل تفاصيل حالة الاختبار بعناية لضمان دقة وتغطية معايير الجودة للتحول الرقمي."
              : "Enter test case details carefully to ensure accuracy and comprehensive digital transformation quality standards."}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#eff4ff] px-4 py-2 rounded-xl">
          <span className="text-[#38CAF0] text-lg">✓</span>
          <span className="text-[14px] font-bold text-[#0b1c30]">
            {isRTL ? "حالة جديدة" : "New Test Case"}: {currentTestId || "TC-0001"}
          </span>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <form
            className="space-y-6"
            onSubmit={handleSubmit(handleAddNewTestCase)}
            noValidate
          >
            {/* Row 1: ID, Module, Page */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Test ID */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "معرف الحالة " : "Test ID"}
                </Label>
                <Input
                  readOnly
                  value={currentTestId || "TC-0001"}
                  {...register("testId")}
                  className={cn(
                    "bg-[#f8f9ff] text-[13px] font-mono rounded-xl border-[#bcc8d0]",
                    errors.testId && "border-red-400 focus-visible:border-red-400"
                  )}
                />
                {errors.testId && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.testId.message}
                  </span>
                )}
              </div>

              {/* Module / Project */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "المشروع / الوحدة " : "Project / Module"}
                </Label>
                <Controller
                  name="module"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={selectedProjectId}
                      onValueChange={async (selectedIdStr) => {
                        const idStr = selectedIdStr || "";
                        setSelectedProjectId(idStr);
                        const matchedProj = allProjects.find(
                          (p) => String(p.id) === idStr
                        );
                        if (matchedProj) {
                          field.onChange(matchedProj.name);
                          setValue("projectId", matchedProj.id, {
                            shouldValidate: true,
                          });
                          const nextId = await getNextTestCaseId(
                            matchedProj.name,
                            matchedProj.id
                          );
                          setValue("testId", nextId, { shouldValidate: true });
                        }
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]",
                          errors.module &&
                            "border-red-400 focus-visible:border-red-400"
                        )}
                      >
                        <SelectValue
                          placeholder={
                            isRTL ? "اختر المشروع" : "Select Project"
                          }
                        >
                          {allProjects.find(
                            (p) => String(p.id) === selectedProjectId
                          )?.name ||
                            (isRTL ? "اختر المشروع" : "Select Project")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="px-1 w-56">
                        {allProjects.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.module && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.module.message}
                  </span>
                )}
              </div>

              {/* Page Name */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "اسم الصفحة" : "Page Name"}
                </Label>
                <Input
                  {...register("pageName")}
                  placeholder={
                    isRTL ? "مثال: صفحة تسجيل الدخول الموحد" : "e.g.: Login Page"
                  }
                  className={cn(
                    "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]",
                    errors.pageName &&
                      "border-red-400 focus-visible:border-red-400"
                  )}
                />
                {errors.pageName && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.pageName.message}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Scenario */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">
                {isRTL ? "سيناريو الاختبار " : "Test Scenario"}
              </Label>
              <Textarea
                {...register("scenario")}
                rows={2}
                placeholder={
                  isRTL
                    ? "صف السيناريو العام للتحقق من هذا الاختبار بالتفصيل..."
                    : "Describe the overall test scenario in detail..."
                }
                className={cn(
                  "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none",
                  errors.scenario &&
                    "border-red-400 focus-visible:border-red-400"
                )}
              />
              {errors.scenario && (
                <span className="text-xs text-red-500 font-medium block mt-1">
                  {errors.scenario.message}
                </span>
              )}
            </div>

            {/* Row 3: Pre-conditions */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">
                {isRTL ? "الشروط المسبقة" : "Pre-conditions"}{" "}
              </Label>
              <Input
                {...register("preConditions")}
                placeholder={
                  isRTL
                    ? "مثال: يجب أن يكون المستخدم مسجلاً مسبقاً ولديه صلاحية مدير نظام"
                    : "e.g., User must be pre-registered and have System Administrator privileges."
                }
                className={cn(
                  "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]",
                  errors.preConditions &&
                    "border-red-400 focus-visible:border-red-400"
                )}
              />
              {errors.preConditions && (
                <span className="text-xs text-red-500 font-medium block mt-1">
                  {errors.preConditions.message}
                </span>
              )}
            </div>

            {/* Row 4: Dynamic Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "خطوات الاختبار الديناميكية " : "Test Steps"}
                </Label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-[#38CAF0] bg-green-500/10 p-2 cursor-pointer rounded-4xl hover:text-[#003d51] text-[13px] font-medium transition-all"
                >
                  <Plus className="w-4 h-4 " />{" "}
                  {isRTL ? "إضافة خطوة" : "Add New Step"}
                </button>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 bg-[#f8f9ff] p-2 rounded-xl border border-[#e5eeff]"
                  >
                    <Badge
                      variant="outline"
                      className="text-[11px] font-bold bg-[#bfe9ff] text-[#38CAF0] border-[#bfe9ff] min-w-[28px] justify-center"
                    >
                      {idx + 1}
                    </Badge>
                    <Input
                      value={step.value}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      placeholder={`${isRTL ? "الخطوة" : "Step"} ${idx + 1}: ${
                        isRTL
                          ? "صف الإجراء المطلوب..."
                          : "Describe the required action..."
                      }`}
                      className="flex-1 h-8 text-[13px] border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-none"
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeStep(step.id)}
                        className="p-1 hover:bg-[#ffdad6] flex items-center gap-1 rounded-lg text-[#3d484f] hover:text-[#ba1a1a] cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />{" "}
                        {isRTL ? "حذف" : "Remove"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {errors.steps && (
                <span className="text-xs text-red-500 font-medium block mt-1">
                  {errors.steps.message}
                </span>
              )}
            </div>

            {/* Row 5: Expected + Actual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "النتيجة المتوقعة " : "Expected Result"}
                </Label>
                <Textarea
                  {...register("expectedResult")}
                  rows={3}
                  placeholder={
                    isRTL
                      ? "ما الذي يجب أن يحدث عند تنفيذ الخطوات أعلاه..."
                      : "What should happen once the above steps are executed"
                  }
                  className={cn(
                    "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none",
                    errors.expectedResult &&
                      "border-red-400 focus-visible:border-red-400"
                  )}
                />
                {errors.expectedResult && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.expectedResult.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "النتيجة الفعلية " : "Actual Result"}
                </Label>
                <Textarea
                  {...register("actualResult")}
                  rows={3}
                  placeholder={
                    isRTL
                      ? "ما الذي حدث فعلياً أثناء التنفيذ..."
                      : "What actually happened during execution..."
                  }
                  className={cn(
                    "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none",
                    errors.actualResult &&
                      "border-red-400 focus-visible:border-red-400"
                  )}
                />
                {errors.actualResult && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.actualResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Row 6: Priority, Status, Tester, Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "الأولوية " : "Priority"}
                </Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]",
                          errors.priority &&
                            "border-red-400 focus-visible:border-red-400"
                        )}
                      >
                        <SelectValue
                          placeholder={
                            isRTL ? "اختر الأولوية" : "Priority"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">
                          {isRTL ? "عالية جداً" : "Critical"}
                        </SelectItem>
                        <SelectItem value="high">
                          {isRTL ? "عالية" : "High"}
                        </SelectItem>
                        <SelectItem value="medium">
                          {isRTL ? "متوسطة" : "Medium"}
                        </SelectItem>
                        <SelectItem value="low">
                          {isRTL ? "منخفضة" : "Low"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.priority && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.priority.message}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "حالة التنفيذ " : "Status"}
                </Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]",
                          errors.status &&
                            "border-red-400 focus-visible:border-red-400"
                        )}
                      >
                        <SelectValue
                          placeholder={isRTL ? "اختر الحالة" : "Status"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">
                          {isRTL ? "ناجح" : "Passed"}
                        </SelectItem>
                        <SelectItem value="failed">
                          {isRTL ? "فاشل" : "Failed"}
                        </SelectItem>
                        <SelectItem value="pending">
                          {isRTL ? "قيد الانتظار" : "Pending"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.status.message}
                  </span>
                )}
              </div>

              {/* Tester Name */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "اسم المختبر " : "Tester"}
                </Label>
                <Input
                  readOnly
                  value={data?.user?.name || ""}
                  placeholder={
                    isRTL ? "اسم المختبر المسؤول" : "Tester Name"
                  }
                  className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]"
                />
              </div>

              {/* Execution Date */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[#0b1c30]">
                  {isRTL ? "تاريخ التنفيذ" : "Execution Date"}
                </Label>
                <Input
                  type="datetime-local"
                  value={new Date(
                    new Date().getTime() -
                      new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)}
                  readOnly
                  className="rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0]"
                />
              </div>
            </div>

            {/* Row 7: Notes */}
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[#0b1c30]">
                {isRTL ? "ملاحظات إضافية " : "Notes"}
              </Label>
              <Textarea
                {...register("notes")}
                rows={2}
                placeholder={
                  isRTL
                    ? "أي ملاحظات أو تعليقات إضافية حول هذه الحالة..."
                    : "Add Note About Test Case"
                }
                className={cn(
                  "rounded-xl text-[13px] bg-[#f8f9ff] border-[#bcc8d0] resize-none",
                  errors.notes && "border-red-400 focus-visible:border-red-400"
                )}
              />
              {errors.notes && (
                <span className="text-xs text-red-500 font-medium block mt-1">
                  {errors.notes.message}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e5eeff]">
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl cursor-pointer"
                onClick={() => {
                  const currentProj = allProjects.find(
                    (p) => String(p.id) === selectedProjectId
                  );
                  reset({
                    module: currentProj?.name || "",
                    testId: "TC-0001",
                    pageName: "",
                    scenario: "",
                    preConditions: "",
                    steps: ["", "", ""],
                    expectedResult: "",
                    actualResult: "",
                    priority: undefined,
                    status: undefined,
                    notes: "",
                    executedAt: "",
                    testerId: Number(data?.user.id) || 1,
                    userId: Number(data?.user.id) || 1,
                    projectId: currentProj?.id || 1,
                  });
                  setSteps([
                    { id: 1, value: "" },
                    { id: 2, value: "" },
                  ]);
                  if (currentProj) {
                    getNextTestCaseId(currentProj.name, currentProj.id).then(
                      (nextId) => {
                        setValue("testId", nextId, { shouldValidate: true });
                      }
                    );
                  }
                }}
              >
                <RotateCcw className="w-4 h-4" />{" "}
                {isRTL ? "إعادة تعيين" : "Reset"}
              </Button>
              <Button
                type="submit"
                className="gap-2 rounded-xl bg-[#00A2D2] hover:bg-[#008eb8] text-white cursor-pointer shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />{" "}
                {isRTL ? "حفظ حالة الاختبار" : "Save Test Case"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
