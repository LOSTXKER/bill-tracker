"use client";

import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

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
}

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
}: CalculationSummaryProps) {
  return (
    <div className="rounded-xl bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">สรุปยอด</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ยอดก่อน VAT</span>
          <span className="text-foreground">{formatCurrency(baseAmount)}</span>
        </div>
        {vatRate > 0 && (
          <div className="flex justify-between text-primary">
            <span>VAT {vatRate}%</span>
            <span>+{formatCurrency(vatAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">ยอดรวม VAT</span>
          <span className="text-foreground">{formatCurrency(totalWithVat)}</span>
        </div>
        {whtRate && whtRate > 0 && (
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

      <div className="flex justify-between text-lg font-semibold">
        <span className="text-foreground">
          {type === "income" ? "ยอดรับจริง" : "ยอดโอนจริง"}
        </span>
        <span className="text-primary">{formatCurrency(netAmount)}</span>
      </div>

      {showWhtNote && whtRate && whtRate > 0 && (
        <p className="text-xs text-amber-600">
          * ต้องทวงใบ 50 ทวิ จากลูกค้า เพื่อใช้เป็นเครดิตภาษี
        </p>
      )}
    </div>
  );
}
