"use client";

import { Receipt } from "lucide-react";
import { UnifiedTransactionForm, UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import { calculateTransactionTotals } from "@/lib/utils/tax-calculator";
import { DatePicker } from "./shared/DatePicker";
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

    // Status options - NEW Workflow statuses
    statusOptions: [
      {
        value: "WAITING_TAX_INVOICE",
        label: "รอใบกำกับภาษี",
        color: "orange",
      },
      {
        value: "TAX_INVOICE_RECEIVED",
        label: "ได้ใบกำกับแล้ว",
        color: "green",
      },
      {
        value: "WHT_PENDING_ISSUE",
        label: "รอออกใบ 50 ทวิ",
        color: "amber",
        // Only show when WHT is enabled
        condition: (data: Record<string, unknown>) => data.isWht === true,
      },
      {
        value: "WHT_ISSUED",
        label: "ออกใบ 50 ทวิแล้ว",
        color: "purple",
        condition: (data: Record<string, unknown>) => data.isWht === true,
      },
      {
        value: "READY_FOR_ACCOUNTING",
        label: "พร้อมส่งบัญชี",
        color: "blue",
      },
      {
        value: "SENT_TO_ACCOUNTANT",
        label: "ส่งบัญชีแล้ว",
        color: "green",
        condition: (data: Record<string, unknown>) => data.status === "SENT_TO_ACCOUNTANT",
      },
    ],

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

    // Additional fields renderer (due date for expenses)
    renderAdditionalFields: ({ register, watch, setValue, mode }) => {
      const isEditable = mode === "create" || mode === "edit";
      const dueDate = watch("dueDate");

      if (isEditable) {
        return (
          <DatePicker
            label="วันครบกำหนด (ถ้ามี)"
            value={dueDate as Date | undefined}
            onChange={(date) => setValue("dueDate", date)}
          />
        );
      }

      // View mode
      return (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">วันครบกำหนด</label>
          <p className="text-sm font-medium">
            {dueDate
              ? new Date(dueDate as string).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : <span className="text-muted-foreground">-</span>}
          </p>
        </div>
      );
    },

    showDueDate: true,
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
