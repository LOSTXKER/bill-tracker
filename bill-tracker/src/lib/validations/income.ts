import { z } from "zod";
import {
  baseTransactionSchema,
  whtFieldsSchema,
  paymentMethodSchema,
} from "./shared";

// Base schema without refinements (for partial/extend operations)
const incomeBaseSchema = baseTransactionSchema.extend({
  // Income-specific: vatRate defaults to 0
  vatRate: z.number().min(0).max(100).default(0),
  
  // WHT (customer withholds tax from us)
  isWhtDeducted: z.boolean().default(false),
  ...whtFieldsSchema.shape,
  
  // Income-specific details
  source: z.string().min(1, "กรุณาระบุรายละเอียด").max(200),
  
  // Dates
  receiveDate: z.coerce.date(),
  
  // Status
  status: z.enum([
    "NO_DOC_REQUIRED",
    "WAITING_ISSUE",
    "WAITING_WHT_CERT",
    "PENDING_COPY_SEND",
    "SENT_COPY",
  ]).default("PENDING_COPY_SEND"),
});

// Full schema with refinements
export const incomeSchema = incomeBaseSchema.refine(
  (data) => {
    // If WHT deducted is enabled, rate is required
    if (data.isWhtDeducted) {
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
export const incomeUpdateSchema = incomeBaseSchema.partial().extend({
  id: z.string().min(1),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
export type IncomeUpdateInput = z.infer<typeof incomeUpdateSchema>;

// Status labels in Thai
export const INCOME_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NO_DOC_REQUIRED: { label: "ไม่ต้องทำเอกสาร", color: "gray" },
  WAITING_ISSUE: { label: "รอออกบิล", color: "orange" },
  WAITING_WHT_CERT: { label: "รอใบ 50 ทวิ", color: "orange" },
  PENDING_COPY_SEND: { label: "รอส่งสำเนา", color: "red" },
  SENT_COPY: { label: "ส่งแล้ว", color: "green" },
};
