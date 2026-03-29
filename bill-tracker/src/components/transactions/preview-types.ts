import type { ApprovalStatus } from "@prisma/client";

export type PreviewTransactionType = "expense" | "income";

export interface TransactionPreviewData {
  id: string;
  description?: string | null;
  billDate?: string | null;
  netPaid?: number | bigint | null;
  amount?: number | bigint | null;
  vatAmount?: number | bigint | null;
  isWht?: boolean;
  whtRate?: number | null;
  whtAmount?: number | bigint | null;
  taxInvoiceUrls?: string[];
  slipUrls?: string[];
  whtCertUrls?: string[];
  otherDocUrls?: string[];
  source?: string | null;
  receiveDate?: string | null;
  netReceived?: number | bigint | null;
  isWhtDeducted?: boolean;
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  notes?: string | null;
  invoiceNumber?: string | null;
  referenceNo?: string | null;
  status?: string;
  workflowStatus?: string;
  approvalStatus?: ApprovalStatus | null;
  documentType?: string | null;
  Contact?: { id: string; name: string } | null;
  contactName?: string | null;
  Account?: { id: string; code: string; name: string } | null;
  Company?: { id: string; name: string; code: string } | null;
  creator?: { id: string; name: string; email: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TransactionPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  transactionType: PreviewTransactionType;
  companyCode: string;
}
