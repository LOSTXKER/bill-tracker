/**
 * 🧠 AI Analysis Types
 * Type definitions สำหรับระบบ AI วิเคราะห์เอกสาร
 */

export type DocumentCategory = "invoice" | "slip" | "whtCert" | "unknown";

// =============================================================================
// Receipt Analysis Types (from analyze-receipt.ts)
// =============================================================================

export interface ReceiptAnalysisInput {
  imageUrls: string[];
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
}

export interface AnalyzedVendor {
  name: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  branchNumber: string | null;
  matchedContactId: string | null;
  matchedContactName: string | null;
}

export interface AnalyzedAccount {
  id: string | null;
  code: string | null;
  name: string | null;
  confidence?: number;
  reason?: string;
}

export interface AnalyzedWHT {
  rate: number | null;
  amount: number | null;
  type: string | null;
}

export interface ConfidenceScores {
  overall: number;
  vendor: number;
  amount: number;
  date: number;
  account: number;
}

/**
 * Warning จาก AI Analysis
 */
export interface AnalysisWarning {
  type: "multiple_invoices" | "multiple_slips" | "amount_mismatch" | "vendor_mismatch" | "info";
  message: string;
  severity: "warning" | "info" | "error";
}

/**
 * Account Alternative - ทางเลือกบัญชีอื่น (Internal use - analyze-receipt.ts)
 * Note: ใช้ id/code/name เพื่อให้สอดคล้องกับ AnalyzedAccount
 */
export interface AccountAlternative {
  id: string;
  code: string;
  name: string;
  confidence: number;
  reason: string;
}

/**
 * Account Alternative - API Response Format (for frontend)
 * Note: API transforms id/code/name to accountId/accountCode/accountName
 */
export interface AccountAlternativeResponse {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
  reason: string;
}

export interface ReceiptAnalysisResult {
  vendor: AnalyzedVendor;
  date: string | null;
  amount: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  wht: AnalyzedWHT;
  netAmount: number | null;
  account: AnalyzedAccount;
  accountAlternatives: AccountAlternative[];
  documentType: string | null;
  invoiceNumber: string | null;
  items: string[];
  confidence: ConfidenceScores;
  description: string | null;
  warnings: AnalysisWarning[];
  rawText?: string;
}

/**
 * ผลลัพธ์จาก AI วิเคราะห์เอกสาร
 */
export interface MultiDocAnalysisResult {
  // ข้อมูลรวมจากเอกสาร
  combined: {
    vendorName: string | null;
    vendorTaxId: string | null;
    vendorBranchNumber: string | null;
    vendorEmail?: string | null;
    vendorAddress?: string | null;
    vendorPhone?: string | null;
    totalAmount?: number | null;
    amount?: number | null;
    vatAmount?: number | null;
    vatRate?: number | null;
    whtRate: number | null;
    whtAmount: number | null;
    whtType: string | null;
    netAmount: number | null;
    date: string | null;
    dueDate?: string | null;
    invoiceNumbers?: string[];
    invoiceNumber?: string | null;
    documentType: string | null;
    description?: string | null;
    items?: string[];
  };

  // ค่าที่แนะนำ
  suggested: {
    accountId: string | null;
    accountCode?: string | null;
    accountName?: string | null;
    contactId: string | null;
    contactName?: string | null;
    vatRate?: number | null;
    whtRate?: number | null;
    whtAmount?: number | null;
    whtType?: string | null;
  };

  // Confidence scores
  confidence: {
    overall: number;
    vendor: number;
    amount: number;
    date: number;
    account: number;
  };

  // File assignments
  fileAssignments: Record<string, string>;

  // Original files analyzed
  files?: Array<{
    url: string;
    category: DocumentCategory;
    confidence: number;
    extracted?: {
      items?: Array<{ description: string } | string>;
      [key: string]: unknown;
    };
  }>;

  // Smart matching info
  smart: {
    mapping: any | null;
    matchConfidence: number;
    isNewVendor: boolean;
    suggested: {
      accountId: string | null;
      contactId: string | null;
      vatRate?: number | null;
      whtRate?: number | null;
    };
    foundContact?: {
      id: string;
      name: string | null;
    } | null;
  } | null;

  // AI account suggestion (API response format)
  aiAccountSuggestion?: {
    accountId: string | null;
    accountCode: string | null;
    accountName: string | null;
    confidence: number;
    reason: string;
    alternatives?: AccountAlternativeResponse[];
  } | null;

  // Detected transaction type
  detectedTransactionType?: "EXPENSE" | "INCOME" | null;

  // Currency conversion (optional)
  currencyConversion?: {
    detected: boolean;
    currency: string | null;
    originalAmount: number | null;
    convertedAmount: number | null;
    exchangeRate: number | null;
    conversionNote: string | null;
  };

  // Warnings from analysis
  warnings?: AnalysisWarning[];
}
