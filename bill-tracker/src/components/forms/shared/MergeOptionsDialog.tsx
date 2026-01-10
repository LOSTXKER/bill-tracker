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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  PlusCircle,
  Replace,
  XCircle,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface MergeData {
  // ข้อมูลทางการเงิน
  amount: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  
  // ข้อมูลผู้ขาย
  vendorName: string | null;
  vendorTaxId: string | null;
  contactId: string | null;
  
  // รายละเอียด
  date: string | null;
  invoiceNumber: string | null;
  description: string | null;
  categoryId?: string | null;  // Legacy - use accountId instead
  accountId: string | null;    // Chart of Accounts
  paymentMethod: string | null;
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

function formatAmount(amount: number | null): string {
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

// =============================================================================
// Component
// =============================================================================

export function MergeOptionsDialog({
  open,
  onOpenChange,
  existingData,
  newData,
  onDecision,
}: MergeOptionsDialogProps) {
  const [selectedAction, setSelectedAction] = useState<MergeAction>("merge");

  // Calculate merged amounts
  const mergedAmount =
    (existingData.amount || 0) + (newData.amount || 0);
  const mergedVatAmount =
    (existingData.vatAmount || 0) + (newData.vatAmount || 0);

  // Check if vendors are the same
  const vendorMatch =
    existingData.vendorName === newData.vendorName ||
    existingData.vendorTaxId === newData.vendorTaxId;

  // Handle confirm
  const handleConfirm = () => {
    if (selectedAction === "cancel") {
      onDecision({ action: "cancel" });
      onOpenChange(false);
      return;
    }

    if (selectedAction === "replace") {
      onDecision({
        action: "replace",
        mergedData: newData,
      });
      onOpenChange(false);
      return;
    }

    // Merge action
    const merged: MergeData = {
      // รวมยอดเงิน
      amount: mergedAmount,
      vatAmount: mergedVatAmount,
      vatRate: newData.vatRate ?? existingData.vatRate,

      // ใช้ข้อมูลเดิมถ้ามี มิเช่นนั้นใช้ข้อมูลใหม่
      vendorName: existingData.vendorName || newData.vendorName,
      vendorTaxId: existingData.vendorTaxId || newData.vendorTaxId,
      contactId: existingData.contactId || newData.contactId,

      // ใช้วันที่เก่าสุด
      date: existingData.date || newData.date,
      invoiceNumber: existingData.invoiceNumber || newData.invoiceNumber,
      description: existingData.description || newData.description,
      categoryId: existingData.categoryId || newData.categoryId,
      accountId: existingData.accountId || newData.accountId,
      paymentMethod: existingData.paymentMethod || newData.paymentMethod,
    };

    onDecision({
      action: "merge",
      mergedData: merged,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            มีข้อมูลอยู่แล้ว
          </DialogTitle>
          <DialogDescription>
            คุณมีข้อมูลที่กรอกไว้แล้ว AI วิเคราะห์ได้ข้อมูลใหม่ คุณต้องการทำอย่างไร?
          </DialogDescription>
        </DialogHeader>

        {/* Data Comparison */}
        <div className="space-y-4">
          {/* Amount Comparison */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              ยอดเงิน
            </h4>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">เดิม</p>
                <p className="text-lg font-semibold">
                  {formatAmount(existingData.amount)}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">ใหม่</p>
                <p className="text-lg font-semibold text-primary">
                  {formatAmount(newData.amount)}
                </p>
              </div>
            </div>

            {selectedAction === "merge" && (
              <div className="mt-2 pt-2 border-t text-center bg-green-50 dark:bg-green-950/30 -mx-4 -mb-4 p-3 rounded-b-lg">
                <p className="text-xs text-muted-foreground mb-1">รวมแล้ว</p>
                <p className="text-xl font-bold text-green-600">
                  {formatAmount(mergedAmount)} บาท
                </p>
              </div>
            )}
          </div>

          {/* Vendor Comparison */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                ร้าน/ผู้ขาย
              </h4>
              {vendorMatch ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  ตรงกัน
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  ต่างกัน
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">เดิม</p>
                <p className="font-medium">
                  {existingData.vendorName || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ใหม่</p>
                <p className="font-medium text-primary">
                  {newData.vendorName || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Date Comparison */}
          <div className="flex justify-between text-sm px-1">
            <span className="text-muted-foreground">วันที่:</span>
            <span>
              {formatDate(existingData.date)} → {formatDate(newData.date)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Action Options */}
        <RadioGroup
          value={selectedAction}
          onValueChange={(v) => setSelectedAction(v as MergeAction)}
          className="space-y-3"
        >
          <div
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedAction === "merge"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
            onClick={() => setSelectedAction("merge")}
          >
            <RadioGroupItem value="merge" id="merge" />
            <Label
              htmlFor="merge"
              className="flex-1 cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4 text-green-600" />
              <div>
                <span className="font-medium">รวมยอด</span>
                <span className="text-xs text-muted-foreground ml-2">
                  เพิ่มยอดใหม่เข้ากับยอดเดิม
                </span>
              </div>
            </Label>
          </div>

          <div
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedAction === "replace"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
            onClick={() => setSelectedAction("replace")}
          >
            <RadioGroupItem value="replace" id="replace" />
            <Label
              htmlFor="replace"
              className="flex-1 cursor-pointer flex items-center gap-2"
            >
              <Replace className="h-4 w-4 text-blue-600" />
              <div>
                <span className="font-medium">แทนที่ทั้งหมด</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ใช้ข้อมูลใหม่ทับข้อมูลเดิม
                </span>
              </div>
            </Label>
          </div>

          <div
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedAction === "cancel"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
            onClick={() => setSelectedAction("cancel")}
          >
            <RadioGroupItem value="cancel" id="cancel" />
            <Label
              htmlFor="cancel"
              className="flex-1 cursor-pointer flex items-center gap-2"
            >
              <XCircle className="h-4 w-4 text-gray-500" />
              <div>
                <span className="font-medium">ยกเลิก</span>
                <span className="text-xs text-muted-foreground ml-2">
                  เก็บไฟล์ แต่ไม่เปลี่ยนข้อมูลในฟอร์ม
                </span>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button onClick={handleConfirm}>ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
