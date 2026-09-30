"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  dir: "ltr" | "rtl";
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  nav_title: { en: "QA Test Suite", ar: "نظام إدارة الاختبارات" },
  nav_subtitle: { en: "Manager", ar: "التحول الرقمي" },
  nav_section: { en: "NAVIGATION", ar: "قائمة التنقل" },
  dashboard: { en: "Dashboard", ar: "لوحة المؤشرات" },
  add_test_case: { en: "Add Test Case", ar: "إضافة حالة اختبار" },
  all_test_cases: { en: "All Test Cases", ar: "جميع حالات الاختبار" },
  projects_management: { en: "Projects Management", ar: "إدارة المشاريع" },
  reset_codes: { en: "Reset Codes", ar: "أكواد الاستعادة" },
  add_new_user: { en: "Add New User", ar: "إضافة مستخدم جديد" },
  assign_projects: { en: "Assign Projects", ar: "إسناد المشاريع للمختبرين" },
  admin_section: { en: "ADMINISTRATION", ar: "الإدارة والنظام" },
  live_execution: { en: "Live Execution", ar: "التنفيذ الحي" },
  total_tests_short: { en: "Total", ar: "الإجمالي" },
  passed: { en: "Passed", ar: "ناجح" },
  failed: { en: "Failed", ar: "راسب" },
  pending: { en: "Pending", ar: "معلق" },
  export_excel: { en: "Export to Excel", ar: "تصدير إلى إكسل" },

  change_image: {en: "Change Profile Image", ar: "تغير الصوره"},

  // Login Page Translations
  login_system_title: {
    en: "QA Test Suite Manager",
    ar: "نظام إدارة اختبارات الجودة",
  },
  login_system_subtitle: {
    en: "Quality Assurance Management Portal",
    ar: "بوابة إدارة وضمان جودة البرمجيات",
  },
  login_email_label: {
    en: "Email Address",
    ar: "البريد الإلكتروني",
  },
  login_email_placeholder: {
    en: "Enter your official email (e.g. h.ali@mcit.gov.eg)",
    ar: "البريد الإلكتروني (مثال: h.ali@mcit.gov.eg)",
  },
  login_password_label: {
    en: "Password",
    ar: "كلمة المرور",
  },
  login_password_placeholder: {
    en: "Enter your password",
    ar: "كلمة المرور",
  },
  login_btn: {
    en: "Sign In",
    ar: "تسجيل الدخول",
  },
  login_loading: {
    en: "Signing in...",
    ar: "جاري تسجيل الدخول...",
  },
  login_success: {
    en: "Logged in successfully",
    ar: "تم تسجيل الدخول بنجاح",
  },
  login_show_password: {
    en: "Show password",
    ar: "إظهار كلمة المرور",
  },
  login_hide_password: {
    en: "Hide password",
    ar: "إخفاء كلمة المرور",
  },

  // Header
  digital_transformation: { en: "DIGITAL TRANSFORMATION", ar: "التحول الرقمي" },
  user_name: { en: "Karim Mansour", ar: "كريم منصور" },
  user_role: { en: "Senior QA Lead", ar: "قائد اختبارات الجودة" },

  // Dashboard Hero
  cairo_sync: { en: "• Cairo Sync Zone", ar: "• منطقة مزامنة القاهرة" },
  dashboard_title: { en: "Test Execution Dashboard", ar: "لوحة تنفيذ اختبارات الجودة" },
  dashboard_subtitle: {
    en: "Overview of test automation, manual runs, and defect status for Egypt Digital Platform",
    ar: "نظرة عامة على أتمتة الاختبارات، والتشغيل اليدوي، ومؤشرات الأخطاء لمنصة مصر الرقمية",
  },

  error_email_regex: {
  en: "Please use the official ministry email (@mcit.gov.eg)",
  ar: "يجب استخدام البريد الإلكتروني الرسمي التابع للوزارة (@mcit.gov.eg)",
},
error_password_regex: {
  en: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
  ar: "يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.",
},

  
  sprint_filter: { en: "Sprint 14 | Last 30 Days", ar: "سبرنت 14 | آخر 30 يوماً" },
  trigger_run: { en: "Trigger Run", ar: "تشغيل فوري" },
  new_test_case: { en: " New Test Case", ar: "حالة اختبار جديدة" },

  // Metric Cards
  total_tests: { en: "Total Tests", ar: "إجمالي الاختبارات" },
  from_last_cycle: { en: "from last cycle", ar: "عن الدورة السابقة" },
  pass_rate: { en: "Pass Rate", ar: "نسبة النجاح" },
  goal_rate: { en: "Goal: 85%", ar: "الهدف: 85%" },

  // Analytics
  trend_title: { en: "Test Execution Trend", ar: "مسار تنفيذ الاختبارات" },
  trend_subtitle: {
    en: "Stacked test results daily progression (Past 14 Days)",
    ar: "التطور اليومي التراكمي لنتائج الاختبارات (آخر 14 يوماً)",
  },
  ci_footer: {
    en: "Automated Nightly CI Suite ran 48m ago on GitHub Actions",
    ar: "اكتمل تشغيل CI الليلي التلقائي قبل 48 دقيقة على GitHub Actions",
  },
  mean_runtime: { en: "Mean Run Time: 14m 28s", ar: "متوسط وقت التشغيل: 14د 28ث" },
  today: { en: "Today", ar: "اليوم" },

  // Defect Severity
  defect_title: { en: "Defect Severity", ar: "تصنيف خطورة العيوب" },
  defect_subtitle: {
    en: "Weighted severity distribution & resolution rate",
    ar: "توزيع الخطورة النسبي ومعدلات الحل",
  },
  open_defects: { en: "145 Open", ar: "145 مفتوح" },
  critical: { en: "Critical", ar: "حرجة" },
  high: { en: "High", ar: "عالية" },
  medium: { en: "Medium", ar: "متوسطة" },
  low: { en: "Low", ar: "منخفضة" },
  explore_jira: { en: "Explore Jira / GitHub Defect Matrix", ar: "استعراض مصفوفة العيوب على Jira / GitHub" },

  // Table
  search_placeholder: {
    en: "Search scenarios, IDs, tags...",
    ar: "البحث في السيناريوهات، المعرفات، الوسوم...",
  },
  all_modules: { en: "All Modules", ar: "جميع الوحدات" },
  module_auth: { en: "Authentication", ar: "المصادقة" },
  module_payments: { en: "Payments", ar: "المدفوعات" },
  module_civil: { en: "Civil Registry", ar: "السجل المدني" },
  module_profile: { en: "Profile", ar: "الملف الشخصي" },
  view_all: { en: "View All (1,420)", ar: "عرض الكل (1,420)" },
  col_id: { en: "TC ID", ar: "معرف الحالة" },
  col_module: { en: "Module", ar: "الوحدة" },
  col_scenario: { en: "Scenario Title", ar: "عنوان السيناريو" },
  col_priority: { en: "Priority", ar: "الأولوية" },
  col_status: { en: "Status", ar: "الحالة" },
  col_tester: { en: "Tester", ar: "المختبر" },
  col_executed: { en: "Executed", ar: "تاريخ التنفيذ" },
  col_actions: { en: "Actions", ar: "الإجراءات" },

  // Pagination
  showing_text: {
    en: "Showing 1 to 5 of 1,420 test cases",
    ar: "عرض 1 إلى 5 من أصل 1,420 حالة اختبار",
  },
  prev: { en: "Previous", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },

  // User Dropdown Menu
  user_profile: { en: "Profile", ar: "الملف الشخصي" },
  change_password: { en: "Change Password", ar: "تغيير كلمة المرور" },
  change_photo: { en: "Change Photo", ar: "تغيير الصورة" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },

  // Change Password Page
  cp_title: { en: "Change Password", ar: "تغيير كلمة المرور" },
  cp_subtitle: { en: "Update your account password", ar: "تحديث كلمة مرور حسابك" },
  cp_current_password: { en: "Current Password", ar: "كلمة المرور الحالية" },
  cp_current_password_placeholder: { en: "Enter current password", ar: "أدخل كلمة المرور الحالية" },
  cp_new_password: { en: "New Password", ar: "كلمة المرور الجديدة" },
  cp_new_password_placeholder: { en: "Enter new password", ar: "أدخل كلمة المرور الجديدة" },
  cp_confirm_password: { en: "Confirm New Password", ar: "تأكيد كلمة المرور الجديدة" },
  cp_confirm_password_placeholder: { en: "Re-enter new password", ar: "أعد إدخال كلمة المرور الجديدة" },
  cp_submit: { en: "Update Password", ar: "تحديث كلمة المرور" },
  cp_submitting: { en: "Updating...", ar: "جاري التحديث..." },
  cp_success: { en: "Password changed successfully", ar: "تم تغيير كلمة المرور بنجاح" },
  cp_back: { en: "Back to Dashboard", ar: "العودة للوحة المؤشرات" },

  // Forgot Password
  login_forgot_password: { en: "Forgot Password?", ar: "نسيت كلمة المرور؟" },
  fp_title: { en: "Forgot Password", ar: "استعادة كلمة المرور" },
  fp_subtitle: {
    en: "Enter your email address to get verification code",
    ar: "أدخل بريدك الإلكتروني للحصول على كود التحقق",
  },
  fp_email_label: { en: "Email Address", ar: "البريد الإلكتروني" },
  fp_email_placeholder: {
    en: "Enter your email (e.g. user@mcit.gov.eg)",
    ar: "أدخل البريد الإلكتروني (مثال: user@mcit.gov.eg)",
  },
  fp_submit_btn: { en: "Get Verified Code", ar: "Get Verified Code" },
  fp_back_to_login: { en: "Back to Sign In", ar: "العودة لتسجيل الدخول" },

  // Users & Permissions Management
  users_management_title: { en: "Users & Permissions", ar: "إدارة المستخدمين والصلاحيات" },
  users_management_subtitle: {
    en: "View system users, inspect permissions matrix, and manage accounts securely.",
    ar: "عرض جميع مستخدمي النظام ومصفوفة الصلاحيات مع إمكانية إدارة الحسابات بأمان.",
  },
  users_add_button: { en: "Add New User", ar: "إضافة مستخدم جديد" },
  users_total_count: { en: "Total Users", ar: "إجمالي المستخدمين" },
  users_admins_count: { en: "System Admins", ar: "مديرو النظام" },
  users_testers_count: { en: "QA Testers", ar: "مختبرو الجودة" },
  users_standard_count: { en: "Standard Users", ar: "مستخدمون عاديون" },
  users_col_id: { en: "Employee ID", ar: "الرقم الوظيفي" },
  users_col_user: { en: "User", ar: "المستخدم" },
  users_col_role: { en: "Role & Level", ar: "الصلاحية والمستوى" },
  users_col_projects: { en: "Assigned Projects", ar: "المشاريع المسندة" },
  users_col_testcases: { en: "Test Cases", ar: "حالات الاختبار" },
  users_col_joined: { en: "Joined Date", ar: "تاريخ الانضمام" },
  users_col_actions: { en: "Actions", ar: "الإجراءات" },
  users_role_admin: { en: "System Administrator", ar: "مدير نظام" },
  users_role_tester: { en: "QA Tester", ar: "مختبر جودة" },
  users_role_user: { en: "Standard User", ar: "مستخدم عادي" },
  users_role_admin_badge: { en: "Admin", ar: "مسؤول نظام" },
  users_role_tester_badge: { en: "QA Tester", ar: "فاحص جودة" },
  users_role_user_badge: { en: "User", ar: "مستخدم" },
  users_delete_tooltip_admin: {
    en: "Admin accounts are protected and cannot be deleted per security policy",
    ar: "حسابات مديري النظام محميّة بالكامل ولا يمكن حذفها نهائياً وفق سياسة الأمان",
  },
  users_delete_btn: { en: "Delete", ar: "حذف" },
  users_delete_confirm_title: { en: "Confirm User Deletion", ar: "تأكيد حذف المستخدم" },
  users_delete_confirm_desc: {
    en: "Are you sure you want to permanently delete this user account?",
    ar: "هل أنت متأكد من رغبتك في حذف حساب هذا المستخدم نهائياً؟",
  },
  users_delete_cannot_undo: {
    en: "This action cannot be undone. Associated test runs will be unassigned.",
    ar: "هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم فك ارتباط المهام المسندة إليه.",
  },
  users_delete_admin_forbidden: {
    en: "Admin accounts cannot be deleted under any circumstances.",
    ar: "غير مسموح نهائياً بحذف حسابات مديري النظام (Admin). الصلاحية متاحة على المستخدمين فقط.",
  },
  users_cancel: { en: "Cancel", ar: "إلغاء" },
  users_confirm_delete: { en: "Delete Account", ar: "تأكيد الحذف" },
  users_search_placeholder: {
    en: "Search by name, email, or employee ID...",
    ar: "البحث بالاسم أو البريد الإلكتروني أو الرقم الوظيفي...",
  },
  users_filter_all: { en: "All Roles", ar: "جميع الصلاحيات" },
  users_empty_search: {
    en: "No users found matching your search.",
    ar: "لم يتم العثور على مستخدمين يطابقون معايير البحث.",
  },
  users_permissions_matrix: { en: "Permissions Matrix", ar: "مصفوفة الصلاحيات" },
  users_admin_perm_desc: {
    en: "Full access to test suites, project management, and user creation.",
    ar: "تحكم كامل بالنظام، إضافة مستخدمين، تعيين مشاريع، وحذف الحسابات العادية فقط.",
  },
  users_tester_perm_desc: {
    en: "Execute test cases, report defects, and update execution statuses.",
    ar: "تنفيذ حالات الاختبار، إدخال العيوب، وتحديث مؤشرات الجودة للمشاريع المسندة.",
  },
  users_user_perm_desc: {
    en: "View dashboards, browse test suites, and export summary reports.",
    ar: "استعراض لوحات المؤشرات والتقارير وحالات الاختبار بوضع القراءة فقط.",
  },
  users_delete_success: {
    en: "User deleted successfully",
    ar: "تم حذف المستخدم بنجاح من النظام",
  },
  users_admin_nav: {
    en: "Users & Permissions",
    ar: "المستخدمين والصلاحيات",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLang = "ar",
}: {
  children: React.ReactNode;
  initialLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(initialLang);

  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? (match[2] as Language) : null;
    };

    const cookieLang = getCookie("qa_lang");
    const localLang = localStorage.getItem("qa_lang") as Language;
    const current = cookieLang || localLang || initialLang;

    if (current === "ar" || current === "en") {
      setLangState(current);
      document.documentElement.lang = current;
      document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
      localStorage.setItem("qa_lang", current);
      document.cookie = `qa_lang=${current}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [initialLang]);

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("qa_lang", newLang);
    document.cookie = `qa_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const toggleLanguage = () => {
    setLanguage(lang === "en" ? "ar" : "en");
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir: lang === "ar" ? "rtl" : "ltr",
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
