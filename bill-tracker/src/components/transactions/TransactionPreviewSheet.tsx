"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApprovalBadge } from "@/components/transactions/ApprovalBadge";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import {
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Building,
  FileText,
  Receipt,
  CreditCard,
  Tag,
  Clock,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from "lucide-react";
import type { ApprovalStatus } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type PreviewTransactionType = "expense" | "income";

interface TransactionPreviewData {
  id: string;
  // Expense fields
  description?: string | null;
  billDate?: string | null;
  netPaid?: number | bigint | null;
  amount?: number | bigint | null;
  vatAmount?: number | bigint | null;
  isWht?: boolean;
  whtRate?: number | null;
  whtAmount?: number | bigint | null;
  taxInvoiceUrls?: string[];
  slipUrls?: string[];
  whtCertUrls?: string[];
  otherDocUrls?: string[];
  // Income fields
  source?: string | null;
  receiveDate?: string | null;
  netReceived?: number | bigint | null;
  isWhtDeducted?: boolean;
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  // Common fields
  notes?: string | null;
  invoiceNumber?: string | null;
  referenceNo?: string | null;
  status?: string;
  workflowStatus?: string;
  approvalStatus?: ApprovalStatus | null;
  documentType?: string | null;
  Contact?: { id: string; name: string } | null;
  contactName?: string | null;
  Account?: { id: string; code: string; name: string } | null;
  Company?: { id: string; name: string; code: string } | null;
  creator?: { id: string; name: string; email: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface TransactionPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  transactionType: PreviewTransactionType;
  companyCode: string;
}

// =============================================================================
// Image Viewer Component
// =============================================================================

function ImageViewer({ 
  urls, 
  title 
}: { 
  urls: string[]; 
  title: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (!urls || urls.length === 0) return null;

  const currentUrl = urls[currentIndex];
  const urlString = typeof currentUrl === "string" ? currentUrl : String(currentUrl || "");
  const isPdf = urlString.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
        {/* Main Image/PDF Preview */}
        <div className="relative aspect-video flex items-center justify-center bg-muted/50">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2" />
              <p className="text-sm">PDF Document</p>
              <a
                href={urlString}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1"
              >
                เปิดดู PDF
              </a>
            </div>
          ) : (
            <img
              src={urlString}
              alt={`${title} ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onClick={() => setShowFullscreen(true)}
            />
          )}

          {/* Navigation Buttons */}
          {urls.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          {!isPdf && (
            <button
              onClick={() => setShowFullscreen(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div className="flex gap-1 p-2 overflow-x-auto">
            {urls.map((url, index) => {
              const thumbUrlStr = typeof url === "string" ? url : String(url || "");
              const isThumbPdf = thumbUrlStr.toLowerCase().endsWith(".pdf");
              return (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                    index === currentIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {isThumbPdf ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={thumbUrlStr}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Counter */}
        <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-0.5 rounded">
          {currentIndex + 1} / {urls.length}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && !isPdf && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={urlString}
            alt="Fullscreen"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Info Row Component
// =============================================================================

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TransactionPreviewSheet({
  open,
  onOpenChange,
  transactionId,
  transactionType,
  companyCode,
}: TransactionPreviewSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TransactionPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch transaction data when sheet opens
  const fetchData = useCallback(async () => {
    if (!transactionId) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = transactionType === "expense" 
        ? `/api/expenses/${transactionId}`
        : `/api/incomes/${transactionId}`;

      const res = await fetch(endpoint);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลได้");
      }

      setData(result.data?.[transactionType] || result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [transactionId, transactionType]);

  useEffect(() => {
    if (open && transactionId) {
      fetchData();
    } else {
      // Reset state when closing
      setData(null);
      setError(null);
    }
  }, [open, transactionId, fetchData]);

  // Navigate to full detail page
  const handleViewFull = () => {
    const path = transactionType === "expense" ? "expenses" : "incomes";
    const code = typeof companyCode === "string" ? companyCode.toLowerCase() : String(companyCode || "").toLowerCase();
    router.push(`/${code}/${path}/${transactionId}`);
    onOpenChange(false);
  };

  // Get amount based on type
  const amount = transactionType === "expense" 
    ? toNumber(data?.netPaid) 
    : toNumber(data?.netReceived);

  // Get all document URLs
  const getAllDocuments = () => {
    if (!data) return [];
    
    const docs: { title: string; urls: string[] }[] = [];
    
    if (transactionType === "expense") {
      if (data.taxInvoiceUrls?.length) docs.push({ title: "ใบกำกับภาษี", urls: data.taxInvoiceUrls });
      if (data.slipUrls?.length) docs.push({ title: "สลิปโอนเงิน", urls: data.slipUrls });
      if (data.whtCertUrls?.length) docs.push({ title: "ใบหัก ณ ที่จ่าย (50 ทวิ)", urls: data.whtCertUrls });
    } else {
      if (data.customerSlipUrls?.length) docs.push({ title: "สลิปจากลูกค้า", urls: data.customerSlipUrls });
      if (data.myBillCopyUrls?.length) docs.push({ title: "สำเนาบิล", urls: data.myBillCopyUrls });
      if (data.whtCertUrls?.length) docs.push({ title: "ใบหัก ณ ที่จ่าย", urls: data.whtCertUrls });
    }
    
    if (data.otherDocUrls?.length) docs.push({ title: "เอกสารอื่นๆ", urls: data.otherDocUrls });
    
    return docs;
  };

  const documents = getAllDocuments();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md md:max-w-lg p-0 h-full overflow-hidden flex flex-col"
      >
        {/* Header - Fixed */}
        <SheetHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b bg-background">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold">
                {transactionType === "expense" ? "รายจ่าย" : "รายรับ"}
              </SheetTitle>
              <SheetDescription className="text-sm truncate mt-0.5">
                {data?.Contact?.name || data?.contactName || "กำลังโหลด..."}
              </SheetDescription>
            </div>
            {data && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge
                  status={data.workflowStatus || data.status || "DRAFT"}
                  type={transactionType}
                  documentType={transactionType === "expense" ? (data.documentType as any) : undefined}
                  approvalStatus={data.approvalStatus}
                />
                {data.approvalStatus && data.approvalStatus !== "NOT_REQUIRED" && (
                  <ApprovalBadge status={data.approvalStatus} size="sm" />
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="text-center py-16 text-destructive">
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={fetchData} className="mt-4">
                  ลองใหม่
                </Button>
              </div>
            )}

            {data && !loading && (
              <>
                {/* Amount Card - Compact */}
                <div className="rounded-lg border bg-gradient-to-br from-card to-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {transactionType === "expense" ? "ยอดจ่ายสุทธิ" : "ยอดรับสุทธิ"}
                  </p>
                  <p className={`text-2xl font-bold ${
                    transactionType === "expense" ? "text-destructive" : "text-primary"
                  }`}>
                    {formatCurrency(amount)}
                  </p>

                  {/* Amount breakdown - Inline */}
                  {(data.amount || data.vatAmount || data.whtAmount) && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-0.5">
                      {data.amount && (
                        <div className="flex justify-between">
                          <span>ยอดก่อน VAT</span>
                          <span>{formatCurrency(toNumber(data.amount))}</span>
                        </div>
                      )}
                      {data.vatAmount && toNumber(data.vatAmount) > 0 && (
                        <div className="flex justify-between">
                          <span>VAT 7%</span>
                          <span>+{formatCurrency(toNumber(data.vatAmount))}</span>
                        </div>
                      )}
                      {(data.isWht || data.isWhtDeducted) && data.whtAmount && toNumber(data.whtAmount) > 0 && (
                        <div className="flex justify-between">
                          <span>หัก ณ ที่จ่าย {data.whtRate ? `(${data.whtRate}%)` : ""}</span>
                          <span>-{formatCurrency(toNumber(data.whtAmount))}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Details - Grid Layout */}
                <div className="rounded-lg border bg-card p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    รายละเอียด
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Contact */}
                    {(data.Contact?.name || data.contactName) && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">ผู้ติดต่อ</p>
                        <p className="font-medium">{data.Contact?.name || data.contactName}</p>
                      </div>
                    )}
                    
                    {/* Date */}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {transactionType === "expense" ? "วันที่บิล" : "วันที่รับ"}
                      </p>
                      <p className="font-medium">
                        {(transactionType === "expense" ? data.billDate : data.receiveDate)
                          ? formatThaiDate(new Date(transactionType === "expense" ? data.billDate! : data.receiveDate!))
                          : "-"}
                      </p>
                    </div>

                    {/* Created */}
                    <div>
                      <p className="text-xs text-muted-foreground">สร้างเมื่อ</p>
                      <p className="font-medium">
                        {data.createdAt ? formatThaiDate(new Date(data.createdAt)) : "-"}
                      </p>
                    </div>

                    {/* Account */}
                    {data.Account && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">หมวดหมู่บัญชี</p>
                        <p className="font-medium">{data.Account.code} {data.Account.name}</p>
                      </div>
                    )}

                    {/* Description */}
                    {(data.description || data.source) && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          {transactionType === "expense" ? "รายละเอียด" : "แหล่งที่มา"}
                        </p>
                        <p className="font-medium">{transactionType === "expense" ? data.description : data.source}</p>
                      </div>
                    )}

                    {/* Invoice Number */}
                    {data.invoiceNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">เลขที่เอกสาร</p>
                        <p className="font-medium">{data.invoiceNumber}</p>
                      </div>
                    )}

                    {/* Reference */}
                    {data.referenceNo && (
                      <div>
                        <p className="text-xs text-muted-foreground">เลขอ้างอิง</p>
                        <p className="font-medium">{data.referenceNo}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {data.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                        <p className="font-medium text-muted-foreground">{data.notes}</p>
                      </div>
                    )}

                    {/* Creator */}
                    {data.creator && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">สร้างโดย</p>
                        <p className="font-medium">{data.creator.name}</p>
                      </div>
                    )}
                  </div>

                  {/* WHT Badge */}
                  {(data.isWht || data.isWhtDeducted) && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                        <Receipt className="h-3 w-3 mr-1" />
                        หัก ณ ที่จ่าย {data.whtRate ? `${data.whtRate}%` : ""}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Documents */}
                {documents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5" />
                      เอกสารแนบ ({documents.reduce((acc, d) => acc + d.urls.length, 0)} ไฟล์)
                    </h4>
                    
                    {documents.map((doc, index) => (
                      <ImageViewer
                        key={index}
                        urls={doc.urls}
                        title={doc.title}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom padding for scroll */}
                <div className="h-4" />
              </>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <SheetFooter className="flex-shrink-0 p-3 border-t bg-muted/30">
          <Button
            onClick={handleViewFull}
            className="w-full"
            size="sm"
            disabled={loading || !!error}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            ดูรายละเอียดเต็ม / แก้ไข
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
