"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  User,
} from "lucide-react";
import { DocumentSection } from "@/components/transactions";
import { CombinedHistorySection } from "@/components/transactions";
import { CommentSection } from "@/components/comments/CommentSection";
import type { UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import type { BaseTransaction } from "./hooks/useTransactionForm";

interface TransactionSidePanelProps {
  config: UnifiedTransactionConfig;
  transaction: BaseTransaction;
  companyCode: string;
  uploadingType: string | null;
  onFileUpload: (file: File, type: "slip" | "invoice" | "wht" | "other") => Promise<void>;
  onFileDelete: (type: "slip" | "invoice" | "wht" | "other", url: string) => Promise<void>;
  auditRefreshKey: number;
  currentUserId?: string;
}

export function TransactionSidePanel({
  config,
  transaction,
  companyCode,
  uploadingType,
  onFileUpload,
  onFileDelete,
  auditRefreshKey,
  currentUserId,
}: TransactionSidePanelProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            {config.type === "expense" ? "หลักฐานการจ่าย" : "หลักฐานการรับเงิน"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <DocumentSection
            label={config.fileFields.slip.label}
            urls={(transaction[config.fileFields.slip.urlsField] as string[]) || []}
            onUpload={(file) => onFileUpload(file, "slip")}
            onDelete={(url) => onFileDelete("slip", url)}
            isUploading={uploadingType === "slip"}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <DocumentSection
            label={config.fileFields.invoice.label}
            urls={(transaction[config.fileFields.invoice.urlsField] as string[]) || []}
            onUpload={(file) => onFileUpload(file, "invoice")}
            onDelete={(url) => onFileDelete("invoice", url)}
            isUploading={uploadingType === "invoice"}
            icon={<FileText className="h-4 w-4" />}
          />

          {(transaction[config.fields.whtField.name] as boolean) && (
            <DocumentSection
              label={config.fileFields.wht.label}
              urls={(transaction[config.fileFields.wht.urlsField] as string[]) || []}
              onUpload={(file) => onFileUpload(file, "wht")}
              onDelete={(url) => onFileDelete("wht", url)}
              isUploading={uploadingType === "wht"}
              icon={<FileText className="h-4 w-4" />}
            />
          )}

          <DocumentSection
            label="เอกสารอื่นๆ"
            urls={
              ((transaction.otherDocUrls as Array<string | { url: string }>) || []).map((item) =>
                typeof item === 'string' ? item : item.url
              ).filter(Boolean)
            }
            onUpload={(file) => onFileUpload(file, "other")}
            onDelete={(url) => onFileDelete("other", url)}
            isUploading={uploadingType === "other"}
            icon={<FileText className="h-4 w-4" />}
          />
        </CardContent>

        <div className="px-6 py-4 border-t bg-muted/40 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              สร้างโดย
            </span>
            <span className="font-medium text-foreground">
              {transaction.creator?.name || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              วันที่สร้าง
            </span>
            <span>{new Date(transaction.createdAt).toLocaleDateString("th-TH")}</span>
          </div>
        </div>
      </Card>

      <CombinedHistorySection
        companyCode={companyCode}
        companyId={transaction.companyId}
        entityType={config.entityType}
        entityId={transaction.id}
        expenseId={config.type === "expense" ? transaction.id : undefined}
        incomeId={config.type === "income" ? transaction.id : undefined}
        refreshKey={auditRefreshKey}
      />

      {currentUserId && (
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="pt-6">
            <CommentSection
              companyCode={companyCode}
              entityType={config.type}
              entityId={transaction.id}
              currentUserId={currentUserId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
