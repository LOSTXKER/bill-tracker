"use client";

import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import type { AmountInputMode } from "./transaction-fields-types";

interface CalculationSummaryProps {
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  whtRate?: number;
  whtAmount: number;
  netAmount: number;
  type?: "expense" | "income";
  showWhtNote?: boolean;
  inputMode?: AmountInputMode;
}

const ENTERED_BADGE = (
  <span className="ml-1.5 inline-flex items-center text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
    ยอดที่กรอก
  </span>
);

export function CalculationSummary({
  baseAmount,
  vatRate,
  vatAmount,
  totalWithVat,
  whtRate,
  whtAmount,
  netAmount,
  type = "expense",
  showWhtNote = false,
  inputMode,
}: CalculationSummaryProps) {
  const hasWht = !!(whtRate && whtRate > 0 && whtAmount > 0);

  return (
    <div className="rounded-xl bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">สรุปยอด</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {vatRate > 0 ? "ยอดก่อน VAT" : "ยอดเงิน"}
            {inputMode === "beforeVat" && ENTERED_BADGE}
          </span>
          <span className="text-foreground">{formatCurrency(baseAmount)}</span>
        </div>
        {vatRate > 0 && (
          <div className="flex justify-between text-primary">
            <span>VAT {vatRate}%</span>
            <span>+{formatCurrency(vatAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {vatRate > 0 ? "ยอดรวม VAT" : "รวมเป็นเงิน"}
            {inputMode === "includingVat" && ENTERED_BADGE}
          </span>
          <span className="text-foreground font-medium">{formatCurrency(totalWithVat)}</span>
        </div>
        {hasWht && (
          <div
            className={`flex justify-between ${
              type === "income" ? "text-amber-600" : "text-destructive"
            }`}
          >
            <span>
              {type === "income" ? "ลูกค้าหัก" : "หัก ณ ที่จ่าย"} {whtRate}%
            </span>
            <span>-{formatCurrency(whtAmount)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex justify-between items-center text-lg font-semibold">
        <div>
          <span className="text-foreground">
            {type === "income" ? "ยอดรับจริง" : "ยอดโอนจริง"}
            {inputMode === "afterWht" && ENTERED_BADGE}
          </span>
          {hasWht && inputMode !== "afterWht" && (
            <span className="block text-xs font-normal text-muted-foreground">
              หลังหัก ณ ที่จ่าย
            </span>
          )}
        </div>
        <span className="text-primary">{formatCurrency(netAmount)}</span>
      </div>

      {showWhtNote && hasWht && (
        <p className="text-xs text-amber-600">
          * ต้องทวงใบ 50 ทวิ จากลูกค้า เพื่อใช้เป็นเครดิตภาษี
        </p>
      )}
    </div>
  );
}
