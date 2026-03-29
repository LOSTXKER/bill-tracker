export interface BaseTransaction {
  id: string;
  companyId: string;
  contact: { id: string; name: string; taxId: string | null } | null;
  account?: { id: string; code: string; name: string } | null;
  accountId?: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  paymentMethod: string;
  status: string;
  notes: string | null;
  invoiceNumber: string | null;
  referenceNo: string | null;
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedByUser?: { name: string } | null;
  workflowStatus?: string;
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  hasInvoice?: boolean;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  approvalStatus?: string;
  rejectedReason?: string | null;
  submittedAt?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  [key: string]: unknown;
}

export interface AccountSuggestion {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  confidence: number;
  reason: string;
  alternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;
}

export interface AiVendorSuggestion {
  name: string;
  taxId?: string | null;
  branchNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}
