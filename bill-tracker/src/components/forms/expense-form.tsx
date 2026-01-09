"use client";

import { Receipt } from "lucide-react";
import { TransactionFormBase, TransactionFormConfig } from "./shared/TransactionFormBase";
import { calculateExpenseTotals } from "@/lib/utils/tax-calculator";
import { DatePicker } from "./shared/DatePicker";

interface ExpenseFormProps {
  companyCode: string;
}

export function ExpenseForm({ companyCode }: ExpenseFormProps) {
  const config: TransactionFormConfig = {
    type: "expense",
    title: "รายจ่าย",
    icon: Receipt,
    iconColor: "bg-destructive/10 text-destructive",
    buttonColor: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    apiEndpoint: "/api/expenses",
    redirectPath: `/${companyCode.toLowerCase()}/dashboard`,
    
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
      },
      netAmountField: "netPaid",
    },
    
    defaultValues: {
      amount: 0,
      vatRate: 7,
      isWht: false,
      paymentMethod: "BANK_TRANSFER",
      status: "", // ว่างไว้ให้ผู้ใช้เลือกเอง
      billDate: new Date(),
      invoiceNumber: "",
      referenceNo: "",
    },
    
    statusOptions: [
      {
        value: "PENDING_PHYSICAL",
        label: "ได้บิลครบแล้ว (รอส่งบัญชี)",
        color: "red",
      },
      {
        value: "WAITING_FOR_DOC",
        label: "ร้านส่งบิลตามมา",
        color: "orange",
      },
    ],
    
    calculateTotals: calculateExpenseTotals,
    
    documentConfig: {
      type: "expense",
      fields: {
        slip: "slipUrls",
        invoice: "taxInvoiceUrls",
        whtCert: "whtCertUrls",
      },
    },
    
    renderAdditionalFields: ({ register, watch, setValue }) => (
      <DatePicker
        label="วันครบกำหนด (ถ้ามี)"
        value={watch("dueDate")}
        onChange={(date) => setValue("dueDate", date)}
      />
    ),
  };

  return <TransactionFormBase companyCode={companyCode} config={config} />;
}
