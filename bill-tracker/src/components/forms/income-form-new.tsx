"use client";

import { Wallet } from "lucide-react";
import { TransactionFormBase, TransactionFormConfig } from "./shared/TransactionFormBase";
import { calculateIncomeTotals } from "@/lib/utils/tax-calculator";

interface IncomeFormProps {
  companyCode: string;
}

export function IncomeForm({ companyCode }: IncomeFormProps) {
  const config: TransactionFormConfig = {
    type: "income",
    title: "รายรับ",
    icon: Wallet,
    iconColor: "bg-primary/10 text-primary",
    buttonColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
    apiEndpoint: "/api/incomes",
    redirectPath: `/${companyCode.toLowerCase()}/dashboard`,
    
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
    },
    
    defaultValues: {
      amount: 0,
      vatRate: 0,
      isWhtDeducted: false,
      paymentMethod: "BANK_TRANSFER",
      status: "PENDING_COPY_SEND",
      receiveDate: new Date(),
    },
    
    statusOptions: [
      {
        value: "NO_DOC_REQUIRED",
        label: "⚪ ไม่ต้องทำเอกสาร",
        color: "gray",
      },
      {
        value: "WAITING_ISSUE",
        label: "🟠 รอออกบิลให้ลูกค้า",
        color: "orange",
      },
      {
        value: "WAITING_WHT_CERT",
        label: "🟠 รอใบ 50 ทวิ จากลูกค้า",
        color: "orange",
        condition: (formData) => formData.isWhtDeducted,
      },
      {
        value: "PENDING_COPY_SEND",
        label: "🔴 เอกสารครบ (รอส่งบัญชี)",
        color: "red",
      },
    ],
    
    calculateTotals: calculateIncomeTotals,
    
    documentConfig: {
      type: "income",
      fields: {
        slip: "customerSlipUrl",
        invoice: "myBillCopyUrl",
        whtCert: "whtCertUrl",
      },
    },
  };

  return <TransactionFormBase companyCode={companyCode} config={config} />;
}
