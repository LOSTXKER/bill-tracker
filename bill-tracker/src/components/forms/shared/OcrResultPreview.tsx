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
  Receipt,
  Scissors,
} from "lucide-react";
import type { OcrAnalysisResult } from "./DocumentUploadSection";

interface OcrResultPreviewProps {
  result: OcrAnalysisResult;
  onApply: () => void;
  onDismiss: () => void;
  onTrain?: () => void;
  isApplied?: boolean;
}

// Small confidence indicator component
function ConfidenceIndicator({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/50";
    if (v >= 60) return "text-amber-600 bg-amber-100 dark:bg-amber-900/50";
    return "text-red-600 bg-red-100 dark:bg-red-900/50";
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getColor(value)}`}>
        {value}%
      </span>
    </div>
  );
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
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
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

  // Document type names
  const documentTypeNames: Record<string, string> = {
    TAX_INVOICE: "ใบกำกับภาษี",
    RECEIPT: "ใบเสร็จรับเงิน",
    INVOICE: "ใบแจ้งหนี้",
    BANK_SLIP: "สลิปโอนเงิน",
    WHT_CERT: "ใบหัก ณ ที่จ่าย",
    QUOTATION: "ใบเสนอราคา",
    PURCHASE_ORDER: "ใบสั่งซื้อ",
    DELIVERY_NOTE: "ใบส่งของ",
    OTHER: "เอกสารอื่นๆ",
  };

  // Get extended data with new fields
  const extendedData = data as typeof data & {
    documentType?: string | null;
    documentTypeConfidence?: number;
    whtRate?: number | null;
    whtAmount?: number | null;
    whtType?: string | null;
    netAmount?: number | null;
    vendorBranchNumber?: string | null;
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

      {/* Document Type Banner */}
      {extendedData.documentType && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {documentTypeNames[extendedData.documentType] || extendedData.documentType}
            </span>
            {extendedData.documentTypeConfidence && (
              <Badge variant="outline" className="ml-auto text-xs">
                {extendedData.documentTypeConfidence}%
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Vendor Name with confidence indicator */}
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground text-xs">ชื่อร้าน/บริษัท</p>
                {data.confidence.vendor < 70 && (
                  <span className="text-amber-500 text-xs" title={`ความมั่นใจ ${data.confidence.vendor}%`}>⚠</span>
                )}
              </div>
              <p className="font-medium truncate">{data.vendorName || "-"}</p>
            </div>
          </div>

          {/* Tax ID with Branch Number */}
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">เลขผู้เสียภาษี</p>
              <p className="font-medium font-mono text-xs">
                {data.vendorTaxId || "-"}
                {extendedData.vendorBranchNumber && (
                  <span className="text-muted-foreground ml-1">
                    (สาขา {extendedData.vendorBranchNumber === "00000" ? "ใหญ่" : extendedData.vendorBranchNumber})
                  </span>
                )}
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

        {/* WHT Section - shown when WHT is detected */}
        {extendedData.whtRate !== null && extendedData.whtRate !== undefined && extendedData.whtRate > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="font-medium text-sm text-violet-700 dark:text-violet-300">
                หัก ณ ที่จ่าย
              </span>
              {extendedData.whtType && (
                <Badge variant="outline" className="text-xs border-violet-300 text-violet-600">
                  {extendedData.whtType}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">อัตรา</p>
                <p className="font-medium">{extendedData.whtRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">จำนวน</p>
                <p className="font-medium text-violet-600 dark:text-violet-400">
                  -{formatCurrency(extendedData.whtAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ยอดสุทธิ</p>
                <p className="font-semibold">{formatCurrency(extendedData.netAmount)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Breakdown - shown when overall confidence is < 80 */}
        {confidence < 80 && (
          <div className="mt-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
            <p className="text-xs text-muted-foreground mb-2">ความมั่นใจแยกตามหมวด:</p>
            <div className="flex gap-3 text-xs">
              <ConfidenceIndicator label="ยอดเงิน" value={data.confidence.amount} />
              <ConfidenceIndicator label="ผู้ขาย" value={data.confidence.vendor} />
              <ConfidenceIndicator label="วันที่" value={data.confidence.date} />
            </div>
          </div>
        )}

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
