"use client";

import { Receipt } from "lucide-react";
import { UnifiedTransactionForm, UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import { calculateTransactionTotals } from "@/lib/utils/tax-calculator";
import {
  EXPENSE_WORKFLOW_FLOW,
  EXPENSE_WORKFLOW_INFO,
} from "@/lib/constants/transaction";

interface ExpenseFormProps {
  companyCode: string;
  mode?: "create" | "view" | "edit";
  transactionId?: string;
  onModeChange?: (mode: "view" | "edit") => void;
  prefillData?: Record<string, unknown>;
  currentUserId?: string;
}

// Shared expense configuration for all modes
export function getExpenseConfig(companyCode: string): UnifiedTransactionConfig {
  return {
    type: "expense",
    title: "รายจ่าย",
    icon: Receipt,
    iconColor: "bg-destructive/10 text-destructive",
    buttonColor: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    apiEndpoint: "/api/expenses",
    redirectPath: `/${companyCode.toLowerCase()}/dashboard`,
    listUrl: "expenses",
    entityType: "Expense",

    // Status configuration - using new workflow
    statusFlow: EXPENSE_WORKFLOW_FLOW,
    statusInfo: EXPENSE_WORKFLOW_INFO,
    completedStatus: "SENT_TO_ACCOUNTANT",
    defaultStatus: "WAITING_TAX_INVOICE",

    // Field configurations
    fields: {
      dateField: {
        name: "billDate",
        label: "วันที่จ่ายเงิน",
      },
      descriptionField: {
        name: "description",
        label: "รายละเอียด",
        placeholder: "เช่น ค่าหมึกพิมพ์ DTF",
      },
      whtField: {
        name: "isWht",
        label: "หัก ณ ที่จ่าย",
        description: "หักภาษีผู้ขาย?",
      },
      netAmountField: "netPaid",
      netAmountLabel: "ยอดชำระสุทธิ",
    },

    // Default values (for create mode)
    defaultValues: {
      amount: 0,
      vatRate: 7,
      isWht: false,
      paymentMethod: "BANK_TRANSFER",
      status: "",
      billDate: new Date(),
      invoiceNumber: "",
      referenceNo: "",
      documentType: "TAX_INVOICE", // Default for VAT 7%
    },

    // Status options - Not needed anymore with new DRAFT workflow
    // All new transactions start as DRAFT and workflow is determined automatically
    // based on documentType, hasTaxInvoice, and isWht
    statusOptions: [],

    // Calculation function
    calculateTotals: calculateTransactionTotals,

    // Document upload configuration
    documentConfig: {
      type: "expense",
      fields: {
        slip: "slipUrls",
        invoice: "taxInvoiceUrls",
        whtCert: "whtCertUrls",
      },
    },

    // File field labels for detail view
    fileFields: {
      slip: { urlsField: "slipUrls", label: "สลิปโอนเงิน" },
      invoice: { urlsField: "taxInvoiceUrls", label: "ใบกำกับภาษี / ใบเสร็จ" },
      wht: { urlsField: "whtCertUrls", label: "หนังสือรับรองหัก ณ ที่จ่าย" },
    },

    // Additional fields renderer - removed dueDate
    renderAdditionalFields: undefined,

    showDueDate: false,
  };
}

export function ExpenseForm({ 
  companyCode, 
  mode = "create", 
  transactionId,
  onModeChange,
  prefillData,
  currentUserId,
}: ExpenseFormProps) {
  const baseConfig = getExpenseConfig(companyCode);
  
  console.log("ExpenseForm received prefillData:", prefillData);
  
  // Merge prefillData with defaultValues if provided
  const config = prefillData
    ? {
        ...baseConfig,
        defaultValues: {
          ...baseConfig.defaultValues,
          ...prefillData,
        },
      }
    : baseConfig;

  console.log("ExpenseForm final config.defaultValues:", config.defaultValues);

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
