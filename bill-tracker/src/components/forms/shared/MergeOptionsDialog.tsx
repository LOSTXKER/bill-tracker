"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  Replace,
  XCircle,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface MergeData {
  amount: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  whtAmount?: number | null;
  whtRate?: number | null;
  vendorName: string | null;
  vendorTaxId: string | null;
  contactId: string | null;
  date: string | null;
  invoiceNumber: string | null;
  description: string | null;
  categoryId?: string | null;
  accountId: string | null;
  accountName?: string | null;
}

export type MergeAction = "merge" | "replace" | "cancel";

export interface MergeDecision {
  action: MergeAction;
  mergedData?: MergeData;
}

interface MergeOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData: MergeData;
  newData: MergeData;
  onDecision: (decision: MergeDecision) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

// =============================================================================
// Sub Components
// =============================================================================

interface DataCardProps {
  title: string;
  data: MergeData;
  variant: "existing" | "new" | "result";
  className?: string;
}

function DataCard({ title, data, variant, className }: DataCardProps) {
  const bgClass = {
    existing: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700",
    new: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    result: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800",
  }[variant];

  const titleClass = {
    existing: "text-slate-600 dark:text-slate-400",
    new: "text-blue-600 dark:text-blue-400",
    result: "text-green-700 dark:text-green-400",
  }[variant];

  const amountClass = {
    existing: "text-slate-900 dark:text-slate-100",
    new: "text-blue-700 dark:text-blue-300",
    result: "text-green-700 dark:text-green-300",
  }[variant];

  return (
    <div className={cn("rounded-lg border p-3", bgClass, className)}>
      <p className={cn("text-xs font-medium mb-2", titleClass)}>{title}</p>
      
      {/* Amount - Large */}
      <p className={cn("text-xl font-bold mb-3", amountClass)}>
        {formatAmount(data.amount)}
      </p>

      {/* Detail Fields */}
      <div className="space-y-1.5 text-xs">
        {/* Vendor */}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground flex-shrink-0">ร้าน:</span>
          <span className="font-medium truncate text-right" title={data.vendorName || "-"}>
            {data.vendorName || "-"}
          </span>
        </div>

        {/* Tax ID */}
        {data.vendorTaxId && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground flex-shrink-0">เลขภาษี:</span>
            <span className="font-medium font-mono text-right">{data.vendorTaxId}</span>
          </div>
        )}

        {/* Date */}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground flex-shrink-0">วันที่:</span>
          <span className="font-medium text-right">{formatDate(data.date)}</span>
        </div>

        {/* Invoice Number */}
        {data.invoiceNumber && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground flex-shrink-0">เลขใบกำกับ:</span>
            <span className="font-medium truncate text-right" title={data.invoiceNumber}>
              {data.invoiceNumber}
            </span>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground flex-shrink-0">รายละเอียด:</span>
            <span className="font-medium truncate text-right" title={data.description}>
              {data.description}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-dashed my-2" />

        {/* VAT */}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground flex-shrink-0">VAT:</span>
          <span className="font-medium text-right">
            {data.vatAmount ? formatAmount(data.vatAmount) : "-"}
            {data.vatRate ? ` (${data.vatRate}%)` : ""}
          </span>
        </div>

        {/* WHT */}
        {(data.whtAmount || data.whtRate) && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground flex-shrink-0">หัก ณ ที่จ่าย:</span>
            <span className="font-medium text-right text-orange-600">
              {data.whtAmount ? formatAmount(data.whtAmount) : "-"}
              {data.whtRate ? ` (${data.whtRate}%)` : ""}
            </span>
          </div>
        )}

        {/* Account */}
        {data.accountName && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground flex-shrink-0">หมวดบัญชี:</span>
            <span className="font-medium truncate text-right" title={data.accountName}>
              {data.accountName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MergeOptionsDialog({
  open,
  onOpenChange,
  existingData,
  newData,
  onDecision,
}: MergeOptionsDialogProps) {
  const [selectedAction, setSelectedAction] = useState<MergeAction>("merge");

  // Calculate result based on selected action
  const getResultData = (): MergeData => {
    if (selectedAction === "cancel") {
      return existingData;
    }
    if (selectedAction === "replace") {
      return newData;
    }
    // Merge - sum amounts, keep existing for others
    return {
      amount: (existingData.amount || 0) + (newData.amount || 0),
      vatAmount: (existingData.vatAmount || 0) + (newData.vatAmount || 0),
      vatRate: newData.vatRate ?? existingData.vatRate,
      whtAmount: (existingData.whtAmount || 0) + (newData.whtAmount || 0),
      whtRate: newData.whtRate ?? existingData.whtRate,
      vendorName: existingData.vendorName || newData.vendorName,
      vendorTaxId: existingData.vendorTaxId || newData.vendorTaxId,
      contactId: existingData.contactId || newData.contactId,
      date: existingData.date || newData.date,
      invoiceNumber: existingData.invoiceNumber || newData.invoiceNumber,
      description: existingData.description || newData.description,
      categoryId: existingData.categoryId || newData.categoryId,
      accountId: existingData.accountId || newData.accountId,
      accountName: existingData.accountName || newData.accountName,
    };
  };

  const resultData = getResultData();

  // Handle confirm
  const handleConfirm = () => {
    if (selectedAction === "cancel") {
      onDecision({ action: "cancel" });
    } else {
      onDecision({ action: selectedAction, mergedData: resultData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            มีข้อมูลอยู่แล้ว
          </DialogTitle>
          <DialogDescription>
            เลือกวิธีจัดการข้อมูล
          </DialogDescription>
        </DialogHeader>

        {/* Two columns: Existing vs New */}
        <div className="grid grid-cols-2 gap-3">
          <DataCard 
            title="📋 ข้อมูลเดิม" 
            data={existingData} 
            variant="existing" 
          />
          <DataCard 
            title="✨ ข้อมูลใหม่ (AI)" 
            data={newData} 
            variant="new" 
          />
        </div>

        {/* Action Selection */}
        <RadioGroup
          value={selectedAction}
          onValueChange={(v) => setSelectedAction(v as MergeAction)}
          className="flex gap-2"
        >
          <Label
            htmlFor="merge"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
              selectedAction === "merge"
                ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700"
                : "border-muted hover:border-green-300"
            )}
          >
            <RadioGroupItem value="merge" id="merge" className="sr-only" />
            <PlusCircle className="h-4 w-4" />
            รวมยอด
          </Label>

          <Label
            htmlFor="replace"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
              selectedAction === "replace"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700"
                : "border-muted hover:border-blue-300"
            )}
          >
            <RadioGroupItem value="replace" id="replace" className="sr-only" />
            <Replace className="h-4 w-4" />
            แทนที่
          </Label>

          <Label
            htmlFor="cancel"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
              selectedAction === "cancel"
                ? "border-gray-400 bg-gray-50 dark:bg-gray-950/30 text-gray-700"
                : "border-muted hover:border-gray-300"
            )}
          >
            <RadioGroupItem value="cancel" id="cancel" className="sr-only" />
            <XCircle className="h-4 w-4" />
            ยกเลิก
          </Label>
        </RadioGroup>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Result */}
        <DataCard 
          title={
            selectedAction === "merge" 
              ? "✅ ผลลัพธ์ (รวมยอด)" 
              : selectedAction === "replace"
              ? "✅ ผลลัพธ์ (แทนที่)"
              : "✅ ผลลัพธ์ (คงเดิม)"
          }
          data={resultData} 
          variant="result" 
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button 
            onClick={handleConfirm}
            className={cn(
              selectedAction === "merge" && "bg-green-600 hover:bg-green-700",
              selectedAction === "replace" && "bg-blue-600 hover:bg-blue-700",
              selectedAction === "cancel" && "bg-gray-600 hover:bg-gray-700"
            )}
          >
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
