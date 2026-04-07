"use client";

import { useState } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  User,
  ChevronDown,
  Clock,
  History,
  MessageSquare,
} from "lucide-react";
import { DocumentSection, DocumentChecklist } from "@/components/transactions";
import { CombinedHistorySection } from "@/components/transactions";
import type { HistoryTab } from "@/components/transactions/CombinedHistorySection";
import { CommentSection } from "@/components/comments/CommentSection";
import { cn } from "@/lib/utils";
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
  const router = useRouter();
  const [historyTab, setHistoryTab] = useState<HistoryTab>("document");
  const [commentsOpen, setCommentsOpen] = useState(true);

  const handleChecklistAction = async (action: string) => {
    const res = await fetch(`/api/${companyCode}/document-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionType: config.type,
        transactionId: transaction.id,
        action,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "เกิดข้อผิดพลาด");
    }
    router.refresh();
  };

  return (
    <div className="lg:col-span-2 space-y-3">
      <DocumentChecklist
        transactionType={config.type}
        transaction={{ ...transaction, workflowStatus: transaction.workflowStatus ?? "DRAFT" }}
        companyCode={companyCode}
        onAction={handleChecklistAction}
      />

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

        <div className="px-6 py-4 border-t text-xs text-muted-foreground space-y-2">
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
            <span>{new Date(transaction.createdAt).toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE })}</span>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              ประวัติ
            </CardTitle>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-medium transition-colors",
                  historyTab === "document"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
                onClick={() => setHistoryTab("document")}
              >
                <Clock className="h-3 w-3 mr-1.5" />
                เอกสาร
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-medium transition-colors",
                  historyTab === "audit"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
                onClick={() => setHistoryTab("audit")}
              >
                <History className="h-3 w-3 mr-1.5" />
                แก้ไข
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CombinedHistorySection
            companyCode={companyCode}
            companyId={transaction.companyId}
            entityType={config.entityType}
            entityId={transaction.id}
            expenseId={config.type === "expense" ? transaction.id : undefined}
            incomeId={config.type === "income" ? transaction.id : undefined}
            refreshKey={auditRefreshKey}
            activeTab={historyTab}
          />
        </CardContent>
      </Card>

      {currentUserId && (
        <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
          <Card className="shadow-sm border-border bg-card">
            <CollapsibleTrigger className="w-full cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    ความคิดเห็น
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    commentsOpen && "rotate-180"
                  )} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <CommentSection
                  companyCode={companyCode}
                  entityType={config.type}
                  entityId={transaction.id}
                  currentUserId={currentUserId}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
