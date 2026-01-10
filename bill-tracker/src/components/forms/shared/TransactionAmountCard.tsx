"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote } from "lucide-react";
import { formatCurrency, WHT_RATES } from "@/lib/utils/tax-calculator";
import { VatToggle } from "./VatToggle";
import { WhtSection } from "./WhtSection";
import { CalculationSummary } from "./CalculationSummary";

// =============================================================================
// Types
// =============================================================================

export interface TransactionAmountCardProps {
  mode: "create" | "view" | "edit";
  type: "expense" | "income";
  
  // Amount values
  amount: number;
  onAmountChange?: (value: number) => void;
  
  // VAT
  vatRate: number;
  onVatRateChange?: (value: number) => void;
  vatAmount: number;
  
  // WHT
  whtEnabled: boolean;
  onWhtToggle?: (enabled: boolean) => void;
  whtRate?: number;
  whtType?: string;
  onWhtRateSelect?: (rate: number, type: string) => void;
  whtAmount: number;
  whtLabel?: string;
  whtDescription?: string;
  
  // Calculated values
  totalWithVat: number;
  netAmount: number;
  netAmountLabel: string;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionAmountCard({
  mode,
  type,
  amount,
  onAmountChange,
  vatRate,
  onVatRateChange,
  vatAmount,
  whtEnabled,
  onWhtToggle,
  whtRate,
  whtType,
  onWhtRateSelect,
  whtAmount,
  whtLabel = "หัก ณ ที่จ่าย",
  whtDescription = "หักภาษีผู้ขาย?",
  totalWithVat,
  netAmount,
  netAmountLabel,
}: TransactionAmountCardProps) {
  const isEditable = mode === "create" || mode === "edit";

  // Create mode uses a different layout with VatToggle and WhtSection components
  if (mode === "create") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">ภาษีและยอดเงิน</h3>
        
        <VatToggle value={vatRate} onChange={(value) => onVatRateChange?.(value)} />

        <WhtSection
          isEnabled={whtEnabled}
          onToggle={(enabled) => {
            onWhtToggle?.(enabled);
          }}
          selectedRate={whtRate}
          onRateSelect={(rate, whtTypeValue) => {
            onWhtRateSelect?.(rate, whtTypeValue);
          }}
          label={whtLabel}
          description={whtDescription}
        />

        <Separator />

        <CalculationSummary
          baseAmount={amount}
          vatRate={vatRate}
          vatAmount={vatAmount}
          totalWithVat={totalWithVat}
          whtRate={whtRate}
          whtAmount={whtAmount}
          netAmount={netAmount}
          type={type}
          showWhtNote={whtEnabled && !!whtRate}
        />
      </div>
    );
  }

  // View/Edit mode uses a Card layout
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          รายละเอียดยอดเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount before tax */}
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">จำนวนเงินก่อนภาษี</Label>
          {isEditable ? (
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => onAmountChange?.(Number(e.target.value) || 0)}
              className="w-40 h-10 text-right bg-muted/30"
              placeholder="0.00"
            />
          ) : (
            <span className="font-mono font-medium">{formatCurrency(amount)}</span>
          )}
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">VAT</Label>
            {isEditable && (
              <Select
                value={String(vatRate || 0)}
                onValueChange={(v) => onVatRateChange?.(Number(v))}
              >
                <SelectTrigger className="w-20 h-8 bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="7">7%</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!isEditable && <span className="text-sm text-muted-foreground">({vatRate}%)</span>}
          </div>
          <span className="font-mono">{formatCurrency(vatAmount)}</span>
        </div>

        <div className="h-px bg-border" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">รวมเป็นเงิน</Label>
          <span className="font-mono font-medium">{formatCurrency(totalWithVat)}</span>
        </div>

        {/* WHT Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">{whtLabel}</Label>
            {isEditable && (
              <Switch
                checked={whtEnabled}
                onCheckedChange={(checked) => onWhtToggle?.(checked)}
              />
            )}
          </div>
          {whtEnabled && (
            <span className="font-mono text-destructive">-{formatCurrency(whtAmount)}</span>
          )}
        </div>

        {/* WHT Type Selector */}
        {isEditable && whtEnabled && (
          <Select
            value={whtType}
            onValueChange={(v) => {
              const opt = Object.entries(WHT_RATES).find(([key]) => key === v);
              if (opt) {
                onWhtRateSelect?.(opt[1].rate, v);
              }
            }}
          >
            <SelectTrigger className="h-10 bg-muted/30">
              <SelectValue placeholder="เลือกประเภทหัก ณ ที่จ่าย..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WHT_RATES).map(([key, { rate, description }]) => (
                <SelectItem key={key} value={key}>
                  {description} ({rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!isEditable && whtEnabled && whtType && (
          <div className="text-sm text-muted-foreground">
            ประเภท: {Object.entries(WHT_RATES).find(([key]) => key === whtType)?.[1]?.description}
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Net Amount */}
        <div className="flex items-center justify-between pt-2">
          <Label className="text-base font-medium">{netAmountLabel}</Label>
          <span className="text-xl font-bold text-emerald-600">{formatCurrency(netAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
