"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {  useRouter } from "next/navigation";
import {
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  KeyRound,
  CheckCircle2,
  FolderGit2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/language-context";
import { generateValidRandomPassword } from "./add.utile";

import { Controller, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAddUserSchema } from "./add.zod";
import { AddUserType } from "./adduser.interface";
import toast from "react-hot-toast";
import { addNewUser } from "./add.action";



// Generates a password strictly matching: (?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}

export default function AddUserPage() {
  const router = useRouter();
  const { dir, t } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session } = useSession();

  // Admin access guard (with preview mode toggle for review)
  const actualIsAdmin = session?.user?.role === "admin";
  
  const [previewAsAdmin, setPreviewAsAdmin] = useState(true);
  const isAuthorized = actualIsAdmin || previewAsAdmin;

  // Form State (UI Design Only - No real API mutation)
  const [selectedRole, setSelectedRole] = useState("tester");
  const [temporaryPassword, setTemporaryPassword] = useState<string>(() => generateValidRandomPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [forceChangePassword, setForceChangePassword] = useState(true);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Validation breakdown matching: (?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}
  const hasLower = /[a-z]/.test(temporaryPassword);
  const hasUpper = /[A-Z]/.test(temporaryPassword);
  const hasNumber = /\d/.test(temporaryPassword);
  const hasSpecial = /[@$!%*?&#]/.test(temporaryPassword);
  const hasMinLength = temporaryPassword.length >= 8;
  const isRegexValid = hasLower && hasUpper && hasNumber && hasSpecial && hasMinLength;

  

  const handleCopyPassword = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(temporaryPassword);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };



  function handleAddNewUuser(data: AddUserType) {
    toast.promise(addNewUser(data), {
      loading: "Please Wait",
      success: isRTL ? "تم اضافة المستخدم بنجاح" : "User Added Successfully",
      error: err => isRTL ? err.message : "This email is already registered to another user."
    });
  }

  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    setValue,
    watch
  } = useForm<AddUserType>({
    defaultValues: {
      id: "",
      name: "",
      email: "",
      password: temporaryPassword,
      role: "tester",
    },
    mode: "all",
    resolver: zodResolver(getAddUserSchema(t)),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;


  // ─────────────────────────────────────────────────────────────
  // 1. Access Denied State (when not admin and preview disabled)
  // ─────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200/80 shadow-lg text-center">
          <CardHeader className="space-y-3 pb-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center ring-8 ring-red-50/50">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0b1c30]">
              {isRTL ? "صلاحيات غير كافية (Admin Only)" : "Unauthorized Access"}
            </CardTitle>
            <CardDescription className="text-sm text-[#6d797f]">
              {isRTL
                ? "إضافة مستخدم جديد إلى النظام مقتصرة حصرياً على مديري النظام (Administrators)."
                : "Adding new users to the system is strictly reserved for administrators."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-[#3d484f] space-y-1">
              <p className="font-semibold text-slate-700">
                {isRTL ? "حسابك الحالي:" : "Current Account:"} {session?.user?.email || "غير مسجل"}
              </p>
              <p>
                {isRTL ? "الدور الوظيفي:" : "Role:"}{" "}
                <Badge variant="outline" className="text-slate-600 border-slate-300">
                  {session?.user?.role || "user"}
                </Badge>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-0">
            <Button
              variant="outline"
              onClick={() => setPreviewAsAdmin(true)}
              className="w-full text-xs font-semibold border-[#38CAF0] text-[#38CAF0] hover:bg-[#eff4ff]"
            >
              <Eye className="w-4 h-4" />
              {isRTL ? "تفعيل وضع المعاينة (Admin Preview Mode)" : "Enable Admin Preview Mode"}
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full text-xs text-slate-500">
                <BackIcon className="w-4 h-4" />
                {isRTL ? "العودة إلى لوحة المؤشرات" : "Return to Dashboard"}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Admin Form View (Design Only)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9ff] py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── Breadcrumb & Page Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-[#38CAF0] transition-colors"
            >
              {isRTL ? "لوحة التحكم" : "Dashboard"}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-[#38CAF0]">
              {isRTL ? "إدارة المستخدمين" : "User Management"}
            </span>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold px-2 py-0.5 gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              {isRTL ? "خاص بالمسؤول (Admin Only)" : "Admin Only"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            {isRTL ? "إضافة مستخدم جديد للنظام" : "Add New System User"}
          </h1>
          <p className="text-xs sm:text-sm text-[#6d797f] mt-1">
            {isRTL
              ? "إنشاء حساب مستخدم جديد وتحديد الصلاحيات والمشاريع المسندة له في منظومة اختبارات MCIT"
              : "Provision a new user account, assign roles and designate test projects in MCIT QA System"}
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-slate-600">
            <BackIcon className="w-4 h-4" />
            <span>{isRTL ? "العودة للوحة المؤشرات" : "Back to Dashboard"}</span>
          </Button>
        </Link>
      </div>

      {/* Simulated Success Toast */}
      {isSuccessToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            {isRTL
              ? "تم إنشاء حساب المستخدم بنجاح وإرسال بيانات تسجيل الدخول إلى بريده الإلكتروني!"
              : "User account created successfully! Credentials sent to user email."}
          </span>
        </div>
      )}

      {/* ── Main User Creation Form ───────────────────────────── */}
      <form onSubmit={handleSubmit(handleAddNewUuser)} className="space-y-6 max-w-4xl">
        {/* Section 1: Basic Information */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e5eeff] text-[#38CAF0] flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#0b1c30]">
                  {isRTL ? "البيانات الأساسية للمستخدم" : "Basic Account Details"}
                </CardTitle>
                <CardDescription className="text-xs text-[#6d797f]">
                  {isRTL ? "المعلومات التعريفية والهوية الرسمية" : "Official identity and contact information"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">
                  {isRTL ? "الاسم بالكامل *" : "Full Name *"}
                </Label>
                <Input
                  id="fullName"
                  {...register("name")}
                  placeholder={isRTL ? "مثال: م. عمر محمد الشريف" : "e.g. Omar Mohamed El-Sherif"}
                  className={cn(
                    "h-10 text-xs sm:text-sm",
                    errors.name && "border-red-400 focus-visible:ring-red-400"
                  )}
                />
                {errors.name && (
                  <span className="text-[11px] text-red-500 font-medium block">
                    {errors.name.message}
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                  {isRTL ? "البريد الإلكتروني الرسمي *" : "Official Email Address *"}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="user@mcit.gov.eg"
                    className={cn(
                      "h-10 text-xs sm:text-sm",
                      errors.email && "border-red-400 focus-visible:ring-red-400"
                    )}
                  />
                </div>
                {errors.email ? (
                  <span className="text-[11px] text-red-500 font-medium block">
                    {errors.email.message}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 block">
                    {isRTL ? "يُفضل استخدام البريد الحكومي المعتمد (@mcit.gov.eg)" : "Official government domain preferred (@mcit.gov.eg)"}
                  </span>
                )}
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <Label htmlFor="empId" className="text-xs font-bold text-slate-700">
                  {isRTL ? "الرقم الوظيفي *" : "Employee ID *"}
                </Label>
                <Input
                  id="empId"
                  {...register("id")}
                  placeholder={isRTL ? "مثال: 4019" : "e.g. 4019"}
                  className={cn(
                    "h-10 text-xs sm:text-sm",
                    errors.id && "border-red-400 focus-visible:ring-red-400"
                  )}
                />

                {errors.id ? (
                  <span className="text-[11px] text-red-500 font-medium block">
                    {errors.id.message}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 block">
                    {isRTL ? "الرقم الوظيفي المستخدم كمعرف فريد للمستخدم" : "Unique numeric ID for the user"}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Role & Directorate */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#0b1c30]">
                  {isRTL ? "الدور والصلاحيات في المنظومة" : "Role & Permissions"}
                </CardTitle>
                <CardDescription className="text-xs text-[#6d797f]">
                  {isRTL ? "تحديد الصلاحيات الممنوحة للمستخدم في النظام" : "Set access level and security clearance"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Role Selection */}
              <div className="space-y-1.5 ">
                <Label className="text-xs font-bold text-slate-700">
                  {isRTL ? "الدور الوظيفي في النظام *" : "System Role *"}
                </Label>
                <Controller name="role" control={control} render={ ({field}) => <Select {...field} value={selectedRole}  >
                  <SelectTrigger className="h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-52">
                    <SelectItem value="admin">
                      {isRTL ? "مدير نظام " : "Administrator "}
                    </SelectItem>
                    <SelectItem value="tester">
                      {isRTL ? "مهندس اختبار " : "QA Tester"}
                    </SelectItem>
                  </SelectContent>
                </Select>}/>
              </div>

           
            </div>
          </CardContent>
        </Card>



        {/* Section 4: Security & Manual Temporary Password */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-[#0b1c30]">
                    {isRTL ? "تعيين كلمة مرور مؤقتة للمستخدم (Manual Temporary Password)" : "Set Manual Temporary Password"}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6d797f]">
                    {isRTL
                      ? "يقوم المسؤول بإنشاء وتسليم كلمة مرور مؤقتة للمستخدم لتسجيل دخوله الأول"
                      : "Admin manually provides a secure temporary password to the user"}
                  </CardDescription>
                </div>
              </div>

              {/* Quick Regenerate button in header */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPass = generateValidRandomPassword();
                  setTemporaryPassword(newPass);
                  setValue("password", newPass, { shouldValidate: true });
                }}
                className="h-8 gap-1.5 text-xs text-[#38CAF0] border-slate-200 hover:bg-[#eff4ff] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRTL ? "توليد كلمة مرور جديدة" : "Generate New"}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            {/* Password Input & Actions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tempPassword" className="text-xs font-bold text-slate-700">
                  {isRTL ? "كلمة المرور المؤقتة المعتمدة *" : "Temporary Password *"}
                </Label>
                {isRegexValid && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 py-0.5">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>{isRTL ? "متوافقة مع معايير الأمان الإلزامية" : "Valid Security Policy"}</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="tempPassword"
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    {...register("password")}
                    autoComplete="off"
                    onChange={(e) => {
                      setTemporaryPassword(e.target.value);
                      setValue("password", e.target.value, { shouldValidate: true });
                    }}
                    className={cn(
                      "h-11 font-mono text-sm sm:text-base font-bold text-[#38CAF0] tracking-wider pr-10 bg-slate-50/60 border-slate-200",
                      errors.password && "border-red-400 focus-visible:ring-red-400"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Copy Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="h-11 px-4 gap-1.5 text-xs font-semibold border-slate-200 hover:bg-[#eff4ff] hover:text-[#38CAF0] cursor-pointer shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">{isRTL ? "تم النسخ!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{isRTL ? "نسخ كلمة المرور" : "Copy Password"}</span>
                    </>
                  )}
                </Button>
              </div>
              {errors.password && (
                <span className="text-[11px] text-red-500 font-medium block mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Password Validation Policy Breakdown Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  {isRTL ? "شروط الأمان الإلزامية لكلمة المرور (Password Security Policy):" : "Required Password Rules:"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Regex: (?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]&#123;8,&#125;
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                {/* Rule 1: Min length 8 */}
                <div
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    hasMinLength
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasMinLength ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span>{isRTL ? "8 خانات على الأقل" : "8+ characters"}</span>
                </div>

                {/* Rule 2: Uppercase */}
                <div
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    hasUpper
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasUpper ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span>{isRTL ? "حرف كبير [A-Z]" : "Uppercase [A-Z]"}</span>
                </div>

                {/* Rule 3: Lowercase */}
                <div
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    hasLower
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasLower ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span>{isRTL ? "حرف صغير [a-z]" : "Lowercase [a-z]"}</span>
                </div>

                {/* Rule 4: Number */}
                <div
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    hasNumber
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasNumber ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span>{isRTL ? "رقم واحد [0-9]" : "Number [0-9]"}</span>
                </div>

                {/* Rule 5: Special char */}
                <div
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    hasSpecial
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasSpecial ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span>{isRTL ? "رمز (@$!%*?&#)" : "Special char"}</span>
                </div>
              </div>
            </div>

            {/* Force change password on first login checkbox */}
            <div
              onClick={() => setForceChangePassword((prev) => !prev)}
              className="flex items-center gap-2.5 pt-1 cursor-pointer select-none"
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  forceChangePassword ? "bg-[#38CAF0] border-[#38CAF0] text-white" : "border-slate-300 bg-white"
                }`}
              >
                {forceChangePassword && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {isRTL
                  ? "إلزام المستخدم بتغيير كلمة المرور فور أول تسجيل دخول للنظام"
                  : "Require user to change password upon first sign-in"}
              </span>
            </div>

            {/* Security Notice */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-800 flex items-center gap-2">
              <span className="font-bold shrink-0">{isRTL ? "تنبيه أمني:" : "Security Note:"}</span>
              <span>
                {isRTL
                  ? "احرص على نسخ كلمة المرور وتسليمها للمستخدم بطريقة آمنة وموثوقة، لن يتم إرسال رسائل بريد إلكتروني تلقائية."
                  : "Please copy and hand over this temporary password directly and securely to the user."}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Form Actions ──────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/dashboard">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer px-5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {isRTL ? "إلغاء والعودة" : "Cancel"}
            </Button>
          </Link>
          <Button
            type="submit"
            className="h-11 px-6 text-xs font-bold bg-[#00A2D2] hover:bg-[#008eb8] text-white shadow-md shadow-[#00A2D2]/20 gap-2 cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRTL ? "إنشاء وتفعيل حساب المستخدم" : "Create & Activate User"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
