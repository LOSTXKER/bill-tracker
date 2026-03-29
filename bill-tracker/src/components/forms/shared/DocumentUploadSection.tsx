"use client";

import {
  Upload,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  CATEGORY_CONFIG,
  type DocumentUploadSectionProps,
  type DocumentCategory,
} from "./document-upload-types";
import { useDocumentUpload } from "./useDocumentUpload";
import { FilePreviewChip } from "./FilePreviewChip";
import { OtherDocumentsSection } from "./OtherDocumentsSection";

// Re-export all public types and utilities so existing imports keep working
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
    removeFile,
    moveFile,
    changeOtherDocType,
    analyzeDocuments,
  } = useDocumentUpload({
    companyCode,
    transactionType,
    onFilesChange,
    onAiResult,
    showWhtCert,
    initialFiles,
  });

  const categoriesToShow: DocumentCategory[] = showWhtCert
    ? ["invoice", "slip", "whtCert", "other"]
    : ["invoice", "slip", "other"];

  const hasCategorizedFiles = categoriesToShow.some(cat => files[cat].length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-foreground font-medium flex items-center gap-2">
          📎 เอกสารแนบ
          {isAnalyzed && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              AI วิเคราะห์แล้ว
            </span>
          )}
        </Label>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          (isUploading || isAnalyzing) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">กำลังอัปโหลด...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">คลิกเพื่อเลือก</span>{" "}
                หรือลากไฟล์มาวาง
              </p>
              <p className="text-xs text-muted-foreground">
                รองรับ: รูปภาพ (JPEG, PNG, WebP), PDF
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Uncategorized Files (before analysis) */}
      {files.uncategorized.length > 0 && !isAnalyzed && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {files.uncategorized.map((url, index) => (
              <FilePreviewChip
                key={`uncategorized-${index}-${url || 'empty'}`}
                url={url}
                index={index}
                onRemove={() => removeFile(url, "uncategorized")}
                disabled={isAnalyzing}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Analyze Button */}
      {hasAnyFiles && (
        <AiAnalyzePanel
          isAnalyzing={isAnalyzing}
          isAnalyzed={isAnalyzed}
          hasAnyFiles={hasAnyFiles}
          onAnalyze={analyzeDocuments}
        />
      )}

      {/* Categorized Files (after analysis) */}
      {(isAnalyzed || hasCategorizedFiles) && (
        <div className="space-y-3">
          {categoriesToShow.filter(c => c !== "other").map((category) => {
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;
            const categoryFiles = files[category] as string[];
            const label = transactionType === "income" ? config.labelIncome : config.label;

            return (
              <div
                key={category}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  categoryFiles.length > 0 ? config.bgColor : "bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="text-sm font-medium">{label}</span>
                  {categoryFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({categoryFiles.length} ไฟล์)
                    </span>
                  )}
                </div>

                {categoryFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categoryFiles.map((url, index) => (
                      <FilePreviewChip
                        key={`${category}-${index}-${url || 'empty'}`}
                        url={url}
                        index={index}
                        onRemove={() => removeFile(url, category)}
                        onMove={(toCategory, otherDocType) => moveFile(url, category, toCategory, otherDocType)}
                        currentCategory={category}
                        showMoveOptions
                        availableCategories={categoriesToShow}
                        disabled={isAnalyzing}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    ไม่มีไฟล์
                  </p>
                )}
              </div>
            );
          })}

          {/* Other Documents Section with Types */}
          {categoriesToShow.includes("other") && (
            <OtherDocumentsSection
              files={files.other}
              onRemove={(url) => removeFile(url, "other")}
              onMove={(url, toCategory) => moveFile(url, "other", toCategory)}
              onChangeType={changeOtherDocType}
              availableCategories={categoriesToShow.filter(c => c !== "other")}
              disabled={isAnalyzing}
              transactionType={transactionType}
            />
          )}

          {/* Uncategorized after analysis */}
          {files.uncategorized.length > 0 && isAnalyzed && (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  ไม่สามารถจำแนกได้
                </span>
                <span className="text-xs text-muted-foreground">
                  ({files.uncategorized.length} ไฟล์)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {files.uncategorized.map((url, index) => (
                  <FilePreviewChip
                    key={`uncategorized-move-${index}-${url || 'empty'}`}
                    url={url}
                    index={index}
                    onRemove={() => removeFile(url, "uncategorized")}
                    onMove={(toCategory, otherDocType) => moveFile(url, "uncategorized", toCategory, otherDocType)}
                    currentCategory="uncategorized"
                    showMoveOptions
                    availableCategories={categoriesToShow}
                    disabled={isAnalyzing}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================

interface AiAnalyzePanelProps {
  isAnalyzing: boolean;
  isAnalyzed: boolean;
  hasAnyFiles: boolean;
  onAnalyze: () => void;
}

function AiAnalyzePanel({ isAnalyzing, isAnalyzed, hasAnyFiles, onAnalyze }: AiAnalyzePanelProps) {
  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">AI วิเคราะห์เอกสาร</p>
            <p className="text-xs text-muted-foreground">
              {isAnalyzed
                ? "กดวิเคราะห์ใหม่หากเพิ่มไฟล์"
                : "จำแนกประเภทและกรอกข้อมูลอัตโนมัติ"}
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
                onClick={onAnalyze}
                disabled={isAnalyzing || !hasAnyFiles}
                className={cn(
                  !isAnalyzed && "bg-primary hover:bg-primary/90"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : isAnalyzed ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    วิเคราะห์ใหม่
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    วิเคราะห์
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <p className="font-semibold mb-1">✨ AI วิเคราะห์เอกสาร</p>
              <p className="text-xs mb-2">
                ระบบจะอ่านและวิเคราะห์เอกสารทั้งหมดพร้อมกัน เพื่อดึงข้อมูล:
              </p>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                <li>ชื่อร้าน/ผู้ขาย และเลขผู้เสียภาษี</li>
                <li>ยอดเงิน VAT วันที่ เลขที่เอกสาร</li>
                <li>รายการสินค้า/บริการที่ซื้อ</li>
                <li>ค้นหา vendor mapping ที่เคยสอนไว้</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
