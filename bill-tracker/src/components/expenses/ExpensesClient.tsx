"use client";

import { 
  TransactionListClient, 
  type CompanyOption,
  TransactionTableRow,
  expenseRowConfig,
} from "@/components/transactions";
import { createTransactionListConfig } from "@/lib/config/transaction-list-config";

interface TabCounts {
  all: number;
  draft: number;
  pending: number;
  active: number;
  ready: number;
  sent: number;
  payOnBehalf?: number;
}

interface ExpensesClientProps {
  companyCode: string;
  initialExpenses: any[];
  initialTotal: number;
  currentUserId?: string;
  canApprove?: boolean;
  isOwner?: boolean;
  tabCounts?: TabCounts;
  companies?: CompanyOption[];
}

const expenseListConfig = createTransactionListConfig(
  "expense",
  (expense, companyCode, selected, onToggle, options) => (
    <TransactionTableRow
      key={expense.id}
      transaction={expense}
      companyCode={companyCode}
      config={expenseRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
      currentUserId={options?.currentUserId}
      canApprove={options?.canApprove}
      onApprovalChange={options?.onRefresh}
      onPreview={options?.onPreview}
    />
  ),
);

export function ExpensesClient({
  companyCode,
  initialExpenses,
  initialTotal,
  currentUserId,
  canApprove = false,
  isOwner = false,
  tabCounts,
  companies = [],
}: ExpensesClientProps) {
  return (
    <TransactionListClient
      companyCode={companyCode}
      data={initialExpenses}
      total={initialTotal}
      config={expenseListConfig}
      companies={companies}
      currentUserId={currentUserId}
      canApprove={canApprove}
      isOwner={isOwner}
      tabCounts={tabCounts}
    />
  );
}
