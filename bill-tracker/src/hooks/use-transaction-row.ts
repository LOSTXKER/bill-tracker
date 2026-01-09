/**
 * Shared hook for transaction table row behavior
 */

import { useRouter } from "next/navigation";
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

  const handleRowClick = () => {
    const path = typeToPath[transactionType];
    router.push(`/${companyCode.toLowerCase()}/${path}/${transactionId}`);
  };

  const handleSendNotification = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    await sendNotification(transactionId);
  };

  return {
    handleRowClick,
    handleSendNotification,
    sending,
  };
}
