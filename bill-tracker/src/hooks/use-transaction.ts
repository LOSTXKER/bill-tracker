/**
 * Custom hook for fetching transaction data with SWR caching
 * Prevents unnecessary refetches when navigating between pages
 */

import useSWR from "swr";

interface UseTransactionOptions {
  type: "expense" | "income";
  transactionId: string | undefined;
  enabled?: boolean;
}

interface TransactionData {
  // Common fields
  id: string;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  status: string;
  workflowStatus: string;
  approvalStatus: string;
  invoiceNumber: string | null;
  referenceNo: string | null;
  notes: string | null;
  documentType: string | null;
  accountId: string | null;
  contactId: string | null;
  contactName: string | null;
  referenceUrls: string[] | null;
  otherDocUrls: any;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  Contact?: { id: string; name: string; taxId?: string | null } | null;
  contact?: { id: string; name: string; taxId?: string | null } | null;
  Account?: { id: string; code: string; name: string } | null;
  account?: { id: string; code: string; name: string } | null;
  
  // Expense-specific
  billDate?: string;
  description?: string;
  netPaid?: number;
  isWht?: boolean;
  paymentSlipUrls?: string[];
  taxInvoiceUrls?: string[];
  whtCertUrls?: string[];
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  dueDate?: string | null;
  isReimbursement?: boolean;
  reimbursementStatus?: string;
  
  // Income-specific
  receiveDate?: string;
  source?: string;
  netReceived?: number;
  isWhtDeducted?: boolean;
  receiptUrls?: string[];
  billingUrls?: string[];
  
  // Any other fields
  [key: string]: any;
}

interface UseTransactionReturn {
  transaction: TransactionData | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<any>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch transaction");
  }
  return res.json();
};

export function useTransaction({
  type,
  transactionId,
  enabled = true,
}: UseTransactionOptions): UseTransactionReturn {
  const apiEndpoint = type === "expense" ? "/api/expenses" : "/api/incomes";
  const swrKey = enabled && transactionId ? `${apiEndpoint}/${transactionId}` : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    // Keep data fresh but don't refetch on every focus
    revalidateOnFocus: false,
    // Don't refetch when window regains visibility
    revalidateOnReconnect: false,
    // Keep previous data while revalidating
    keepPreviousData: true,
    // Cache for 5 minutes
    dedupingInterval: 5 * 60 * 1000,
    // Don't auto-revalidate
    revalidateIfStale: false,
  });

  // Extract transaction data from response
  const transaction = data?.data?.[type] || data?.[type] || null;

  return {
    transaction,
    isLoading,
    error: error || null,
    mutate,
  };
}
