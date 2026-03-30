"use client";

import { 
  TransactionListClient, 
  TransactionTableRow,
  incomeRowConfig,
} from "@/components/transactions";
import { createTransactionListConfig } from "@/lib/config/transaction-list-config";

interface TabCounts {
  all: number;
  draft: number;
  pending: number;
  active: number;
  ready: number;
  sent: number;
}

interface IncomesClientProps {
  companyCode: string;
  initialIncomes: any[];
  initialTotal: number;
  currentUserId?: string;
  canApprove?: boolean;
  isOwner?: boolean;
  tabCounts?: TabCounts;
}

const incomeListConfig = createTransactionListConfig(
  "income",
  (income, companyCode, selected, onToggle, options) => (
    <TransactionTableRow
      key={income.id}
      transaction={income}
      companyCode={companyCode}
      config={incomeRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
      currentUserId={options?.currentUserId}
      canApprove={options?.canApprove}
      onApprovalChange={options?.onRefresh}
      onPreview={options?.onPreview}
    />
  ),
);

export function IncomesClient({
  companyCode,
  initialIncomes,
  initialTotal,
  currentUserId,
  canApprove = false,
  isOwner = false,
  tabCounts,
}: IncomesClientProps) {
  return (
    <TransactionListClient
      companyCode={companyCode}
      data={initialIncomes}
      total={initialTotal}
      config={incomeListConfig}
      currentUserId={currentUserId}
      canApprove={canApprove}
      isOwner={isOwner}
      tabCounts={tabCounts}
    />
  );
}
