"use client";

import { formatCurrency } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import type { TransactionPreviewData, PreviewTransactionType } from "./preview-types";

interface TransactionAmountCardProps {
  data: TransactionPreviewData;
  transactionType: PreviewTransactionType;
}

export function TransactionAmountCard({ data, transactionType }: TransactionAmountCardProps) {
  const amount = transactionType === "expense"
    ? toNumber(data.netPaid)
    : toNumber(data.netReceived);

  return (
    <div className="rounded-lg border bg-gradient-to-br from-card to-muted/30 p-4">
      <p className="text-xs text-muted-foreground mb-1">
        {transactionType === "expense" ? "ยอดจ่ายสุทธิ" : "ยอดรับสุทธิ"}
      </p>
      <p className={`text-2xl font-bold ${
        transactionType === "expense" ? "text-destructive" : "text-primary"
      }`}>
        {formatCurrency(amount)}
      </p>

      {(data.amount || data.vatAmount || data.whtAmount) && (
        <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-0.5">
          {data.amount && (
            <div className="flex justify-between">
              <span>ยอดก่อน VAT</span>
              <span>{formatCurrency(toNumber(data.amount))}</span>
            </div>
          )}
          {data.vatAmount && toNumber(data.vatAmount) > 0 && (
            <div className="flex justify-between">
              <span>VAT 7%</span>
              <span>+{formatCurrency(toNumber(data.vatAmount))}</span>
            </div>
          )}
          {(data.isWht || data.isWhtDeducted) && data.whtAmount && toNumber(data.whtAmount) > 0 && (
            <div className="flex justify-between">
              <span>หัก ณ ที่จ่าย {data.whtRate ? `(${data.whtRate}%)` : ""}</span>
              <span>-{formatCurrency(toNumber(data.whtAmount))}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
