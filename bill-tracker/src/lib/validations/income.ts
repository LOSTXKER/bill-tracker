import { z } from "zod";

// Base schema without refinements (for partial/extend operations)
const incomeBaseSchema = z.object({
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  
  // Customer
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerTaxId: z.string().optional(),
  
  // Financial
  amount: z
    .number()
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(999999999.99, "จำนวนเงินมากเกินไป"),
  vatRate: z.number().min(0).max(100).default(0),
  
  // WHT (โดนหัก)
  isWhtDeducted: z.boolean().default(false),
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
  source: z.string().max(200).optional(),
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
  receiveDate: z.coerce.date(),
  
  // Status
  status: z.enum([
    "NO_DOC_REQUIRED",
    "WAITING_ISSUE",
    "WAITING_WHT_CERT",
    "PENDING_COPY_SEND",
    "SENT_COPY",
  ]).default("PENDING_COPY_SEND"),
  
  notes: z.string().max(1000).optional(),
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
