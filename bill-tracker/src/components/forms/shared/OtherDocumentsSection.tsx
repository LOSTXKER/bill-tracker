"use client";

import { useRef, useState } from "react";
import { X, FileText, GripVertical, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractDisplayName } from "@/lib/storage/upload";
import {
  CATEGORY_CONFIG,
  OTHER_DOC_TYPE_OPTIONS,
  OTHER_DOC_TYPE_LABELS,
  type DocumentCategory,
  type OtherDocType,
  type TypedOtherDoc,
} from "./document-upload-types";

interface OtherDocumentsSectionProps {
  files: TypedOtherDoc[];
  onRemove: (url: string) => void;
  onMove: (url: string, toCategory: DocumentCategory) => void;
  onChangeType: (url: string, newType: OtherDocType) => void;
  availableCategories: DocumentCategory[];
  disabled?: boolean;
  transactionType: "expense" | "income";
  onUpload?: (files: File[]) => void;
}

export function OtherDocumentsSection({
  files,
  onRemove,
  onMove,
  onChangeType,
  availableCategories,
  disabled = false,
  transactionType,
  onUpload,
}: OtherDocumentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const config = CATEGORY_CONFIG.other;
  const Icon = config.icon;
  const label = transactionType === "income" ? config.labelIncome : config.label;

  const filesByType = files.reduce((acc, file) => {
    const type = file.type || "OTHER";
    if (!acc[type]) acc[type] = [];
    acc[type].push(file);
    return acc;
  }, {} as Record<OtherDocType, TypedOtherDoc[]>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0 && onUpload) {
      onUpload(Array.from(fileList));
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", config.bgColor)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {files.length > 0 ? `${files.length} ไฟล์` : "ยังไม่มีเอกสาร"}
            </p>
          </div>
        </div>
        {onUpload && (
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 hover:bg-primary/10 hover:text-primary"
              disabled={disabled}
              asChild
            >
              <span>
                <Plus className="h-4 w-4 mr-1.5" />
                เพิ่มไฟล์
              </span>
            </Button>
          </label>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-3 mt-2">
          {OTHER_DOC_TYPE_OPTIONS.map((docType) => {
            const typeFiles = filesByType[docType.value] || [];
            if (typeFiles.length === 0) return null;

            return (
              <div key={docType.value} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
                    {docType.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeFiles.map((file, index) => (
                    <OtherDocFileChip
                      key={`other-${docType.value}-${index}-${file.url}`}
                      file={file}
                      index={index}
                      onRemove={() => onRemove(file.url)}
                      onMove={(toCategory) => onMove(file.url, toCategory)}
                      onChangeType={(newType) => onChangeType(file.url, newType)}
                      availableCategories={availableCategories}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================

interface OtherDocFileChipProps {
  file: TypedOtherDoc;
  index: number;
  onRemove: () => void;
  onMove: (category: DocumentCategory) => void;
  onChangeType: (type: OtherDocType) => void;
  availableCategories: DocumentCategory[];
  disabled?: boolean;
}

function OtherDocFileChip({
  file,
  index,
  onRemove,
  onMove,
  onChangeType,
  availableCategories,
  disabled = false,
}: OtherDocFileChipProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const rawFileName = file.url?.split("/").pop() || `ไฟล์ ${index + 1}`;
  const displayName = extractDisplayName(rawFileName);
  const shortName = displayName.length > 20 ? displayName.slice(0, 17) + "..." : displayName;
  const isImage = file.url ? /\.(jpg|jpeg|png|webp|gif)$/i.test(file.url) : false;

  return (
    <div className="relative group">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border bg-background",
          "hover:border-primary/50 transition-colors",
          disabled && "opacity-50"
        )}
      >
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => { setShowMenu(!showMenu); setShowTypeMenu(false); }}
          disabled={disabled}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {isImage ? (
          <img
            src={file.url}
            alt={shortName}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}

        <span className="text-sm truncate max-w-[100px]" title={displayName}>
          {shortName}
        </span>

        <button
          type="button"
          onClick={() => { setShowTypeMenu(!showTypeMenu); setShowMenu(false); }}
          disabled={disabled}
          className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
        >
          {OTHER_DOC_TYPE_LABELS[file.type] || "อื่นๆ"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showMenu && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]">
          <p className="px-3 py-1 text-xs text-muted-foreground">ย้ายไปหมวด:</p>
          {availableCategories.map((cat) => {
            const catConfig = CATEGORY_CONFIG[cat];
            const CatIcon = catConfig.icon;
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
                <CatIcon className={cn("h-4 w-4", catConfig.color)} />
                {catConfig.label}
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

      {showTypeMenu && (
        <div className="absolute top-full right-0 mt-1 z-10 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]">
          <p className="px-3 py-1 text-xs text-muted-foreground">เปลี่ยนประเภท:</p>
          {OTHER_DOC_TYPE_OPTIONS.map((docType) => (
            <button
              key={docType.value}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                file.type === docType.value && "bg-muted"
              )}
              onClick={() => {
                onChangeType(docType.value);
                setShowTypeMenu(false);
              }}
            >
              <FileText className="h-4 w-4 text-purple-600" />
              {docType.label}
              {file.type === docType.value && (
                <CheckCircle2 className="h-3 w-3 ml-auto text-green-600" />
              )}
            </button>
          ))}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setShowTypeMenu(false)}
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}
