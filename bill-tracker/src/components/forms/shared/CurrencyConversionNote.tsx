"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Edit2, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface CurrencyConversionState {
  detected: boolean;
  currency: string | null;
  originalAmount: number | null;
  convertedAmount: number | null;
  exchangeRate: number | null;
  conversionNote: string | null;
}

interface CurrencyConversionNoteProps {
  currencyConversion?: CurrencyConversionState;
  onRateChange?: (newRate: number, newConvertedAmount: number) => void;
  manualMode?: boolean;
  onManualToggle?: (enabled: boolean) => void;
  onCurrencyChange?: (currency: string) => void;
  onOriginalAmountChange?: (amount: number) => void;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);

export function CurrencyConversionNote({
  currencyConversion,
  onRateChange,
  manualMode,
  onManualToggle,
  onCurrencyChange,
  onOriginalAmountChange,
}: CurrencyConversionNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState<string>("");

  useEffect(() => {
    if (currencyConversion?.exchangeRate) {
      setEditRate(currencyConversion.exchangeRate.toString());
    }
  }, [currencyConversion?.exchangeRate]);

  const isActive = currencyConversion?.detected && currencyConversion.currency !== "THB";
  const isManualInput = manualMode && onManualToggle;

  // Toggle row -- always visible when manual mode callbacks are provided
  if (isManualInput && !isActive) {
    return (
      <div className="flex items-center gap-3 py-1">
        <Switch
          id="foreign-currency"
          checked={false}
          onCheckedChange={(checked) => {
            if (checked) onManualToggle(true);
          }}
        />
        <Label htmlFor="foreign-currency" className="text-sm text-muted-foreground cursor-pointer">
          สกุลเงินต่างประเทศ
        </Label>
      </div>
    );
  }

  if (!isActive) return null;

  const currency = currencyConversion!.currency || "USD";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const originalAmount = currencyConversion!.originalAmount || 0;
  const currentRate = currencyConversion!.exchangeRate || 0;
  const hasWarning = currencyConversion!.convertedAmount === null;

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
    if (isNaN(newRate) || newRate <= 0) return;
    const newConvertedAmount = Math.trunc(originalAmount * newRate * 100) / 100;
    onRateChange?.(newRate, newConvertedAmount);
    setIsEditing(false);
  };

  const handleRateInputChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setEditRate(value);
    }
  };

  const previewAmount =
    isEditing && editRate
      ? Math.trunc(originalAmount * parseFloat(editRate) * 100) / 100
      : null;

  return (
    <div className="space-y-2">
      {/* Toggle off when in manual mode */}
      {isManualInput && (
        <div className="flex items-center gap-3 py-1">
          <Switch
            id="foreign-currency"
            checked={true}
            onCheckedChange={(checked) => {
              if (!checked) onManualToggle(false);
            }}
          />
          <Label htmlFor="foreign-currency" className="text-sm cursor-pointer">
            สกุลเงินต่างประเทศ
          </Label>
        </div>
      )}

      {/* Manual input fields */}
      {isManualInput && onCurrencyChange && onOriginalAmountChange && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">สกุลเงิน</Label>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="เลือกสกุลเงิน" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ยอดต้นทาง ({currency})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={originalAmount || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onOriginalAmountChange(isNaN(val) ? 0 : val);
              }}
              placeholder="0.00"
              className="h-9"
            />
          </div>
        </div>
      )}

      {/* Conversion info alert */}
      <Alert
        className={
          hasWarning
            ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
            : "border-blue-500 bg-blue-50 dark:bg-blue-950"
        }
      >
        <DollarSign className={`h-4 w-4 ${hasWarning ? "text-amber-600" : "text-blue-600"}`} />
        <AlertDescription
          className={`text-sm ${hasWarning ? "text-amber-900 dark:text-amber-100" : "text-blue-900 dark:text-blue-100"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <strong>
                {hasWarning ? "แปลงสกุลเงินไม่สำเร็จ" : isManualInput ? "แปลงสกุลเงิน" : "แปลงสกุลเงินอัตโนมัติ"}:
              </strong>
              {!isEditing ? (
                <span className="ml-1">
                  {symbol}
                  {originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency} @ {formatCurrency(currentRate)}
                  {currencyConversion!.convertedAmount != null && (
                    <span className="font-semibold">
                      {" "}= {formatCurrency(currencyConversion!.convertedAmount)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-2 flex-wrap">
                  {symbol}
                  {originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency} @
                  <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground">฿</span>
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
                      = {formatCurrency(previewAmount)}
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
    </div>
  );
}
