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
    }).regex(/^TC-[0-9]{4}$/, {
      message: isArabic ? "يجب أن يكون المعرف بالصيغة TC-XXXX (مثل TC-0001)" : "ID must be in TC-XXXX format (e.g. TC-0001)",
    }),

    module: z.string().min(1, {
      message: isArabic
        ? "يرجى اختيار المشروع"
        : "Please select a project",
    }),

    pageName: z.string().min(1, {
      message: isArabic ? "اسم الصفحة مطلوب" : "Page Name is required",
    }),

    scenario: z.string().min(1, {
      message: isArabic ? "سيناريو الاختبار مطلوب" : "Scenario is required",
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
