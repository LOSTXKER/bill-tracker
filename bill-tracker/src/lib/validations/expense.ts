import { z } from "zod";

// Base schema without refinements (for partial/extend operations)
const expenseBaseSchema = z.object({
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  
  // Contact (ผู้ติดต่อ - ผู้ขาย/ร้านค้า)
  contactId: z.string().optional().nullable(),
  
  // Financial
  amount: z
    .number()
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(999999999.99, "จำนวนเงินมากเกินไป"),
  vatRate: z.number().min(0).max(100).default(7),
  
  // WHT
  isWht: z.boolean().default(false),
  whtRate: z.number().min(0).max(100).optional(),
  whtType: z.enum([
    "SERVICE_3",
    "PROFESSIONAL_5",
    "TRANSPORT_1",
    "RENT_5",
    "ADVERTISING_2",
    "OTHER",
  ]).optional(),
  
  // Details
  description: z.string().max(500).optional(),
  category: z.enum([
    "MATERIAL",
    "UTILITY",
    "MARKETING",
    "SALARY",
    "FREELANCE",
    "TRANSPORT",
    "RENT",
    "OFFICE",
    "OTHER",
  ]).optional(), // DEPRECATED: kept for backward compatibility
  categoryId: z.string().optional().nullable(),
  invoiceNumber: z.string().max(50).optional(),
  referenceNo: z.string().max(50).optional(),
  paymentMethod: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "CREDIT_CARD",
    "PROMPTPAY",
    "CHEQUE",
  ]).default("BANK_TRANSFER"),
  
  // Dates
  billDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  
  // Status
  status: z.enum([
    "WAITING_FOR_DOC",
    "PENDING_PHYSICAL",
    "READY_TO_SEND",
    "SENT_TO_ACCOUNT",
  ]).default("PENDING_PHYSICAL"),
  
  notes: z.string().max(1000).optional(),
});

// Full schema with refinements
export const expenseSchema = expenseBaseSchema.refine(
  (data) => {
    // If WHT is enabled, rate and type are required
    if (data.isWht) {
      return data.whtRate !== undefined && data.whtRate > 0;
    }
    return true;
  },
  {
    message: "กรุณาระบุอัตราหัก ณ ที่จ่าย",
    path: ["whtRate"],
  }
);

// Update schema from base (without refinements to allow partial)
export const expenseUpdateSchema = expenseBaseSchema.partial().extend({
  id: z.string().min(1),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

// Category labels in Thai
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "วัตถุดิบ",
  UTILITY: "สาธารณูปโภค",
  MARKETING: "การตลาด",
  SALARY: "เงินเดือน",
  FREELANCE: "ค่าจ้างฟรีแลนซ์",
  TRANSPORT: "ค่าขนส่ง",
  RENT: "ค่าเช่า",
  OFFICE: "สำนักงาน",
  OTHER: "อื่นๆ",
};

// Status labels in Thai
export const EXPENSE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WAITING_FOR_DOC: { label: "รอใบเสร็จ", color: "orange" },
  PENDING_PHYSICAL: { label: "รอส่งบัญชี", color: "red" },
  READY_TO_SEND: { label: "พร้อมส่ง", color: "yellow" },
  SENT_TO_ACCOUNT: { label: "ส่งแล้ว", color: "green" },
};
