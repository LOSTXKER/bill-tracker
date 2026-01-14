"use client";

import { ArrowDownCircle } from "lucide-react";
import { 
  TransactionListClient, 
  type TransactionListConfig,
  TransactionTableRow,
  incomeRowConfig,
} from "@/components/transactions";
import { fetchIncomes } from "@/app/[company]/incomes/actions";
import { INCOME_WORKFLOW_INFO } from "@/lib/constants/transaction";

interface IncomesClientProps {
  companyCode: string;
  initialIncomes: any[];
  initialTotal: number;
}

// Income-specific configuration
const incomeListConfig: TransactionListConfig = {
  type: "income",
  title: "รายการรายรับ",
  emptyStateTitle: "ยังไม่มีรายรับ",
  emptyIcon: ArrowDownCircle,
  apiEndpoint: "/api/incomes",
  captureUrl: "capture",
  dateField: "receiveDate",
  statusInfo: INCOME_WORKFLOW_INFO,
  
  tableHeaders: [
    { key: "receiveDate", label: "วันที่", sortable: true },
    { key: "status", label: "สถานะ", align: "center" },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "บัญชี" },
    { key: "source", label: "รายละเอียด" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" },
    { key: "updatedAt", label: "แก้ไขล่าสุด", sortable: true },
    { key: "wht", label: "WHT", align: "center" },
    { key: "line", label: "LINE", align: "center" },
  ],
  
  showCategory: true,
  
  renderRow: (income, companyCode, selected, onToggle) => (
    <TransactionTableRow
      key={income.id}
      transaction={income}
      companyCode={companyCode}
      config={incomeRowConfig}
      selected={selected}
      onToggleSelect={onToggle}
    />
  ),
};

// Data fetcher wrapper
async function fetchIncomeData(params: any) {
  const result = await fetchIncomes(params);
  return {
    data: result.incomes,
    total: result.total,
  };
}

export function IncomesClient({
  companyCode,
  initialIncomes,
  initialTotal,
}: IncomesClientProps) {
  return (
    <TransactionListClient
      companyCode={companyCode}
      initialData={initialIncomes}
      initialTotal={initialTotal}
      config={incomeListConfig}
      fetchData={fetchIncomeData}
    />
  );
}
