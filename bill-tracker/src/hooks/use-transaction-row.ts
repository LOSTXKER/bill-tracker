/**
 * Shared hook for transaction table row behavior
 */

import { useRouter } from "next/navigation";
import { useLineNotification } from "./use-line-notification";

export interface UseTransactionRowOptions {
  companyCode: string;
  transactionType: "expense" | "income";
  transactionId: string;
}

export function useTransactionRow({
  companyCode,
  transactionType,
  transactionId,
}: UseTransactionRowOptions) {
  const router = useRouter();
  const { sending, sendNotification } = useLineNotification(transactionType);

  const handleRowClick = () => {
    router.push(`/${companyCode.toLowerCase()}/${transactionType}s/${transactionId}`);
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
