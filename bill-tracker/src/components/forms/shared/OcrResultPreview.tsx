"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Building2,
  Hash,
  CalendarDays,
  Banknote,
  CreditCard,
  Percent,
  FileText,
  Brain,
  GraduationCap,
} from "lucide-react";
import type { OcrAnalysisResult } from "./DocumentUploadSection";

interface OcrResultPreviewProps {
  result: OcrAnalysisResult;
  onApply: () => void;
  onDismiss: () => void;
  onTrain?: () => void;
  isApplied?: boolean;
}

export function OcrResultPreview({
  result,
  onApply,
  onDismiss,
  onTrain,
  isApplied = false,
}: OcrResultPreviewProps) {
  const { data, smart, validation } = result;
  const confidence = data.confidence.overall;

  // Determine confidence level colors
  const getConfidenceColor = (value: number) => {
    if (value >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (value >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(value);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Payment method names
  const paymentMethodNames: Record<string, string> = {
    CASH: "เงินสด",
    BANK_TRANSFER: "โอนเงิน",
    CREDIT_CARD: "บัตรเครดิต",
    PROMPTPAY: "พร้อมเพย์",
    CHEQUE: "เช็ค",
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI วิเคราะห์เอกสาร</span>
        </div>
        <Badge className={`text-xs ${getConfidenceColor(confidence)}`}>
          {confidence}% confidence
        </Badge>
      </div>

      {/* Smart Match Info */}
      {smart?.mapping && (
        <div className="px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-green-600" />
            <span className="text-green-700 dark:text-green-400">
              จดจำได้! {smart.matchReason}
            </span>
            <Badge variant="outline" className="ml-auto text-xs border-green-500/50 text-green-600">
              {smart.matchConfidence}% match
            </Badge>
          </div>
          {smart.mapping.contactName && (
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              ผู้ติดต่อ: {smart.mapping.contactName}
              {smart.mapping.categoryName && ` • หมวดหมู่: ${smart.mapping.categoryName}`}
            </p>
          )}
        </div>
      )}

      {/* New Vendor Notice */}
      {smart?.isNewVendor && smart.suggestTraining && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <GraduationCap className="h-4 w-4" />
            <span>ร้านค้าใหม่ - สามารถสอน AI ให้จดจำได้</span>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Vendor Name */}
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">ชื่อร้าน/บริษัท</p>
              <p className="font-medium truncate">{data.vendorName || "-"}</p>
            </div>
          </div>

          {/* Tax ID */}
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">เลขผู้เสียภาษี</p>
              <p className="font-medium font-mono text-xs">
                {data.vendorTaxId || "-"}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">วันที่</p>
              <p className="font-medium">{formatDate(data.date)}</p>
            </div>
          </div>

          {/* Invoice Number */}
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">เลขที่ใบเสร็จ</p>
              <p className="font-medium font-mono text-xs truncate">
                {data.invoiceNumber || "-"}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-start gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">ยอดก่อน VAT</p>
              <p className="font-medium">{formatCurrency(data.amount)}</p>
            </div>
          </div>

          {/* VAT */}
          <div className="flex items-start gap-2">
            <Percent className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">VAT</p>
              <p className="font-medium">
                {data.vatRate !== null ? `${data.vatRate}%` : "-"}
                {data.vatAmount !== null && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({formatCurrency(data.vatAmount)})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-start gap-2">
            <Banknote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">ยอดรวมทั้งหมด</p>
              <p className="font-semibold text-primary">
                {formatCurrency(data.totalAmount)}
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">วิธีชำระเงิน</p>
              <p className="font-medium">
                {data.paymentMethod
                  ? paymentMethodNames[data.paymentMethod] || data.paymentMethod
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">หมายเหตุ:</p>
                <ul className="text-xs list-disc list-inside mt-1 space-y-0.5">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {!isApplied ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              className="flex-1 gap-2"
            >
              <Check className="h-4 w-4" />
              ใช้ข้อมูลนี้
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 py-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>กรอกข้อมูลแล้ว</span>
          </div>
        )}

        {/* Train Button */}
        {smart?.suggestTraining && onTrain && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onTrain}
            className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
          >
            <GraduationCap className="h-4 w-4" />
            สอน AI
          </Button>
        )}
      </div>
    </div>
  );
}
