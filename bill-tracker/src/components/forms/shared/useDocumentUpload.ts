"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFile, deleteFile } from "@/lib/storage/upload";
import {
  normalizeOtherDocs,
  type CategorizedFiles,
  type DocumentCategory,
  type OtherDocType,
  type MultiDocAnalysisResult,
  type DocumentUploadSectionProps,
} from "./document-upload-types";

export function useDocumentUpload({
  companyCode,
  transactionType,
  onFilesChange,
  onAiResult,
  initialFiles,
}: DocumentUploadSectionProps) {
  const [files, setFiles] = useState<CategorizedFiles>(() => {
    if (initialFiles) {
      return {
        ...initialFiles,
        other: normalizeOtherDocs(initialFiles.other as unknown as (string | import("./document-upload-types").TypedOtherDoc)[]),
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

  const getAllFiles = useCallback(() => {
    return [
      ...files.uncategorized,
      ...files.invoice,
      ...files.slip,
      ...files.whtCert,
    ].filter((url): url is string => url != null && url !== "");
  }, [files]);

  const totalFileCount = getAllFiles().length;

  const hasAnyFiles = files.uncategorized.length > 0 ||
                      files.invoice.length > 0 ||
                      files.slip.length > 0 ||
                      files.whtCert.length > 0 ||
                      files.other.length > 0;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setError(null);
      setIsUploading(true);
      setIsAnalyzed(false);

      try {
        const uploadPromises = acceptedFiles.map((file) =>
          uploadFile(file, "documents")
        );
        const results = await Promise.all(uploadPromises);
        const newUrls = results.map((r) => r.url);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    disabled: isUploading || isAnalyzing,
  });

  const removeFile = async (url: string, category: DocumentCategory) => {
    let updatedFiles: CategorizedFiles;
    if (category === "other") {
      updatedFiles = {
        ...files,
        other: files.other.filter((f) => f.url !== url),
      };
    } else {
      updatedFiles = {
        ...files,
        [category]: (files[category] as string[]).filter((f) => f !== url),
      };
    }
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    if (url && url.startsWith("http")) {
      try {
        await deleteFile(url);
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
      }
    }
  };

  const moveFile = (url: string, fromCategory: DocumentCategory, toCategory: DocumentCategory, otherDocType?: OtherDocType) => {
    if (fromCategory === toCategory) return;

    let updatedFiles: CategorizedFiles;

    if (fromCategory === "other") {
      updatedFiles = {
        ...files,
        other: files.other.filter((f) => f.url !== url),
      };
    } else {
      updatedFiles = {
        ...files,
        [fromCategory]: (files[fromCategory] as string[]).filter((f) => f !== url),
      };
    }

    if (toCategory === "other") {
      updatedFiles = {
        ...updatedFiles,
        other: [...updatedFiles.other, { url, type: otherDocType || "OTHER" }],
      };
    } else {
      updatedFiles = {
        ...updatedFiles,
        [toCategory]: [...(updatedFiles[toCategory] as string[]), url],
      };
    }

    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const changeOtherDocType = (url: string, newType: OtherDocType) => {
    const updatedFiles: CategorizedFiles = {
      ...files,
      other: files.other.map(f => f.url === url ? { ...f, type: newType } : f),
    };
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

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

      const result = responseData.data || responseData;

      const newFiles: CategorizedFiles = {
        invoice: [],
        slip: [],
        whtCert: [],
        other: files.other,
        uncategorized: [],
      };

      if (result.fileAssignments) {
        for (const [url, rawCategory] of Object.entries(result.fileAssignments)) {
          const category = rawCategory as string;
          if (category.startsWith("other:")) {
            const subtype = category.split(":")[1] as OtherDocType;
            const validSubtypes: OtherDocType[] = ["QUOTATION", "INVOICE", "CONTRACT", "PURCHASE_ORDER", "DELIVERY_NOTE", "OTHER"];
            newFiles.other.push({
              url,
              type: validSubtypes.includes(subtype) ? subtype : "OTHER"
            });
          } else if (category === "other") {
            newFiles.other.push({ url, type: "OTHER" });
          } else if (category === "invoice" || category === "slip" || category === "whtCert") {
            newFiles[category].push(url);
          } else {
            newFiles.uncategorized.push(url);
          }
        }
      }

      const assignedUrls = new Set(Object.keys(result.fileAssignments || {}));
      for (const url of allFiles) {
        if (!assignedUrls.has(url)) {
          newFiles.uncategorized.push(url);
        }
      }

      setFiles(newFiles);
      onFilesChange(newFiles);
      setIsAnalyzed(true);

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

  return {
    files,
    isUploading,
    isAnalyzing,
    isAnalyzed,
    error,
    totalFileCount,
    hasAnyFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    removeFile,
    moveFile,
    changeOtherDocType,
    analyzeDocuments,
  };
}
