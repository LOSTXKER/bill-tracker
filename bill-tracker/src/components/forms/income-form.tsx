"use client";

import { Wallet } from "lucide-react";
import { UnifiedTransactionForm, UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import { calculateTransactionTotals } from "@/lib/utils/tax-calculator";
import {
  INCOME_WORKFLOW_FLOW,
  INCOME_WORKFLOW_INFO,
} from "@/lib/constants/transaction";

interface IncomeFormProps {
  companyCode: string;
  mode?: "create" | "view" | "edit";
  transactionId?: string;
  onModeChange?: (mode: "view" | "edit") => void;
  currentUserId?: string;
}

// Shared income configuration for all modes
export function getIncomeConfig(companyCode: string): UnifiedTransactionConfig {
  return {
    type: "income",
    title: "รายรับ",
    icon: Wallet,
    iconColor: "bg-primary/10 text-primary",
    buttonColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
    apiEndpoint: "/api/incomes",
    redirectPath: `/${companyCode.toLowerCase()}/dashboard`,
    listUrl: "incomes",
    entityType: "Income",

    // Status configuration - using new workflow
    statusFlow: INCOME_WORKFLOW_FLOW,
    statusInfo: INCOME_WORKFLOW_INFO,
    completedStatus: "SENT_TO_ACCOUNTANT",
    defaultStatus: "WAITING_INVOICE_ISSUE",

    // Field configurations
    fields: {
      dateField: {
        name: "receiveDate",
        label: "วันที่รับเงิน",
      },
      descriptionField: {
        name: "source",
        label: "แหล่งที่มา/รายละเอียด",
        placeholder: "เช่น ค่าสกรีนเสื้อ 100 ตัว",
      },
      whtField: {
        name: "isWhtDeducted",
        label: "โดนหัก ณ ที่จ่าย",
        description: "ลูกค้าหักภาษีเรา?",
      },
      netAmountField: "netReceived",
      netAmountLabel: "ยอดรับสุทธิ",
    },

    // Default values (for create mode)
    defaultValues: {
      amount: 0,
      vatRate: 0,
      isWhtDeducted: false,
      paymentMethod: "BANK_TRANSFER",
      status: "",
      receiveDate: new Date(),
      invoiceNumber: "",
      referenceNo: "",
    },

    // Status options - Not needed anymore with new DRAFT workflow
    // All new transactions start as DRAFT and workflow is determined automatically
    statusOptions: [],

    // Calculation function
    calculateTotals: calculateTransactionTotals,

    // Document upload configuration
    documentConfig: {
      type: "income",
      fields: {
        slip: "customerSlipUrls",
        invoice: "myBillCopyUrls",
        whtCert: "whtCertUrls",
      },
    },

    // File field labels for detail view
    fileFields: {
      slip: { urlsField: "customerSlipUrls", label: "สลิปโอนจากลูกค้า" },
      invoice: { urlsField: "myBillCopyUrls", label: "สำเนาบิลขาย" },
      wht: { urlsField: "whtCertUrls", label: "ใบ 50 ทวิ (จากลูกค้า)" },
    },

    // No additional fields for income
    showDueDate: false,
  };
}

export function IncomeForm({ 
  companyCode, 
  mode = "create", 
  transactionId,
  onModeChange,
  currentUserId,
}: IncomeFormProps) {
  const config = getIncomeConfig(companyCode);

  return (
    <UnifiedTransactionForm
      companyCode={companyCode}
      config={config}
      mode={mode}
      transactionId={transactionId}
      onModeChange={onModeChange}
      currentUserId={currentUserId}
    />
  );
}
