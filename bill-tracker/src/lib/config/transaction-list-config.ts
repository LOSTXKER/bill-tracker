/**
 * Factory for creating TransactionListConfig objects
 * Reduces duplication between ExpensesClient and IncomesClient
 */

import { ArrowUpCircle, ArrowDownCircle, type LucideIcon } from "lucide-react";
import { EXPENSE_WORKFLOW_INFO, INCOME_WORKFLOW_INFO } from "@/lib/constants/transaction";
import type { TransactionListConfig, TableHeaderConfig } from "@/components/transactions";

interface TransactionListConfigDef {
  type: "expense" | "income";
  title: string;
  emptyStateTitle: string;
  emptyIcon: LucideIcon;
  apiEndpoint: string;
  dateField: "billDate" | "receiveDate";
  statusInfo: Record<string, any>;
  tableHeaders: TableHeaderConfig[];
}

const EXPENSE_LIST_CONFIG: TransactionListConfigDef = {
  type: "expense",
  title: "รายการรายจ่าย",
  emptyStateTitle: "ยังไม่มีรายจ่าย",
  emptyIcon: ArrowUpCircle,
  apiEndpoint: "/api/expenses",
  dateField: "billDate",
  statusInfo: EXPENSE_WORKFLOW_INFO,
  tableHeaders: [
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
    { key: "billDate", label: "วันที่บิล", sortable: true },
    { key: "status", label: "สถานะ", align: "center" as const },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "บัญชี" },
    { key: "description", label: "รายละเอียด" },
    { key: "internalCompany", label: "บริษัทจริง" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" as const },
    { key: "updatedAt", label: "แก้ไขล่าสุด", sortable: true },
    { key: "wht", label: "หัก ณ ที่จ่าย", align: "center" as const },
    { key: "line", label: "LINE", align: "center" as const },
  ],
};

const INCOME_LIST_CONFIG: TransactionListConfigDef = {
  type: "income",
  title: "รายการรายรับ",
  emptyStateTitle: "ยังไม่มีรายรับ",
  emptyIcon: ArrowDownCircle,
  apiEndpoint: "/api/incomes",
  dateField: "receiveDate",
  statusInfo: INCOME_WORKFLOW_INFO,
  tableHeaders: [
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
    { key: "receiveDate", label: "วันที่รับ", sortable: true },
    { key: "status", label: "สถานะ", align: "center" as const },
    { key: "contact", label: "ผู้ติดต่อ", sortable: true },
    { key: "category", label: "บัญชี" },
    { key: "source", label: "รายละเอียด" },
    { key: "creator", label: "ผู้สร้าง", sortable: true },
    { key: "amount", label: "จำนวนเงิน", sortable: true, align: "right" as const },
    { key: "updatedAt", label: "แก้ไขล่าสุด", sortable: true },
    { key: "wht", label: "WHT", align: "center" as const },
    { key: "line", label: "LINE", align: "center" as const },
  ],
};

export function getTransactionListConfig(type: "expense" | "income"): TransactionListConfigDef {
  return type === "expense" ? EXPENSE_LIST_CONFIG : INCOME_LIST_CONFIG;
}

export function createTransactionListConfig(
  type: "expense" | "income",
  renderRow: TransactionListConfig["renderRow"]
): TransactionListConfig {
  const base = getTransactionListConfig(type);
  return {
    ...base,
    captureUrl: "capture",
    showCategory: true,
    renderRow,
  };
}
