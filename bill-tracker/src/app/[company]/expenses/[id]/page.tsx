"use client";

import { use } from "react";
import { TransactionDetailBase, type TransactionDetailConfig } from "@/components/transactions";
import { calculateExpenseTotals } from "@/lib/utils/tax-calculator";
import {
  EXPENSE_STATUS_FLOW,
  EXPENSE_STATUS_INFO,
  CATEGORY_LABELS,
} from "@/lib/constants/transaction";

interface ExpenseDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

// Expense-specific configuration
const expenseConfig: TransactionDetailConfig = {
  type: "expense",
  title: "รายจ่าย",
  titleColor: "hover:bg-destructive/10 hover:text-destructive",
  listUrl: "expenses",
  apiEndpoint: "/api/expenses",
  entityType: "Expense",
  
  // Status configuration
  statusFlow: EXPENSE_STATUS_FLOW,
  statusInfo: EXPENSE_STATUS_INFO,
  completedStatus: "SENT_TO_ACCOUNT",
  defaultStatus: "PENDING_PHYSICAL",
  
  // Field configurations
  dateField: "billDate",
  dateLabel: "วันที่จ่ายเงิน",
  netAmountField: "netPaid",
  netAmountLabel: "ยอดชำระสุทธิ",
  whtField: "isWht",
  whtLabel: "หัก ณ ที่จ่าย",
  descriptionField: "description",
  descriptionLabel: "รายละเอียด",
  
  // File URL configurations
  fileFields: {
    slip: { urlsField: "slipUrls", label: "สลิปโอนเงิน" },
    invoice: { urlsField: "taxInvoiceUrls", label: "ใบกำกับภาษี / ใบเสร็จ" },
    wht: { urlsField: "whtCertUrls", label: "หนังสือรับรองหัก ณ ที่จ่าย" },
  },
  
  // Optional fields
  showDueDate: true,
  showCategory: true,
  categoryLabels: CATEGORY_LABELS,
  
  // Calculate totals function
  calculateTotals: calculateExpenseTotals,
};

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { company: companyCode, id } = use(params);
  
  return (
    <TransactionDetailBase
      companyCode={companyCode}
      id={id}
      config={expenseConfig}
    />
  );
}
