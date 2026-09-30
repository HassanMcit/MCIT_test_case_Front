import * as zod from "zod";

type TranslationFn = (key: string) => string;
type Language = "ar" | "en";

const translations: Record<string, Record<Language, string>> = {
  error_id_required: {
    ar: "الرقم الوظيفي مطلوب",
    en: "Employee ID is required",
  },
  error_id_invalid: {
    ar: "الرقم الوظيفي يجب أن يحتوي على أرقام فقط (مثال: 4019)",
    en: "Employee ID must contain digits only (e.g. 4019)",
  },
  error_name_required: {
    ar: "الاسم مطلوب",
    en: "Name is required",
  },
  error_name_min: {
    ar: "الاسم يجب ألا يقل عن 3 أحرف",
    en: "Name must be at least 3 characters",
  },
  error_email_required: {
    ar: "البريد الإلكتروني مطلوب",
    en: "Email is required",
  },
  error_email_regex: {
    ar: "يجب استخدام البريد الإلكتروني الرسمي التابع للوزارة (@mcit.gov.eg)",
    en: "Please use the official ministry email (@mcit.gov.eg)",
  },
  error_password_required: {
    ar: "كلمة المرور مطلوبة",
    en: "Password is required",
  },
  error_password_regex: {
    ar: "يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.",
    en: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
  },
  error_role_invalid: {
    ar: "نوع الصلاحية غير صالح",
    en: "Invalid role selection",
  },
};

function getCurrentLang(): Language {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^| )qa_lang=([^;]+)/);
    if (match && (match[1] === "ar" || match[1] === "en")) {
      return match[1] as Language;
    }
    const local = localStorage.getItem("qa_lang");
    if (local === "ar" || local === "en") {
      return local;
    }
  }
  return "ar";
}

function resolveMessage(
  key: string,
  t?: TranslationFn | Language
): string {
  const currentLang = typeof t === "string" ? t : getCurrentLang();

  if (typeof t === "function") {
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }

  return translations[key]?.[currentLang] || translations[key]?.ar || key;
}

export const getAddUserSchema = (t?: TranslationFn | Language) =>
  zod.object({
    id: zod
      .string(resolveMessage("error_id_required", t))
      .trim()
      .min(1, resolveMessage("error_id_required", t))
      .regex(/^\d+$/, resolveMessage("error_id_invalid", t)),

    
    name: zod
      .string(resolveMessage("error_name_required", t))
      .trim()
      .min(3, resolveMessage("error_name_min", t)),

    email: zod
      .string(resolveMessage("error_email_required", t))
      .regex(
        /^[a-zA-Z0-9._%+-]+@mcit\.gov\.eg$/,
        resolveMessage("error_email_regex", t)
      ),

    password: zod
      .string(resolveMessage("error_password_required", t))
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        resolveMessage("error_password_regex", t)
      ),

    role: zod.enum(["user", "admin", "tester"], {
      message: resolveMessage("error_role_invalid", t),
    }),
  });

const defaultAddUserSchema = getAddUserSchema();

export type AddUserSchemaType = typeof defaultAddUserSchema;

export interface AddUserSchemaFn {
  (t?: TranslationFn | Language): AddUserSchemaType;
}

export const addUserSchema = Object.assign(
  (t?: TranslationFn | Language) => getAddUserSchema(t),
  defaultAddUserSchema
) as AddUserSchemaFn & AddUserSchemaType;
