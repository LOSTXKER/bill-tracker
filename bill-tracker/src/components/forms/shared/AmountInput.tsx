"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AmountInputMode, FormWatch, FormSetValue } from "./transaction-fields-types";

interface AmountInputProps {
  watch: FormWatch;
  setValue: FormSetValue;
  vatRate: number;
  isWht: boolean;
  onModeChange?: (mode: AmountInputMode) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const trunc2 = (n: number) => Math.trunc(n * 100) / 100;

/**
 * Convert stored base amount → display value for the given input mode.
 * Uses truncation to avoid showing values larger than the actual amount.
 */
function baseToDisplay(base: number, mode: AmountInputMode, vatRate: number, whtRate: number): number {
  if (mode === "includingVat" && vatRate > 0) {
    return trunc2(base * (1 + vatRate / 100));
  }
  if (mode === "afterWht" && whtRate > 0) {
    const factor = 1 + vatRate / 100 - whtRate / 100;
    return trunc2(base * factor);
  }
  return base;
}

/**
 * Reverse-calculate the stored base amount from the user's display value.
 * Uses rounding for the stored value to minimize accumulated error.
 */
function displayToBase(display: number, mode: AmountInputMode, vatRate: number, whtRate: number): number {
  if (mode === "includingVat" && vatRate > 0) {
    return round2(display / (1 + vatRate / 100));
  }
  if (mode === "afterWht" && whtRate > 0) {
    const factor = 1 + vatRate / 100 - whtRate / 100;
    return factor > 0 ? round2(display / factor) : display;
  }
  return display;
}

export function AmountInput({ watch, setValue, vatRate, isWht, onModeChange }: AmountInputProps) {
  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");
  const [displayAmount, setDisplayAmount] = useState<string>("");

  const isUserInputRef = useRef(false);
  const prevRatesRef = useRef({ vatRate, whtRate: 0 });

  const whtRate = (watch("whtRate") as number) || 0;
  const formAmount = watch("amount") as number | undefined;

  const canUseAfterWht = isWht && whtRate > 0;

  // ---------------------------------------------------------------------------
  // Derive effective mode: auto-fallback when preconditions are lost.
  // When the effective mode differs we update the state in a
  // getDerivedStateFromProps-style block (React-approved during render).
  // ---------------------------------------------------------------------------
  const effectiveMode = useMemo(() => {
    if (amountInputMode === "afterWht" && (!isWht || whtRate <= 0)) return "beforeVat" as const;
    if (amountInputMode === "includingVat" && vatRate <= 0) return "beforeVat" as const;
    return amountInputMode;
  }, [amountInputMode, isWht, whtRate, vatRate]);

  if (effectiveMode !== amountInputMode) {
    setAmountInputMode(effectiveMode);
    onModeChange?.(effectiveMode);
  }

  // ---------------------------------------------------------------------------
  // Sync display ↔ base when external values change.
  //
  // Two behaviours depending on what triggered the change:
  //  A) Rate changed while in a derived mode → keep display (user intent),
  //     recalculate the stored base so the summary stays consistent.
  //  B) Everything else (external base change, mode change) →
  //     recompute display from the stored base.
  //
  // The ref-gated early-return ensures user-driven changes (typing / mode
  // toggle) are never overwritten by this effect.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const ratesChanged =
      vatRate !== prevRatesRef.current.vatRate ||
      whtRate !== prevRatesRef.current.whtRate;
    prevRatesRef.current = { vatRate, whtRate };

    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }

    // (A) Rates changed in a derived mode — preserve display, recalc base
    if (ratesChanged && effectiveMode !== "beforeVat") {
      const display = parseFloat(displayAmount) || 0;
      if (display > 0) {
        const modeStillValid =
          (effectiveMode === "afterWht" && isWht && whtRate > 0) ||
          (effectiveMode === "includingVat" && vatRate > 0);
        if (modeStillValid) {
          const newBase = displayToBase(display, effectiveMode, vatRate, whtRate);
          isUserInputRef.current = true;
          setValue("amount", newBase);
          return;
        }
      }
    }

    // (B) Default — compute display from the stored base
    if (formAmount !== undefined && formAmount !== null) {
      if (effectiveMode === "includingVat" && vatRate > 0) {
        setDisplayAmount(String(trunc2(formAmount * (1 + vatRate / 100))));
      } else if (effectiveMode === "afterWht" && isWht && whtRate > 0) {
        const factor = 1 + vatRate / 100 - whtRate / 100;
        setDisplayAmount(String(trunc2(formAmount * factor)));
      } else {
        setDisplayAmount(String(formAmount));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- displayAmount is intentionally excluded to avoid cycles
  }, [formAmount, effectiveMode, vatRate, isWht, whtRate, setValue]);

  // ---------------------------------------------------------------------------
  // User types a value — display is authoritative, reverse-calc base
  // ---------------------------------------------------------------------------
  const handleAmountInput = (value: string) => {
    const dotIndex = value.indexOf(".");
    const truncatedValue =
      dotIndex !== -1 && value.length - dotIndex > 3
        ? value.slice(0, dotIndex + 3)
        : value;

    setDisplayAmount(truncatedValue);

    const parsed = parseFloat(truncatedValue);
    const numValue = isNaN(parsed) ? 0 : parsed;

    isUserInputRef.current = true;
    const base = displayToBase(numValue, effectiveMode, vatRate, whtRate);
    setValue("amount", base);
  };

  // ---------------------------------------------------------------------------
  // User toggles input mode — stored base stays, only the display changes
  // ---------------------------------------------------------------------------
  const handleInputModeToggle = (newMode: AmountInputMode) => {
    if (newMode === amountInputMode) return;
    if (newMode === "afterWht" && !canUseAfterWht) return;

    const base = formAmount || 0;
    const newDisplay = baseToDisplay(base, newMode, vatRate, whtRate);

    isUserInputRef.current = true;
    setAmountInputMode(newMode);
    setDisplayAmount(String(newDisplay));
    onModeChange?.(newMode);
  };

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
                disabled={!canUseAfterWht}
                title={!canUseAfterWht ? "เลือกอัตราหัก ณ ที่จ่ายก่อน" : undefined}
                className={`px-2 py-1 rounded transition-all ${
                  amountInputMode === "afterWht"
                    ? "bg-primary text-primary-foreground font-medium"
                    : !canUseAfterWht
                      ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
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
          ยอดก่อน VAT: ฿
          {((parseFloat(displayAmount) || 0) / (1 + vatRate / 100)).toLocaleString(
            "th-TH",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}
        </p>
      )}
      {amountInputMode === "afterWht" &&
        canUseAfterWht &&
        (() => {
          const factor = 1 + vatRate / 100 - whtRate / 100;
          const baseAmount =
            factor > 0 ? (parseFloat(displayAmount) || 0) / factor : 0;
          return (
            <p className="text-xs text-muted-foreground">
              ยอดก่อน VAT: ฿
              {baseAmount.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {vatRate > 0 &&
                ` · รวม VAT: ฿${(
                  baseAmount *
                  (1 + vatRate / 100)
                ).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
            </p>
          );
        })()}
    </div>
  );
}
