"use client";

import { use } from "react";
import { TransactionDetailBase, type TransactionDetailConfig } from "@/components/transactions";
import { calculateIncomeTotals } from "@/lib/utils/tax-calculator";
import {
  INCOME_STATUS_FLOW,
  INCOME_STATUS_INFO,
} from "@/lib/constants/transaction";

interface IncomeDetailPageProps {
  params: Promise<{ company: string; id: string }>;
}

// Income-specific configuration
const incomeConfig: TransactionDetailConfig = {
  type: "income",
  title: "รายรับ",
  titleColor: "hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950",
  listUrl: "incomes",
  apiEndpoint: "/api/incomes",
  entityType: "Income",
  
  // Status configuration
  statusFlow: INCOME_STATUS_FLOW,
  statusInfo: INCOME_STATUS_INFO,
  completedStatus: "SENT_COPY",
  defaultStatus: "PENDING_COPY_SEND",
  
  // Field configurations
  dateField: "receiveDate",
  dateLabel: "วันที่รับเงิน",
  netAmountField: "netReceived",
  netAmountLabel: "ยอดรับสุทธิ",
  whtField: "isWhtDeducted",
  whtLabel: "ถูกหัก ณ ที่จ่าย",
  descriptionField: "source",
  descriptionLabel: "แหล่งที่มา / รายละเอียด",
  
  // File URL configurations
  fileFields: {
    slip: { urlsField: "customerSlipUrls", label: "สลิปโอนจากลูกค้า" },
    invoice: { urlsField: "myBillCopyUrls", label: "สำเนาบิลขาย" },
    wht: { urlsField: "whtCertUrls", label: "ใบ 50 ทวิ (จากลูกค้า)" },
  },
  
  // Optional fields
  showDueDate: false,
  showCategory: false,
  
  // Calculate totals function
  calculateTotals: calculateIncomeTotals,
};

export default function IncomeDetailPage({ params }: IncomeDetailPageProps) {
  const { company: companyCode, id } = use(params);
  
  return (
    <TransactionDetailBase
      companyCode={companyCode}
      id={id}
      config={incomeConfig}
    />
  );
}
