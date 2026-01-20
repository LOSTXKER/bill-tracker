"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  X, 
  Loader2, 
  Sparkles, 
  FileText, 
  CreditCard, 
  FileCheck,
  RefreshCw,
  CheckCircle2,
  GripVertical,
  AlertCircle
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
import { uploadFile, deleteFile, extractDisplayName } from "@/lib/storage/upload";

// =============================================================================
// Types
// =============================================================================

export type DocumentCategory = "invoice" | "slip" | "whtCert" | "other" | "uncategorized";

export interface CategorizedFiles {
  invoice: string[];   // ใบกำกับภาษี/ใบเสร็จ
  slip: string[];      // สลิปโอนเงิน  
  whtCert: string[];   // ใบ 50 ทวิ
  other: string[];     // เอกสารอื่นๆ (AI ไม่ต้องอ่าน)
  uncategorized: string[]; // ยังไม่จำแนก
}

export interface FileClassification {
  url: string;
  type: DocumentCategory;
  confidence: number;
}

// Re-export AI types
import type { MultiDocAnalysisResult } from "@/lib/ai/types";
export type { MultiDocAnalysisResult } from "@/lib/ai/types";

// Legacy type for backward compatibility
export interface OcrAnalysisResult {
  data: {
    vendorName: string | null;
    vendorTaxId: string | null;
    amount: number | null;
    vatRate: number | null;
    vatAmount: number | null;
    totalAmount: number | null;
    invoiceNumber: string | null;
    date: string | null;
    paymentMethod: string | null;
    confidence: {
      overall: number;
      amount: number;
      vendor: number;
      date: number;
    };
  };
  smart: MultiDocAnalysisResult["smart"];
  aiAccountSuggestion?: MultiDocAnalysisResult["aiAccountSuggestion"];
  validation: {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

interface DocumentUploadSectionProps {
  companyCode: string;
  transactionType: "expense" | "income";
  onFilesChange: (files: CategorizedFiles) => void;
  onAiResult?: (result: MultiDocAnalysisResult) => void;
  showWhtCert?: boolean;
  initialFiles?: CategorizedFiles;
}

// =============================================================================
// Category Configuration
// =============================================================================

const CATEGORY_CONFIG: Record<DocumentCategory, {
  label: string;
  labelIncome: string;
  icon: typeof FileText;
  color: string;
  bgColor: string;
}> = {
  invoice: {
    label: "ใบกำกับภาษี/ใบเสร็จ",
    labelIncome: "สำเนาบิลที่เราเขียนให้",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  slip: {
    label: "สลิปโอนเงิน",
    labelIncome: "สลิปลูกค้าโอนมา",
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  whtCert: {
    label: "ใบหัก ณ ที่จ่าย (50 ทวิ)",
    labelIncome: "ใบ 50 ทวิ ที่ลูกค้าให้มา",
    icon: FileCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  other: {
    label: "เอกสารอื่นๆ",
    labelIncome: "เอกสารอื่นๆ",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  uncategorized: {
    label: "ยังไม่จำแนก",
    labelIncome: "ยังไม่จำแนก",
    icon: FileText,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
  },
};

// =============================================================================
// Component
// =============================================================================

export function DocumentUploadSection({
  companyCode,
  transactionType,
  onFilesChange,
  onAiResult,
  showWhtCert = false,
  initialFiles,
}: DocumentUploadSectionProps) {
  // State - initialize with initialFiles if provided
  const [files, setFiles] = useState<CategorizedFiles>(() => {
    if (initialFiles) {
      console.log("DocumentUploadSection initializing with files:", initialFiles);
      return {
        ...initialFiles,
        other: initialFiles.other || [],
      };
    }
    return {
      invoice: [],
      slip: [],
      whtCert: [],
      other: [],
      uncategorized: [],
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(!!initialFiles?.slip?.length || !!initialFiles?.invoice?.length);
  const [error, setError] = useState<string | null>(null);

  // Get all files as flat array (filter out null/undefined)
  // Note: "other" category is excluded from AI analysis
  const getAllFiles = useCallback(() => {
    return [
      ...files.uncategorized,
      ...files.invoice,
      ...files.slip,
      ...files.whtCert,
      // Note: files.other is intentionally excluded - AI doesn't analyze these
    ].filter((url): url is string => url != null && url !== "");
  }, [files]);

  const totalFileCount = getAllFiles().length;
  
  // Count all files including potentially empty URLs (for UI display)
  const hasAnyFiles = files.uncategorized.length > 0 || 
                      files.invoice.length > 0 || 
                      files.slip.length > 0 || 
                      files.whtCert.length > 0 ||
                      files.other.length > 0;

  // Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setError(null);
      setIsUploading(true);
      setIsAnalyzed(false); // Reset analyzed state when new files added

      try {
        // Upload all files
        const uploadPromises = acceptedFiles.map((file) =>
          uploadFile(file, "documents")
        );
        const results = await Promise.all(uploadPromises);
        const newUrls = results.map((r) => r.url);

        // Add to uncategorized
        const updatedFiles: CategorizedFiles = {
          ...files,
          uncategorized: [...files.uncategorized, ...newUrls],
        };

        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "การอัปโหลดล้มเหลว");
      } finally {
        setIsUploading(false);
      }
    },
    [files, onFilesChange]
  );

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    disabled: isUploading || isAnalyzing,
  });

  // Remove file
  const removeFile = async (url: string, category: DocumentCategory) => {
    // Remove from state first (optimistic update)
    const updatedFiles: CategorizedFiles = {
      ...files,
      [category]: files[category].filter((f) => f !== url),
    };
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    // Only attempt to delete from storage if URL is valid
    if (url && url.startsWith("http")) {
      try {
        await deleteFile(url);
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
        // Don't revert state - file is already removed from form
      }
    }
  };

  // Move file between categories
  const moveFile = (url: string, fromCategory: DocumentCategory, toCategory: DocumentCategory) => {
    if (fromCategory === toCategory) return;

    const updatedFiles: CategorizedFiles = {
      ...files,
      [fromCategory]: files[fromCategory].filter((f) => f !== url),
      [toCategory]: [...files[toCategory], url],
    };

    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  // Analyze documents with AI
  const analyzeDocuments = async () => {
    const allFiles = getAllFiles();
    if (allFiles.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: allFiles,
          companyCode: companyCode.toUpperCase(),
          transactionType: transactionType.toUpperCase(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "การวิเคราะห์ล้มเหลว");
      }
      
      // Extract data from apiResponse wrapper: { success: true, data: { ... } }
      const result = responseData.data || responseData;

      // Organize files by AI classification
      const newFiles: CategorizedFiles = {
        invoice: [],
        slip: [],
        whtCert: [],
        other: files.other, // Preserve "other" files - they aren't sent to AI
        uncategorized: [],
      };

      // Apply file assignments from AI
      if (result.fileAssignments) {
        for (const [url, category] of Object.entries(result.fileAssignments)) {
          const cat = category as DocumentCategory;
          if (newFiles[cat]) {
            newFiles[cat].push(url);
          } else {
            newFiles.uncategorized.push(url);
          }
        }
      }

      // Any remaining files go to uncategorized
      const assignedUrls = new Set(Object.keys(result.fileAssignments || {}));
      for (const url of allFiles) {
        if (!assignedUrls.has(url)) {
          newFiles.uncategorized.push(url);
        }
      }

      setFiles(newFiles);
      onFilesChange(newFiles);
      setIsAnalyzed(true);

      // Call the result callback
      if (onAiResult && result) {
        onAiResult(result as MultiDocAnalysisResult);
      }
    } catch (err) {
      console.error("AI analysis error:", err);
      setError(err instanceof Error ? err.message : "การวิเคราะห์ล้มเหลว");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get categories to display
  const categoriesToShow: DocumentCategory[] = showWhtCert 
    ? ["invoice", "slip", "whtCert", "other"]
    : ["invoice", "slip", "other"];

  // Check if there are any categorized files
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
                    onClick={analyzeDocuments}
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
      )}

      {/* Categorized Files (after analysis) */}
      {(isAnalyzed || hasCategorizedFiles) && (
        <div className="space-y-3">
          {categoriesToShow.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;
            const categoryFiles = files[category];
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
                        onMove={(toCategory) => moveFile(url, category, toCategory)}
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
                    onMove={(toCategory) => moveFile(url, "uncategorized", toCategory)}
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
// File Preview Chip Component
// =============================================================================

interface FilePreviewChipProps {
  url: string;
  index: number;
  onRemove: () => void;
  onMove?: (category: DocumentCategory) => void;
  currentCategory?: DocumentCategory;
  showMoveOptions?: boolean;
  availableCategories?: DocumentCategory[];
  disabled?: boolean;
}

function FilePreviewChip({
  url,
  index,
  onRemove,
  onMove,
  currentCategory,
  showMoveOptions = false,
  availableCategories = [],
  disabled = false,
}: FilePreviewChipProps) {
  const [showMenu, setShowMenu] = useState(false);
  const rawFileName = url?.split("/").pop() || `ไฟล์ ${index + 1}`;
  // Use extractDisplayName to show original filename instead of timestamp ID
  const displayName = extractDisplayName(rawFileName);
  const shortName = displayName.length > 20 ? displayName.slice(0, 17) + "..." : displayName;
  const isImage = url ? /\.(jpg|jpeg|png|webp|gif)$/i.test(url) : false;

  return (
    <div className="relative group">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border bg-background",
          "hover:border-primary/50 transition-colors",
          disabled && "opacity-50"
        )}
      >
        {/* Drag Handle */}
        {showMoveOptions && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab"
            onClick={() => setShowMenu(!showMenu)}
            disabled={disabled}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Thumbnail */}
        {isImage ? (
          <img
            src={url}
            alt={shortName}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}

        {/* File Name */}
        <span className="text-sm truncate max-w-[120px]" title={displayName}>
          {shortName}
        </span>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Move Menu */}
      {showMenu && showMoveOptions && onMove && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]">
          <p className="px-3 py-1 text-xs text-muted-foreground">ย้ายไปหมวด:</p>
          {availableCategories
            .filter((cat) => cat !== currentCategory)
            .map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              return (
                <button
                  key={cat}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onMove(cat);
                    setShowMenu(false);
                  }}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                  {config.label}
                </button>
              );
            })}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setShowMenu(false)}
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}
