import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อ"),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().nullable().or(z.literal("")),
  bankAccount: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  creditLimit: z.number().optional().nullable(),
  paymentTerms: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const contactCreateSchema = contactSchema.extend({
  companyId: z.string().min(1),
});

export const contactUpdateSchema = contactSchema.partial().extend({
  id: z.string().min(1),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
