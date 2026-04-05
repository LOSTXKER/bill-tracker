"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApprovalBadge } from "@/components/transactions/ApprovalBadge";
import { ExternalLink, Loader2, ImageIcon } from "lucide-react";
import { ImageViewer } from "./ImageViewer";
import { TransactionAmountCard } from "./TransactionAmountCard";
import { TransactionDetailsCard } from "./TransactionDetailsCard";
import type {
  TransactionPreviewData,
  TransactionPreviewSheetProps,
  PreviewTransactionType,
} from "./preview-types";

export type { PreviewTransactionType };

function getDocuments(data: TransactionPreviewData, transactionType: PreviewTransactionType) {
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

  if (data.otherDocUrls?.length) {
    const otherUrls = (data.otherDocUrls as any[])
      .map((item: any) => (typeof item === "string" ? item : item?.url))
      .filter(Boolean);
    if (otherUrls.length) docs.push({ title: "เอกสารอื่นๆ", urls: otherUrls });
  }

  return docs;
}

export function TransactionPreviewSheet({
  open,
  onOpenChange,
  transactionId,
  transactionType,
  companyCode,
}: TransactionPreviewSheetProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TransactionPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!res.ok) throw new Error(result.error || "ไม่สามารถโหลดข้อมูลได้");
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
      setData(null);
      setError(null);
    }
  }, [open, transactionId, fetchData]);

  const viewFullHref = (() => {
    const path = transactionType === "expense" ? "expenses" : "incomes";
    const code = typeof companyCode === "string" ? companyCode.toLowerCase() : String(companyCode || "").toLowerCase();
    return `/${code}/${path}/${transactionId}`;
  })();

  const documents = data ? getDocuments(data, transactionType) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 h-full overflow-hidden flex flex-col"
      >
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
                <TransactionAmountCard data={data} transactionType={transactionType} />
                <TransactionDetailsCard data={data} transactionType={transactionType} />

                {documents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5" />
                      เอกสารแนบ ({documents.reduce((acc, d) => acc + d.urls.length, 0)} ไฟล์)
                    </h4>
                    {documents.map((doc, index) => (
                      <ImageViewer key={index} urls={doc.urls} title={doc.title} />
                    ))}
                  </div>
                )}

                <div className="h-4" />
              </>
            )}
          </div>
        </div>

        <SheetFooter className="flex-shrink-0 p-3 border-t bg-muted/30">
          <Button
            asChild
            className="w-full"
            size="sm"
            disabled={loading || !!error}
          >
            <Link href={viewFullHref} onClick={() => onOpenChange(false)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              ดูรายละเอียดเต็ม / แก้ไข
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
