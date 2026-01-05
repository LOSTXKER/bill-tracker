import { z } from "zod";
import {
  baseTransactionSchema,
  whtFieldsSchema,
  paymentMethodSchema,
} from "./shared";

// Base schema without refinements (for partial/extend operations)
const expenseBaseSchema = baseTransactionSchema.extend({
  // Expense-specific: Override vatRate default
  vatRate: z.number().min(0).max(100).default(7),
  
  // WHT (we withhold tax from vendor)
  isWht: z.boolean().default(false),
  ...whtFieldsSchema.shape,
  
  // Expense-specific details
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

/**
 * DEPRECATED: Category labels for old enum-based categories
 * Use Category model with categoryId instead
 * Kept for backward compatibility only
 */
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
