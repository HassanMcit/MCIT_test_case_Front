import { z } from "zod";
import { cairoInputToUtc } from "@/lib/project-time";

const projectApiFields = z.object({
  name: z.string().min(2).max(200),
  description: z.string(),
  application: z.string().optional(),
  environment: z.enum(["production", "staging"]),
  status: z.enum(["active", "archived"]),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  assignedTesterId: z.number().int().positive().nullable().optional(),
});

function validateApiDates(
  value: { startAt?: string; endAt?: string },
  ctx: z.RefinementCtx,
) {
  if (
    value.startAt &&
    value.endAt &&
    Date.parse(value.startAt) >= Date.parse(value.endAt)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["endAt"],
      message: "End must follow start / النهاية يجب أن تكون بعد البداية",
    });
  }
}

export const createProjectApiSchema =
  projectApiFields.superRefine(validateApiDates);
export const updateProjectApiSchema = projectApiFields
  .partial()
  .superRefine(validateApiDates);

export const projectScheduleSchema = z
  .object({
    startAt: z
      .string()
      .refine((v) => cairoInputToUtc(v) !== null, "proj_invalid_time"),
    endAt: z
      .string()
      .refine((v) => cairoInputToUtc(v) !== null, "proj_invalid_time"),
    assignedTesterId: z
      .string()
      .refine((v) => v === "" || /^[1-9]\d*$/.test(v), "proj_invalid_tester"),
  })
  .superRefine((value, ctx) => {
    const start = cairoInputToUtc(value.startAt),
      end = cairoInputToUtc(value.endAt);
    if (start && end && start >= end)
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "proj_time_order",
      });
  });

export const projectScheduleMessages: Record<
  string,
  { ar: string; en: string }
> = {
  proj_invalid_time: {
    ar: "اختر تاريخاً ووقتاً صحيحين بتوقيت القاهرة. تجنب الساعة المتكررة أو المفقودة عند تغيير التوقيت الصيفي.",
    en: "Choose a valid Cairo date and time. Avoid repeated or missing hours at daylight-saving transitions.",
  },
  proj_time_order: {
    ar: "يجب أن يكون وقت النهاية بعد وقت البداية.",
    en: "End date and time must be after start date and time.",
  },
  proj_invalid_tester: {
    ar: "اختر مختبراً من القائمة أو اتركه بدون إسناد.",
    en: "Select a tester from the list or leave unassigned.",
  },
};
