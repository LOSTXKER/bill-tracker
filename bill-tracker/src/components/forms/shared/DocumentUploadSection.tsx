"use client";

import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";

interface DocumentUploadSectionProps {
  onSlipUpload?: (url: string) => void;
  onInvoiceUpload?: (url: string) => void;
  onWhtCertUpload?: (url: string) => void;
  showWhtCert?: boolean;
  type?: "expense" | "income";
}

export function DocumentUploadSection({
  onSlipUpload,
  onInvoiceUpload,
  onWhtCertUpload,
  showWhtCert = false,
  type = "expense",
}: DocumentUploadSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-foreground font-medium">เอกสารประกอบ</Label>
      <div className="space-y-4">
        {onSlipUpload && (
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
            <Label className="text-sm text-muted-foreground mb-3 block">
              {type === "expense" ? "สลิปโอนเงิน" : "สลิปลูกค้าโอนมา"}
            </Label>
            <FileUpload
              maxFiles={1}
              folder={type === "expense" ? "slips" : "customer-slips"}
              onChange={(files) => files[0] && onSlipUpload(files[0])}
            />
          </div>
        )}
        {onInvoiceUpload && (
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
            <Label className="text-sm text-muted-foreground mb-3 block">
              {type === "expense"
                ? "ใบกำกับภาษี/ใบเสร็จ"
                : "สำเนาบิลที่เราเขียนให้"}
            </Label>
            <FileUpload
              maxFiles={1}
              folder={type === "expense" ? "invoices" : "bills"}
              onChange={(files) => files[0] && onInvoiceUpload(files[0])}
            />
          </div>
        )}
        {showWhtCert && onWhtCertUpload && (
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
            <Label className="text-sm text-muted-foreground mb-3 block">
              {type === "expense"
                ? "ใบหัก ณ ที่จ่าย (50 ทวิ)"
                : "ใบ 50 ทวิ ที่ลูกค้าให้มา"}
            </Label>
            <FileUpload
              maxFiles={1}
              folder="wht-certs"
              onChange={(files) => files[0] && onWhtCertUpload(files[0])}
            />
          </div>
        )}
      </div>
    </div>
  );
}
