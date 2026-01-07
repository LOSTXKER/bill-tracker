"use client";

import { ArrowUpCircle } from "lucide-react";
import { ExpenseTableRow } from "@/components/expenses/expense-table-row";
import { TransactionListClient, type TransactionListConfig } from "@/components/transactions";
import { fetchExpenses } from "@/app/[company]/expenses/actions";
import { EXPENSE_STATUS_INFO } from "@/lib/constants/transaction";

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
  statusInfo: EXPENSE_STATUS_INFO,
  
  tableHeaders: [
    { key: "billDate", label: "วันที่", sortable: true },
    { key: "status", label: "สถานะ", align: "center" },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "หมวดหมู่" },
    { key: "description", label: "รายละเอียด" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" },
    { key: "line", label: "LINE", align: "center" },
  ],
  
  showCategory: true,
  
  renderRow: (expense, companyCode, selected, onToggle) => (
    <ExpenseTableRow
      key={expense.id}
      expense={expense}
      companyCode={companyCode}
      selected={selected}
      onToggleSelect={onToggle}
    />
  ),
};

// Data fetcher wrapper
async function fetchExpenseData(params: any) {
  const result = await fetchExpenses(params);
  return {
    data: result.expenses,
    total: result.total,
  };
}

export function ExpensesClient({
  companyCode,
  initialExpenses,
  initialTotal,
}: ExpensesClientProps) {
  return (
    <TransactionListClient
      companyCode={companyCode}
      initialData={initialExpenses}
      initialTotal={initialTotal}
      config={expenseListConfig}
      fetchData={fetchExpenseData}
    />
  );
}
