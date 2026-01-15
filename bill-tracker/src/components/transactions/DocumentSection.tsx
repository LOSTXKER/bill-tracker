"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { extractDisplayName } from "@/lib/storage/upload";

interface DocumentSectionProps {
  label: string;
  urls: string[];
  onUpload: (file: File) => void;
  onDelete: (url: string) => void;
  isUploading: boolean;
  icon?: React.ReactNode;
  accept?: string;
}

export function DocumentSection({
  label,
  urls,
  onUpload,
  onDelete,
  isUploading,
  icon,
  accept = "image/*,application/pdf",
}: DocumentSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon || <FileText className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {urls.length > 0 ? `${urls.length} ไฟล์` : "ยังไม่มีเอกสาร"}
            </p>
          </div>
        </div>
        
        <label className="cursor-pointer">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-primary/10 hover:text-primary"
            disabled={isUploading}
            asChild
          >
            <span>
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              เพิ่มไฟล์
            </span>
          </Button>
        </label>
      </div>

      {urls.length > 0 && (
        <div className="grid gap-2">
          {urls.map((url, index) => {
            const rawFileName = url.split("/").pop() || `ไฟล์ ${index + 1}`;
            const displayName = extractDisplayName(rawFileName);
            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const shortName =
              displayName.length > 20 ? displayName.substring(0, 20) + "..." : displayName;

            return (
              <div
                key={url}
                className="group relative flex items-center gap-3 p-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border"
                >
                  {isImage ? (
                    <img
                      src={url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </a>

                <div className="flex-1 min-w-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {shortName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {isImage ? "รูปภาพ" : "เอกสาร"}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(url)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
