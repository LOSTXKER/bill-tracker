"use client";

import { ArrowUpCircle } from "lucide-react";
import { 
  TransactionListClient, 
  type TransactionListConfig,
  TransactionTableRow,
  expenseRowConfig,
} from "@/components/transactions";
import { EXPENSE_WORKFLOW_INFO } from "@/lib/constants/transaction";

interface ExpensesClientProps {
  companyCode: string;
  initialExpenses: any[];
  initialTotal: number;
}

// Expense-specific configuration
const expenseListConfig: TransactionListConfig = {
  type: "expense",
  title: "รายการรายจ่าย",
  emptyStateTitle: "ยังไม่มีรายจ่าย",
  emptyIcon: ArrowUpCircle,
  apiEndpoint: "/api/expenses",
  captureUrl: "capture",
  dateField: "billDate",
  statusInfo: EXPENSE_WORKFLOW_INFO,
  
  tableHeaders: [
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
    { key: "billDate", label: "วันที่บิล", sortable: true },
    { key: "status", label: "สถานะ", align: "center" },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "บัญชี" },
    { key: "description", label: "รายละเอียด" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" },
    { key: "updatedAt", label: "แก้ไขล่าสุด", sortable: true },
    { key: "wht", label: "หัก ณ ที่จ่าย", align: "center" },
    { key: "line", label: "LINE", align: "center" },
  ],
  
  showCategory: true,
  
  renderRow: (expense, companyCode, selected, onToggle) => (
    <TransactionTableRow
      key={expense.id}
      transaction={expense}
      companyCode={companyCode}
      config={expenseRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
    />
  ),
};

export function ExpensesClient({
  companyCode,
  initialExpenses,
  initialTotal,
}: ExpensesClientProps) {
  return (
    <TransactionListClient
      companyCode={companyCode}
      data={initialExpenses}
      total={initialTotal}
      config={expenseListConfig}
    />
  );
}
