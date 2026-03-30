"use client";

import {
  Upload,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  FileCheck,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DocumentSection } from "@/components/transactions/DocumentSection";
import {
  type DocumentUploadSectionProps,
  type DocumentCategory,
} from "./document-upload-types";
import { useDocumentUpload } from "./useDocumentUpload";
import { FilePreviewChip } from "./FilePreviewChip";

export type {
  DocumentCategory,
  CategorizedFiles,
  FileClassification,
  OcrAnalysisResult,
  MultiDocAnalysisResult,
  OtherDocType,
  TypedOtherDoc,
} from "./document-upload-types";
export { normalizeOtherDocs, getOtherDocUrls } from "./document-upload-types";

const CATEGORY_SECTIONS: {
  key: DocumentCategory;
  expenseLabel: string;
  incomeLabel: string;
  icon: React.ReactNode;
}[] = [
  { key: "slip", expenseLabel: "สลิปโอนเงิน", incomeLabel: "สลิปลูกค้าโอนมา", icon: <CreditCard className="h-4 w-4" /> },
  { key: "invoice", expenseLabel: "ใบกำกับภาษี / ใบเสร็จ", incomeLabel: "สำเนาบิลที่เราเขียนให้", icon: <FileText className="h-4 w-4" /> },
  { key: "whtCert", expenseLabel: "หนังสือรับรองหัก ณ ที่จ่าย", incomeLabel: "ใบ 50 ทวิ ที่ลูกค้าให้มา", icon: <FileCheck className="h-4 w-4" /> },
];

export function DocumentUploadSection({
  companyCode,
  transactionType,
  onFilesChange,
  onAiResult,
  showWhtCert = false,
  initialFiles,
}: DocumentUploadSectionProps) {
  const {
    files,
    isUploading,
    isAnalyzing,
    isAnalyzed,
    error,
    hasAnyFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    uploadToCategory,
    removeFile,
    moveFile,
    analyzeDocuments,
  } = useDocumentUpload({
    companyCode,
    transactionType,
    onFilesChange,
    onAiResult,
    showWhtCert,
    initialFiles,
  });

  const sections = showWhtCert
    ? CATEGORY_SECTIONS
    : CATEGORY_SECTIONS.filter((s) => s.key !== "whtCert");

  return (
    <div className="space-y-4">
      {/* Document Card - same style as TransactionSidePanel */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            {transactionType === "expense" ? "หลักฐานการจ่าย" : "หลักฐานการรับเงิน"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {sections.map((section) => (
            <DocumentSection
              key={section.key}
              label={transactionType === "income" ? section.incomeLabel : section.expenseLabel}
              urls={(files[section.key] as string[]) || []}
              onUpload={(file) => uploadToCategory([file], section.key)}
              onDelete={(url) => removeFile(url, section.key)}
              isUploading={isUploading}
              icon={section.icon}
            />
          ))}

          <DocumentSection
            label="เอกสารอื่นๆ"
            urls={files.other.map((f) => f.url)}
            onUpload={(file) => uploadToCategory([file], "other")}
            onDelete={(url) => removeFile(url, "other")}
            isUploading={isUploading}
            icon={<FileText className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* AI Card */}
      <Card className="shadow-sm border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  AI วิเคราะห์เอกสาร
                  {isAnalyzed && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAnalyzed
                    ? "วิเคราะห์แล้ว — กดใหม่หากเพิ่มไฟล์"
                    : "อ่าน กรอกข้อมูล และจำแนกประเภทอัตโนมัติ"}
                </p>
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isAnalyzed ? "outline" : "default"}
                    size="sm"
                    onClick={analyzeDocuments}
                    disabled={isAnalyzing || !hasAnyFiles}
                    className={cn(
                      "shrink-0",
                      !isAnalyzed && "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        วิเคราะห์...
                      </>
                    ) : isAnalyzed ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        วิเคราะห์ใหม่
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        วิเคราะห์
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <p className="font-semibold mb-1">AI วิเคราะห์เอกสาร</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    <li>อ่านและกรอกข้อมูล (ชื่อร้าน, ยอดเงิน, วันที่)</li>
                    <li>จำแนกเอกสารไปหมวดที่ถูกต้อง</li>
                    <li>ค้นหา vendor ที่เคยสอนไว้</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-border/60 hover:border-primary/40",
              (isUploading || isAnalyzing) && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">กำลังอัปโหลด...</p>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    ลากไฟล์มาวาง หรือ <span className="text-primary font-medium">เลือกไฟล์</span> — AI จะจำแนกให้
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Uncategorized files */}
          {files.uncategorized.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                รอ AI จำแนก ({files.uncategorized.length} ไฟล์)
              </p>
              <div className="flex flex-wrap gap-2">
                {files.uncategorized.map((url, index) => (
                  <FilePreviewChip
                    key={`uncat-${index}-${url || "empty"}`}
                    url={url}
                    index={index}
                    onRemove={() => removeFile(url, "uncategorized")}
                    onMove={(toCategory, otherDocType) => moveFile(url, "uncategorized", toCategory, otherDocType)}
                    currentCategory="uncategorized"
                    showMoveOptions
                    availableCategories={showWhtCert ? ["slip", "invoice", "whtCert", "other"] : ["slip", "invoice", "other"]}
                    disabled={isAnalyzing}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
