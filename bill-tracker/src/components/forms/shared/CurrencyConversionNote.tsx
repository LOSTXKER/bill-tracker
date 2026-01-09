"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign } from "lucide-react";

interface CurrencyConversionNoteProps {
  currencyConversion?: {
    detected: boolean;
    currency: string | null;
    originalAmount: number | null;
    convertedAmount: number | null;
    exchangeRate: number | null;
    conversionNote: string | null;
  };
}

export function CurrencyConversionNote({ currencyConversion }: CurrencyConversionNoteProps) {
  // Don't show if no conversion or if it's already THB
  if (!currencyConversion || !currencyConversion.detected || currencyConversion.currency === "THB") {
    return null;
  }

  // Don't show if no conversion note
  if (!currencyConversion.conversionNote) {
    return null;
  }

  // Check if conversion failed (no rate)
  const hasWarning = currencyConversion.convertedAmount === null;

  return (
    <Alert className={hasWarning ? "border-amber-500 bg-amber-50 dark:bg-amber-950" : "border-blue-500 bg-blue-50 dark:bg-blue-950"}>
      <DollarSign className={`h-4 w-4 ${hasWarning ? "text-amber-600" : "text-blue-600"}`} />
      <AlertDescription className={`text-sm ${hasWarning ? "text-amber-900 dark:text-amber-100" : "text-blue-900 dark:text-blue-100"}`}>
        <strong>💱 {hasWarning ? "แปลงสกุลเงินไม่สำเร็จ" : "แปลงสกุลเงินอัตโนมัติ"}:</strong>{" "}
        {currencyConversion.conversionNote}
      </AlertDescription>
    </Alert>
  );
}
