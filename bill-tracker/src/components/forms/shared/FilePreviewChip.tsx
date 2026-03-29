"use client";

import { useState } from "react";
import { X, FileText, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractDisplayName } from "@/lib/storage/upload";
import {
  CATEGORY_CONFIG,
  OTHER_DOC_TYPE_OPTIONS,
  type DocumentCategory,
  type OtherDocType,
} from "./document-upload-types";

interface FilePreviewChipProps {
  url: string;
  index: number;
  onRemove: () => void;
  onMove?: (category: DocumentCategory, otherDocType?: OtherDocType) => void;
  currentCategory?: DocumentCategory;
  showMoveOptions?: boolean;
  availableCategories?: DocumentCategory[];
  disabled?: boolean;
}

export function FilePreviewChip({
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
  const [showOtherTypeMenu, setShowOtherTypeMenu] = useState(false);
  const rawFileName = url?.split("/").pop() || `ไฟล์ ${index + 1}`;
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
        {showMoveOptions && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab"
            onClick={() => { setShowMenu(!showMenu); setShowOtherTypeMenu(false); }}
            disabled={disabled}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {isImage ? (
          <img
            src={url}
            alt={shortName}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}

        <span className="text-sm truncate max-w-[120px]" title={displayName}>
          {shortName}
        </span>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showMenu && showMoveOptions && onMove && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]">
          <p className="px-3 py-1 text-xs text-muted-foreground">ย้ายไปหมวด:</p>
          {availableCategories
            .filter((cat) => cat !== currentCategory && cat !== "other")
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
          {availableCategories.includes("other") && currentCategory !== "other" && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => { setShowOtherTypeMenu(true); setShowMenu(false); }}
            >
              <FileText className={cn("h-4 w-4", CATEGORY_CONFIG.other.color)} />
              {CATEGORY_CONFIG.other.label} →
            </button>
          )}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setShowMenu(false)}
          >
            ยกเลิก
          </button>
        </div>
      )}

      {showOtherTypeMenu && onMove && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]">
          <p className="px-3 py-1 text-xs text-muted-foreground">เลือกประเภทเอกสาร:</p>
          {OTHER_DOC_TYPE_OPTIONS.map((docType) => (
            <button
              key={docType.value}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onMove("other", docType.value);
                setShowOtherTypeMenu(false);
              }}
            >
              <FileText className="h-4 w-4 text-purple-600" />
              {docType.label}
            </button>
          ))}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setShowOtherTypeMenu(false)}
          >
            ← กลับ
          </button>
        </div>
      )}
    </div>
  );
}
