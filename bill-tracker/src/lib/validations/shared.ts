import { z } from "zod";

// =============================================================================
// Shared Transaction Validation Schemas
// =============================================================================

/**
 * Common financial fields shared between Expense and Income
 */
export const financialFieldsSchema = z.object({
  amount: z
    .number()
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(999999999.99, "จำนวนเงินมากเกินไป"),
  vatRate: z.number().min(0).max(100),
});

/**
 * WHT (Withholding Tax) fields
 */
export const whtFieldsSchema = z.object({
  whtRate: z.number().min(0).max(100).optional(),
  whtType: z.enum([
    "SERVICE_3",
    "PROFESSIONAL_5",
    "TRANSPORT_1",
    "RENT_5",
    "ADVERTISING_2",
    "OTHER",
  ]).optional(),
});

/**
 * Payment method enum
 */
export const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "PROMPTPAY",
  "CHEQUE",
]);

/**
 * Contact reference (vendor/customer)
 * REQUIRED: All transactions must have a contact
 */
export const contactReferenceSchema = z.object({
  contactId: z.string().min(1, "กรุณาเลือกผู้ติดต่อ"),
});

/**
 * Account reference (Chart of Accounts)
 * OPTIONAL: Transactions can have an account
 */
export const accountReferenceSchema = z.object({
  accountId: z.string().optional(),
});

/**
 * Document references
 */
export const documentFieldsSchema = z.object({
  invoiceNumber: z.string().max(50).optional(),
  referenceNo: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Base transaction schema with common fields
 */
export const baseTransactionSchema = z.object({
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  ...contactReferenceSchema.shape,
  ...financialFieldsSchema.shape,
  ...accountReferenceSchema.shape,
  ...documentFieldsSchema.shape,
  paymentMethod: paymentMethodSchema.default("BANK_TRANSFER"),
});

// WHT_TYPE_LABELS and PAYMENT_METHOD_LABELS are in @/lib/constants/transaction
// (single source of truth - do not duplicate here)

/**
 * Helper type for WHT configuration
 */
export type WhtType = z.infer<typeof whtFieldsSchema.shape.whtType>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
