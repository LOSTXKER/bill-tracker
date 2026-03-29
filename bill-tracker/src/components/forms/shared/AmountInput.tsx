"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AmountInputMode, FormWatch, FormSetValue } from "./transaction-fields-types";

interface AmountInputProps {
  watch: FormWatch;
  setValue: FormSetValue;
  vatRate: number;
  isWht: boolean;
}

export function AmountInput({ watch, setValue, vatRate, isWht }: AmountInputProps) {
  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const isUserInputRef = useRef(false);

  const whtRate = (watch("whtRate") as number) || 0;
  const formAmount = watch("amount") as number | undefined;

  useEffect(() => {
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }

    if (formAmount !== undefined && formAmount !== null) {
      if (amountInputMode === "includingVat" && vatRate > 0) {
        const includingVat = Math.trunc(formAmount * (1 + vatRate / 100) * 100) / 100;
        setDisplayAmount(String(includingVat));
      } else if (amountInputMode === "afterWht" && isWht) {
        const factor = 1 + vatRate / 100 - whtRate / 100;
        const netAmount = Math.trunc(formAmount * factor * 100) / 100;
        setDisplayAmount(String(netAmount));
      } else {
        setDisplayAmount(String(formAmount));
      }
    }
  }, [formAmount, amountInputMode, vatRate, isWht, whtRate]);

  const handleAmountInput = (value: string) => {
    const dotIndex = value.indexOf(".");
    const truncatedValue = dotIndex !== -1 && value.length - dotIndex > 3
      ? value.slice(0, dotIndex + 3)
      : value;

    setDisplayAmount(truncatedValue);

    const parsed = parseFloat(truncatedValue);
    const numValue = isNaN(parsed) ? 0 : parsed;

    isUserInputRef.current = true;

    if (amountInputMode === "includingVat" && vatRate > 0) {
      const beforeVat = Math.round((numValue / (1 + vatRate / 100)) * 100) / 100;
      setValue("amount", beforeVat);
    } else if (amountInputMode === "afterWht" && isWht) {
      const factor = 1 + vatRate / 100 - whtRate / 100;
      const beforeVat = factor > 0 ? Math.round((numValue / factor) * 100) / 100 : numValue;
      setValue("amount", beforeVat);
    } else {
      setValue("amount", numValue);
    }
  };

  const handleInputModeToggle = (newMode: AmountInputMode) => {
    if (newMode === amountInputMode) return;

    const currentValue = parseFloat(displayAmount) || 0;
    isUserInputRef.current = true;

    if (newMode === "includingVat" && vatRate > 0) {
      const beforeVat = Math.round((currentValue / (1 + vatRate / 100)) * 100) / 100;
      setValue("amount", beforeVat);
    } else if (newMode === "afterWht" && isWht) {
      const factor = 1 + vatRate / 100 - whtRate / 100;
      const beforeVat = factor > 0 ? Math.round((currentValue / factor) * 100) / 100 : currentValue;
      setValue("amount", beforeVat);
    } else {
      setValue("amount", currentValue);
    }

    setAmountInputMode(newMode);
  };

  // Reset to "beforeVat" mode when WHT is disabled while in "afterWht" mode
  useEffect(() => {
    if (!isWht && amountInputMode === "afterWht") {
      setAmountInputMode("beforeVat");
      if (formAmount !== undefined && formAmount !== null) {
        setDisplayAmount(String(formAmount));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWht]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="amount" className="text-foreground font-medium">
          จำนวนเงิน
        </Label>
        {(vatRate > 0 || isWht) && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleInputModeToggle("beforeVat")}
              className={`px-2 py-1 rounded transition-all ${
                amountInputMode === "beforeVat"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              ก่อน VAT
            </button>
            {vatRate > 0 && (
              <button
                type="button"
                onClick={() => handleInputModeToggle("includingVat")}
                className={`px-2 py-1 rounded transition-all ${
                  amountInputMode === "includingVat"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                รวม VAT
              </button>
            )}
            {isWht && (
              <button
                type="button"
                onClick={() => handleInputModeToggle("afterWht")}
                className={`px-2 py-1 rounded transition-all ${
                  amountInputMode === "afterWht"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                หลังหักที่จ่าย
              </button>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          ฿
        </span>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          className="pl-10 text-2xl h-14 font-semibold bg-muted/30 border-border focus:bg-background transition-colors"
          placeholder="0.00"
          value={displayAmount}
          onChange={(e) => handleAmountInput(e.target.value)}
        />
      </div>
      {amountInputMode === "includingVat" && vatRate > 0 && (
        <p className="text-xs text-muted-foreground">
          ยอดก่อน VAT: ฿{((parseFloat(displayAmount) || 0) / (1 + vatRate / 100)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      )}
      {amountInputMode === "afterWht" && isWht && (() => {
        const factor = 1 + vatRate / 100 - whtRate / 100;
        const baseAmount = factor > 0 ? (parseFloat(displayAmount) || 0) / factor : 0;
        return (
          <p className="text-xs text-muted-foreground">
            ยอดก่อน VAT: ฿{baseAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {vatRate > 0 && ` · รวม VAT: ฿${(baseAmount * (1 + vatRate / 100)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        );
      })()}
    </div>
  );
}
