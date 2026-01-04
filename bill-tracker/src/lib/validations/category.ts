import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "ชื่อหมวดหมู่ต้องไม่ว่าง").max(50, "ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร"),
  type: z.enum(["EXPENSE", "INCOME"], {
    message: "กรุณาเลือกประเภทหมวดหมู่",
  }),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "รหัสสีไม่ถูกต้อง").optional().nullable(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().cuid(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
