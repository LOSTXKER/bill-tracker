export type ReimbursementStatus = 
  | "PENDING" 
  | "FLAGGED" 
  | "APPROVED" 
  | "REJECTED" 
  | "PAID";

export interface ReimbursementRequester {
  id: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface ReimbursementAccount {
  id: string;
  code: string;
  name: string;
}

export interface ReimbursementContact {
  id: string;
  name: string;
}

export interface BankInfo {
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

export interface ReimbursementApprover {
  id: string;
  name: string;
  email?: string;
}

export interface FraudFlag {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface Reimbursement {
  id: string;
  description: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  netAmount: number;
  billDate: string;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  status: ReimbursementStatus;
  fraudScore: number | null;
  fraudFlags: FraudFlag[];
  createdAt: string;
  updatedAt: string;
  
  // Requester info (anonymous)
  requester: ReimbursementRequester | null;
  bankInfo?: BankInfo;
  trackingCode?: string;
  
  // Relations
  account: ReimbursementAccount | null;
  contact: ReimbursementContact | null;
  
  // Rejection
  rejectedReason: string | null;
  rejectedAt: string | null;
  rejectedBy: ReimbursementApprover | null;
  
  // Approval
  approvedAt: string | null;
  approvedBy: ReimbursementApprover | null;
  
  // Payment
  paidAt: string | null;
  paidBy: ReimbursementApprover | null;
  paymentRef: string | null;
  
  // Files
  receiptUrls: string[];
  
  // Linked expense (when expense is created from this reimbursement)
  linkedExpense?: { id: string; status: string } | null;
}

export interface ReimbursementSummary {
  pendingApproval: { count: number; amount: number };
  flagged: { count: number; amount: number };
  pendingPayment: { count: number; amount: number };
  paid: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

export type ReimbursementTab = "all" | "pending" | "approved" | "completed";

export interface ReimbursementFilters {
  tab: ReimbursementTab;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  accountId?: string;
}

export interface ReimbursementActionParams {
  id: string;
  reason?: string;
  paymentRef?: string;
  paymentMethod?: string;
}

// API response types
export interface ReimbursementListResponse {
  requests: Reimbursement[];
  total: number;
}

export interface ReimbursementSummaryResponse {
  summary: ReimbursementSummary;
}

export interface ReimbursementDetailResponse {
  request: Reimbursement;
}

// Helper function to get status config
export const getStatusConfig = (status: ReimbursementStatus) => {
  const configs = {
    PENDING: {
      label: "รออนุมัติ",
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      badgeVariant: "default" as const,
    },
    FLAGGED: {
      label: "AI พบปัญหา",
      color: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      badgeVariant: "destructive" as const,
    },
    APPROVED: {
      label: "รอจ่ายเงิน",
      color: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      badgeVariant: "default" as const,
    },
    REJECTED: {
      label: "ถูกปฏิเสธ",
      color: "text-gray-700 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      badgeVariant: "secondary" as const,
    },
    PAID: {
      label: "จ่ายแล้ว",
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      badgeVariant: "default" as const,
    },
  };
  
  return configs[status] || configs.PENDING;
};

// Helper to get fraud score color
export const getFraudScoreColor = (score: number | null): string => {
  if (score === null) return "text-gray-500";
  if (score < 30) return "text-emerald-600";
  if (score < 60) return "text-amber-600";
  return "text-red-600";
};

// Filter reimbursements by tab
export const filterByTab = (
  reimbursements: Reimbursement[],
  tab: ReimbursementTab
): Reimbursement[] => {
  switch (tab) {
    case "pending":
      return reimbursements.filter(
        (r) => r.status === "PENDING" || r.status === "FLAGGED"
      );
    case "approved":
      return reimbursements.filter((r) => r.status === "APPROVED");
    case "completed":
      return reimbursements.filter(
        (r) => r.status === "PAID" || r.status === "REJECTED"
      );
    case "all":
    default:
      return reimbursements;
  }
};
