"use client";

import { useState } from "react";
import { toast } from "sonner";

interface UseTransactionFileUploadOptions {
  transactionType: "expense" | "income";
  transactionId: string;
  companyCode: string;
  onSuccess: () => void;
}

interface FileUrlFields {
  slip: string;
  invoice: string;
  wht: string;
}

const FILE_URL_FIELDS: Record<"expense" | "income", FileUrlFields> = {
  expense: {
    slip: "slipUrls",
    invoice: "taxInvoiceUrls",
    wht: "whtCertUrls",
  },
  income: {
    slip: "customerSlipUrls",
    invoice: "myBillCopyUrls",
    wht: "whtCertUrls",
  },
};

export function useTransactionFileUpload({
  transactionType,
  transactionId,
  companyCode,
  onSuccess,
}: UseTransactionFileUploadOptions) {
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const handleFileUpload = async (
    file: File,
    type: "slip" | "invoice" | "wht",
    currentUrls: Record<string, string[]>,
    transactionData: any
  ) => {
    setUploadingType(type);
    try {
      // Determine folder structure
      const typeFolder =
        type === "slip"
          ? transactionType === "expense"
            ? "slips"
            : "customer-slips"
          : type === "invoice"
          ? transactionType === "expense"
            ? "invoices"
            : "bills"
          : "wht-certs";

      const folder = `${companyCode.toUpperCase()}/${transactionType}s/${transactionId}/${typeFolder}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("อัปโหลดไฟล์ล้มเหลว");

      const uploadResult = await uploadRes.json();
      // Handle apiResponse wrapper: { success: true, data: { url, ... } }
      const url = uploadResult.data?.url || uploadResult.url;
      
      if (!url) {
        console.error("Upload response missing URL:", uploadResult);
        throw new Error("ไม่ได้รับ URL จากการอัปโหลด");
      }

      // Get the appropriate field name for this transaction type
      const fieldName = FILE_URL_FIELDS[transactionType][type];
      const updateData: Record<string, any> = {
        [fieldName]: [...(currentUrls[fieldName] || []), url],
      };

      const res = await fetch(`/api/${transactionType}s/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transactionData,
          ...updateData,
        }),
      });

      if (!res.ok) throw new Error("อัปเดตข้อมูลล้มเหลว");

      toast.success("อัปโหลดไฟล์สำเร็จ");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteFile = async (
    type: "slip" | "invoice" | "wht",
    urlToDelete: string,
    currentUrls: Record<string, string[]>,
    transactionData: any
  ) => {
    if (!confirm("ต้องการลบไฟล์นี้หรือไม่?")) return;

    try {
      const fieldName = FILE_URL_FIELDS[transactionType][type];
      const updatedUrls = (currentUrls[fieldName] || []).filter(
        (url: string) => url !== urlToDelete
      );
      const updateData: Record<string, any> = {
        [fieldName]: updatedUrls,
      };

      const res = await fetch(`/api/${transactionType}s/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transactionData,
          ...updateData,
        }),
      });

      if (!res.ok) throw new Error("ลบไฟล์ล้มเหลว");

      toast.success("ลบไฟล์สำเร็จ");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  return {
    uploadingType,
    handleFileUpload,
    handleDeleteFile,
  };
}
