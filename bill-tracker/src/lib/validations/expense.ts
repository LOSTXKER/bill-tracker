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
  description: z.string().min(1, "กรุณาระบุรายละเอียด").max(500),
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

// Status labels in Thai - Re-export from constants for backward compatibility
export { EXPENSE_STATUS_LABELS } from "@/lib/constants/transaction";
