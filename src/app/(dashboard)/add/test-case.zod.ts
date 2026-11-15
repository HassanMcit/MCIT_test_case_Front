import { z } from "zod";

export type Language = "ar" | "en";

/**
 * دالة لتوليد Zod Schema لحالة الاختبار مع رسائل خطأ مترجمة بناءً على اللغة
 * @param lang "ar" للغة العربية أو "en" للغة الإنجليزية (أو boolean لـ isRTL)
 */
export const getTestCaseSchema = (lang: Language | boolean = "ar") => {
  const isArabic = lang === "ar" || lang === true;

  return z.object({
    testId: z.string().min(1, {
      message: isArabic ? "معرّف حالة الاختبار مطلوب" : "Test ID is required",
    }).regex(/^(TC|BUG)-[0-9]{4,}$/, {
      message: isArabic ? "يجب أن يكون المعرف بالصيغة TC-XXXX أو BUG-XXXX" : "ID must be in TC-XXXX or BUG-XXXX format",
    }),

    module: z
      .string()
      .trim()
      .min(2, {
        message: isArabic
          ? "اسم الوحدة / التطبيق يجب ألا يقل عن حرفين"
          : "Application / Module must be at least 2 characters",
      })
      .max(200, {
        message: isArabic
          ? "اسم الوحدة / التطبيق يجب ألا يتجاوز 200 حرف"
          : "Application / Module cannot exceed 200 characters",
      })
      .regex(/^[\p{L}\p{N}\s\-_.,()&/:'"+–—]{2,200}$/u, {
        message: isArabic
          ? "اسم الوحدة / التطبيق يحتوي على رموز غير مسموح بها"
          : "Application / Module contains unsupported characters",
      }),

    pageName: z.string().min(1, {
      message: isArabic ? "اسم الصفحة مطلوب" : "Page Name is required",
    }),

    scenario: z
      .string()
      .trim()
      .min(5, {
        message: isArabic
          ? "سيناريو الاختبار يجب ألا يقل عن 5 أحرف"
          : "Scenario must be at least 5 characters",
      }),

    preConditions: z.string().optional(),

    steps: z
      .array(z.string())
      .min(1, {
        message: isArabic
          ? "يجب إدخال خطوة اختبار واحدة على الأقل"
          : "At least one step is required",
      }),

    expectedResult: z.string().min(1, {
      message: isArabic ? "النتيجة المتوقعة مطلوبة" : "Expected Result is required",
    }),

    actualResult: z.string().optional(),

    priority: z.enum(["low", "medium", "high", "critical"] as const, {
      message: isArabic ? "يرجى اختيار أولوية الاختبار" : "Please select priority",
    }),

    status: z
      .enum(["pending", "passed", "failed", "skipped", "blocked"] as const, {
        message: isArabic ? "حالة الاختبار غير صالحة" : "Invalid status value",
      })
      .default("pending"),

    severity: z
      .enum(["low", "medium", "high", "critical"] as const, {
        message: isArabic ? "يرجى اختيار درجة الخطورة" : "Please select severity",
      })
      .optional(),

    notes: z.string().optional(),

    executedAt: z
      .string()
      .datetime({
        message: isArabic
          ? "تاريخ التنفيذ غير صالح (ISO 8601)"
          : "Invalid execution date format",
      })
      .optional()
      .or(z.literal("")),

    testerId: z
      .number({
        message: isArabic ? "معرّف المختبر مطلوب" : "Tester ID is required",
      })
      .int(
        isArabic ? "معرّف المختبر يجب أن يكون رقماً صحيحاً" : "Tester ID must be an integer"
      )
      .positive(
        isArabic ? "معرّف المختبر يجب أن يكون رقماً موجباً" : "Tester ID must be positive"
      )
      .optional(),

    userId: z
      .number({
        message: isArabic ? "معرّف المستخدم مطلوب" : "User ID is required",
      })
      .int(
        isArabic ? "معرّف المستخدم يجب أن يكون رقماً صحيحاً" : "User ID must be an integer"
      )
      .positive(
        isArabic ? "معرّف المستخدم يجب أن يكون رقماً موجباً" : "User ID must be positive"
      )
      .optional(),

    projectId: z
      .number({
        message: isArabic ? "يرجى اختيار المشروع" : "Project is required",
      })
      .int(
        isArabic ? "معرّف المشروع يجب أن يكون رقماً صحيحاً" : "Project ID must be an integer"
      )
      .positive(
        isArabic ? "معرّف المشروع يجب أن يكون رقماً موجباً" : "Project ID must be positive"
      ),
  });
};

// الـ Schemas الجاهزة للاستخدام
export const TestCaseSchemaAr = getTestCaseSchema("ar");
export const TestCaseSchemaEn = getTestCaseSchema("en");

// Schema الافتراضية
export const TestCaseSchema = getTestCaseSchema("ar");
