/**
 * Shared hook for transaction table row behavior
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useLineNotification } from "./use-line-notification";

export type TransactionType = "expense" | "income" | "reimbursement";

export interface UseTransactionRowOptions {
  companyCode: string;
  transactionType: TransactionType;
  transactionId: string;
}

// Map transaction type to URL path
const typeToPath: Record<TransactionType, string> = {
  expense: "expenses",
  income: "incomes",
  reimbursement: "reimbursements",
};

export function useTransactionRow({
  companyCode,
  transactionType,
  transactionId,
}: UseTransactionRowOptions) {
  const router = useRouter();
  // LINE notification is only for expense/income, not reimbursement
  const notificationType = transactionType === "reimbursement" ? "expense" : transactionType;
  const { sending, sendNotification } = useLineNotification(notificationType);

  // Build the detail URL
  const detailUrl = useMemo(() => {
    const path = typeToPath[transactionType];
    return `/${companyCode.toLowerCase()}/${path}/${transactionId}`;
  }, [companyCode, transactionType, transactionId]);

  // Prefetch the detail page on mount for faster navigation
  useEffect(() => {
    router.prefetch(detailUrl);
  }, [router, detailUrl]);

  const handleRowClick = () => {
    router.push(detailUrl);
  };

  const handleSendNotification = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    await sendNotification(transactionId);
  };

  return {
    handleRowClick,
    handleSendNotification,
    sending,
    detailUrl,
  };
}
