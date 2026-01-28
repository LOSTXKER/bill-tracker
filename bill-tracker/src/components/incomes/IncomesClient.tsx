"use client";

import { ArrowDownCircle } from "lucide-react";
import { 
  TransactionListClient, 
  type TransactionListConfig,
  TransactionTableRow,
  incomeRowConfig,
} from "@/components/transactions";
import { INCOME_WORKFLOW_INFO } from "@/lib/constants/transaction";

interface TabCounts {
  all: number;
  draft: number;
  pending: number;
  rejected: number;
  waiting_doc: number;
  doc_issued: number;
  ready: number;
  sent: number;
  recent: null;
}

interface IncomesClientProps {
  companyCode: string;
  initialIncomes: any[];
  initialTotal: number;
  currentUserId?: string;
  canApprove?: boolean;
  tabCounts?: TabCounts;
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
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
    { key: "receiveDate", label: "วันที่รับ", sortable: true },
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
  
  renderRow: (income, companyCode, selected, onToggle, options) => (
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
};

export function IncomesClient({
  companyCode,
  initialIncomes,
  initialTotal,
  currentUserId,
  canApprove = false,
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
      tabCounts={tabCounts}
    />
  );
}
