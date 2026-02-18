"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banknote, AlertTriangle } from "lucide-react";
import { formatCurrency, WHT_RATES } from "@/lib/utils/tax-calculator";
import { VatToggle } from "./VatToggle";
import { WhtSection } from "./WhtSection";
import { CalculationSummary } from "./CalculationSummary";
import { DocumentTypeSelector, ExpenseDocumentType } from "./DocumentTypeSelector";

// =============================================================================
// Types
// =============================================================================

// WHT Change confirmation info
export interface WhtChangeInfo {
  requiresConfirmation: boolean;
  message?: string;
  isLocked?: boolean;
}

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
  onWhtToggle?: (enabled: boolean, confirmed?: boolean, reason?: string) => void;
  whtRate?: number;
  whtType?: string;
  onWhtRateSelect?: (rate: number, type: string) => void;
  whtAmount: number;
  whtLabel?: string;
  whtDescription?: string;
  
  // WHT validation (for edit mode)
  whtChangeInfo?: WhtChangeInfo;
  
  // Document type (for expenses with VAT 0%)
  documentType?: ExpenseDocumentType;
  onDocumentTypeChange?: (value: ExpenseDocumentType) => void;
  
  // Calculated values
  totalWithVat: number;
  netAmount: number;
  netAmountLabel: string;

  // Layout options
  showCalculationSummary?: boolean;
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
  whtChangeInfo,
  documentType = "TAX_INVOICE",
  onDocumentTypeChange,
  totalWithVat,
  netAmount,
  netAmountLabel,
  showCalculationSummary = true,
}: TransactionAmountCardProps) {
  const isEditable = mode === "create" || mode === "edit";
  
  // For expenses: VAT 0% needs document type selection
  const isExpenseNoVat = type === "expense" && vatRate === 0;
  // WHT can be applied regardless of VAT (e.g., paying freelancers without VAT)
  const showWhtSection = true;
  
  // WHT confirmation dialog state
  const [showWhtConfirmDialog, setShowWhtConfirmDialog] = useState(false);
  const [pendingWhtChange, setPendingWhtChange] = useState<boolean | null>(null);
  const [whtChangeReason, setWhtChangeReason] = useState("");
  
  // Handle WHT toggle with confirmation check
  const handleWhtToggle = (newValue: boolean) => {
    // If locked, don't allow change
    if (whtChangeInfo?.isLocked) {
      return;
    }
    
    // If requires confirmation, show dialog
    if (whtChangeInfo?.requiresConfirmation && newValue !== whtEnabled) {
      setPendingWhtChange(newValue);
      setShowWhtConfirmDialog(true);
      return;
    }
    
    // Otherwise, proceed directly
    onWhtToggle?.(newValue);
  };
  
  // Confirm WHT change
  const handleConfirmWhtChange = () => {
    if (pendingWhtChange !== null) {
      onWhtToggle?.(pendingWhtChange, true, whtChangeReason);
    }
    setShowWhtConfirmDialog(false);
    setPendingWhtChange(null);
    setWhtChangeReason("");
  };
  
  // Cancel WHT change
  const handleCancelWhtChange = () => {
    setShowWhtConfirmDialog(false);
    setPendingWhtChange(null);
    setWhtChangeReason("");
  };

  // Create mode uses a different layout with VatToggle and WhtSection components
  if (mode === "create") {
    return (
      <div className="space-y-4">
        <VatToggle value={vatRate} onChange={(value) => onVatRateChange?.(value)} />

        {/* Show document type selector for VAT 0% expenses */}
        {isExpenseNoVat && onDocumentTypeChange && (
          <DocumentTypeSelector
            value={documentType}
            onChange={onDocumentTypeChange}
          />
        )}

        {/* WHT section - can apply regardless of VAT (e.g., freelancers without VAT registration) */}
        {showWhtSection && (
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
        )}

        {showCalculationSummary && (
          <>
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
              showWhtNote={showWhtSection && whtEnabled && !!whtRate}
            />
          </>
        )}
      </div>
    );
  }

  // View mode - clean table layout
  if (!isEditable) {
    return (
      <div className="rounded-xl bg-muted/40 p-5 space-y-3">
        <div className="flex items-center gap-2.5 pb-1">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">รายละเอียดยอดเงิน</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">จำนวนเงินก่อนภาษี</span>
            <span className="font-mono text-sm font-medium">{formatCurrency(amount)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">VAT ({vatRate}%)</span>
            <span className="font-mono text-sm">{formatCurrency(vatAmount)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">รวมเป็นเงิน</span>
            <span className="font-mono text-sm font-medium">{formatCurrency(totalWithVat)}</span>
          </div>

          {whtEnabled && whtAmount > 0 && (
            <div className="flex items-center justify-between text-destructive">
              <span className="text-sm">
                {whtLabel}{" "}
                <span className="text-xs opacity-80">
                  ({Object.entries(WHT_RATES).find(([key]) => key === whtType)?.[1]?.description || `${whtRate}%`})
                </span>
              </span>
              <span className="font-mono text-sm">-{formatCurrency(whtAmount)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{netAmountLabel}</span>
            <span className="text-xl font-bold text-emerald-600">{formatCurrency(netAmount)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode - with form controls
  return (
    <div className="rounded-xl bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">รายละเอียดยอดเงิน</span>
      </div>

      <div className="space-y-3 text-sm">
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">จำนวนเงินก่อนภาษี</span>
          <Input
            type="number"
            step="0.01"
            value={amount || ""}
            onChange={(e) => {
              // Limit to 2 decimal places without rounding
              let value = e.target.value;
              const dotIndex = value.indexOf(".");
              if (dotIndex !== -1 && value.length - dotIndex > 3) {
                value = value.slice(0, dotIndex + 3);
              }
              const parsed = parseFloat(value);
              onAmountChange?.(isNaN(parsed) ? 0 : parsed);
            }}
            className="w-40 h-9 text-right bg-background"
            placeholder="0.00"
          />
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">VAT</span>
            <Select
              value={String(vatRate || 0)}
              onValueChange={(v) => onVatRateChange?.(Number(v))}
            >
              <SelectTrigger className="w-20 h-8 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="7">7%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="font-mono">{formatCurrency(vatAmount)}</span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">รวมเป็นเงิน</span>
          <span className="font-mono font-medium">{formatCurrency(totalWithVat)}</span>
        </div>

        {/* Document Type Selector for VAT 0% expenses */}
        {isExpenseNoVat && onDocumentTypeChange && (
          <div className="pt-2">
            <DocumentTypeSelector
              value={documentType}
              onChange={onDocumentTypeChange}
            />
          </div>
        )}

        {/* WHT Toggle - can apply regardless of VAT */}
        {showWhtSection && (
          <>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{whtLabel}</span>
                <Switch
                  checked={whtEnabled}
                  onCheckedChange={handleWhtToggle}
                  disabled={whtChangeInfo?.isLocked}
                />
                {whtChangeInfo?.isLocked && (
                  <span className="text-xs text-muted-foreground">(ล็อคแล้ว)</span>
                )}
              </div>
              {whtEnabled && (
                <span className="font-mono text-destructive">-{formatCurrency(whtAmount)}</span>
              )}
            </div>

            {/* WHT Type */}
            {whtEnabled && (
              <Select
                value={whtType}
                onValueChange={(v) => {
                  const opt = Object.entries(WHT_RATES).find(([key]) => key === v);
                  if (opt) {
                    onWhtRateSelect?.(opt[1].rate, v);
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-background">
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
          </>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-semibold">{netAmountLabel}</span>
        <span className="text-xl font-bold text-emerald-600">{formatCurrency(netAmount)}</span>
      </div>
      
      {/* WHT Change Confirmation Dialog */}
      <AlertDialog open={showWhtConfirmDialog} onOpenChange={setShowWhtConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ยืนยันการเปลี่ยนหัก ณ ที่จ่าย
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {whtChangeInfo?.message || (pendingWhtChange 
                ? "คุณต้องการเปิดหัก ณ ที่จ่าย?"
                : "คุณต้องการปิดหัก ณ ที่จ่าย?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <label className="text-sm font-medium">เหตุผลในการเปลี่ยน (ไม่บังคับ)</label>
            <Textarea
              value={whtChangeReason}
              onChange={(e) => setWhtChangeReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ข้อมูลผิดพลาด, ลูกค้าแจ้งเปลี่ยน..."
              className="mt-2"
              rows={2}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWhtChange}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmWhtChange}
              className="bg-amber-600 hover:bg-amber-700"
            >
              ยืนยันการเปลี่ยน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
