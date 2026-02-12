"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Edit2, Check, X } from "lucide-react";

interface CurrencyConversionNoteProps {
  currencyConversion?: {
    detected: boolean;
    currency: string | null;
    originalAmount: number | null;
    convertedAmount: number | null;
    exchangeRate: number | null;
    conversionNote: string | null;
  };
  onRateChange?: (newRate: number, newConvertedAmount: number) => void;
}

// Currency symbols for display
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  AED: "د.إ",
  SGD: "S$",
  HKD: "HK$",
  MYR: "RM",
};

export function CurrencyConversionNote({ currencyConversion, onRateChange }: CurrencyConversionNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState<string>("");

  // Update editRate when currencyConversion changes
  useEffect(() => {
    if (currencyConversion?.exchangeRate) {
      setEditRate(currencyConversion.exchangeRate.toString());
    }
  }, [currencyConversion?.exchangeRate]);

  // Don't show if no conversion or if it's already THB
  if (!currencyConversion || !currencyConversion.detected || currencyConversion.currency === "THB") {
    return null;
  }

  // Check if conversion failed (no rate)
  const hasWarning = currencyConversion.convertedAmount === null;
  const currency = currencyConversion.currency || "USD";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const originalAmount = currencyConversion.originalAmount || 0;
  const currentRate = currencyConversion.exchangeRate || 0;

  const handleStartEdit = () => {
    setEditRate(currentRate.toString());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditRate(currentRate.toString());
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const newRate = parseFloat(editRate);
    if (isNaN(newRate) || newRate <= 0) {
      return;
    }
    
    const newConvertedAmount = Math.trunc(originalAmount * newRate * 100) / 100;
    onRateChange?.(newRate, newConvertedAmount);
    setIsEditing(false);
  };

  const handleRateInputChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setEditRate(value);
    }
  };

  // Calculate preview amount when editing
  const previewAmount = isEditing && editRate 
    ? Math.trunc(originalAmount * parseFloat(editRate) * 100) / 100 
    : null;

  return (
    <Alert className={hasWarning ? "border-amber-500 bg-amber-50 dark:bg-amber-950" : "border-blue-500 bg-blue-50 dark:bg-blue-950"}>
      <DollarSign className={`h-4 w-4 ${hasWarning ? "text-amber-600" : "text-blue-600"}`} />
      <AlertDescription className={`text-sm ${hasWarning ? "text-amber-900 dark:text-amber-100" : "text-blue-900 dark:text-blue-100"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <strong>💱 {hasWarning ? "แปลงสกุลเงินไม่สำเร็จ" : "แปลงสกุลเงินอัตโนมัติ"}:</strong>
            {!isEditing ? (
              <span className="ml-1">
                แปลงจาก {symbol}{originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency} @ ฿{currentRate.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="ml-1 inline-flex items-center gap-2 flex-wrap">
                แปลงจาก {symbol}{originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency} @
                <span className="inline-flex items-center gap-1">
                  <span>฿</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editRate}
                    onChange={(e) => handleRateInputChange(e.target.value)}
                    className="w-20 h-6 px-1 py-0 text-sm inline-block"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                </span>
                {previewAmount !== null && !isNaN(previewAmount) && (
                  <span className="text-xs opacity-75">
                    = ฿{previewAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </span>
            )}
          </div>
          
          {onRateChange && (
            <div className="flex items-center gap-1 shrink-0">
              {!isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={handleStartEdit}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  แก้ไข
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={handleSaveEdit}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
