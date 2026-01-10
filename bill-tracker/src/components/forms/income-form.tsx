"use client";

import { Wallet } from "lucide-react";
import { UnifiedTransactionForm, UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import { calculateIncomeTotals } from "@/lib/utils/tax-calculator";
import {
  INCOME_STATUS_FLOW,
  INCOME_STATUS_INFO,
} from "@/lib/constants/transaction";

interface IncomeFormProps {
  companyCode: string;
  mode?: "create" | "view" | "edit";
  transactionId?: string;
  onModeChange?: (mode: "view" | "edit") => void;
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

    // Status configuration
    statusFlow: INCOME_STATUS_FLOW,
    statusInfo: INCOME_STATUS_INFO,
    completedStatus: "SENT_COPY",
    defaultStatus: "PENDING_COPY_SEND",

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

    // Status options (all statuses for display, condition controls visibility in create mode)
    statusOptions: [
      {
        value: "NO_DOC_REQUIRED",
        label: "ไม่ต้องทำเอกสาร",
        color: "gray",
      },
      {
        value: "WAITING_ISSUE",
        label: "รอออกบิลให้ลูกค้า",
        color: "orange",
      },
      {
        value: "WAITING_WHT_CERT",
        label: "รอใบ 50 ทวิ จากลูกค้า",
        color: "orange",
        condition: (formData) => formData.isWhtDeducted as boolean,
      },
      {
        value: "PENDING_COPY_SEND",
        label: "เอกสารครบ (รอส่งบัญชี)",
        color: "red",
      },
      {
        value: "SENT_COPY",
        label: "ส่งสำเนาให้บัญชีแล้ว",
        color: "green",
        // Only show in edit mode or when already at this status
        condition: (data: Record<string, unknown>) => data.status === "SENT_COPY",
      },
    ],

    // Calculation function
    calculateTotals: calculateIncomeTotals,

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
}: IncomeFormProps) {
  const config = getIncomeConfig(companyCode);

  return (
    <UnifiedTransactionForm
      companyCode={companyCode}
      config={config}
      mode={mode}
      transactionId={transactionId}
      onModeChange={onModeChange}
    />
  );
}
