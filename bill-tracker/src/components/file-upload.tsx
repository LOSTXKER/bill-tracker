"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFile, deleteFile } from "@/lib/storage/upload";

interface FileUploadProps {
  value?: string[];
  onChange?: (files: string[]) => void;
  maxFiles?: number;
  folder?: string;
  disabled?: boolean;
}

export function FileUpload({
  value = [],
  onChange,
  maxFiles = 3,
  folder = "receipts",
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<string[]>(value);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prevValueRef = React.useRef<string>(JSON.stringify(value));

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      setError(null);
      setUploading(true);

      try {
        const uploadPromises = acceptedFiles.map((file) =>
          uploadFile(file, folder)
        );

        const results = await Promise.all(uploadPromises);
        const newUrls = results.map((r) => r.url);
        const updatedFiles = [...files, ...newUrls].slice(0, maxFiles);

        setFiles(updatedFiles);
        onChange?.(updatedFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "การอัพโหลดล้มเหลว");
      } finally {
        setUploading(false);
      }
    },
    [files, folder, maxFiles, onChange, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: maxFiles - files.length,
    disabled: disabled || files.length >= maxFiles,
  });

  const removeFile = async (url: string) => {
    if (disabled) return;

    try {
      await deleteFile(url);
      const updatedFiles = files.filter((f) => f !== url);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  // Update internal state when value prop changes
  React.useEffect(() => {
    const valueStr = JSON.stringify(value);
    // Only update if content has actually changed (not just reference)
    if (valueStr !== prevValueRef.current) {
      prevValueRef.current = valueStr;
      setFiles(value);
    }
  }, [value]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
            uploading && "pointer-events-none"
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  กำลังอัพโหลด...
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">
                    คลิกเพื่อเลือก
                  </span>{" "}
                  หรือลากไฟล์มาวาง
                </p>
                <p className="text-xs text-muted-foreground">
                  รองรับ JPEG, PNG, WebP (สูงสุด 5MB)
                </p>
                <p className="text-xs text-muted-foreground">
                  {files.length}/{maxFiles} ไฟล์
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Preview */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((url, index) => (
            <div
              key={url}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border"
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeFile(url)}
                  disabled={disabled}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Badge */}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
