"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AccountingRow, ColumnMapping, ImportStep, MONTHS_TH } from "./import/import-types";
import { parsePdfFile, parseExcelFile, applyColumnMapping } from "./import/parse-utils";
import { DropZone } from "./import/DropZone";
import { PdfLoadingStep } from "./import/PdfLoadingStep";
import { ColumnMappingStep } from "./import/ColumnMappingStep";
import { PreviewStep } from "./import/PreviewStep";
import { ManualEntryStep } from "./import/ManualEntryStep";

export type { AccountingRow };

interface ImportPanelProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: AccountingRow[], fileName?: string) => void;
  companyCode?: string;
  month?: number;
  year?: number;
  type?: "expense" | "income";
}

const EMPTY_MAPPING: ColumnMapping = {
  date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: "", vatAmount: "",
};

const EMPTY_ROW: AccountingRow = {
  date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: 0, vatAmount: 0, totalAmount: 0,
};

export function ImportPanel({ open, onClose, onImport, companyCode, month, year, type }: ImportPanelProps) {
  const [step, setStep] = useState<ImportStep>("choose");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [preview, setPreview] = useState<AccountingRow[]>([]);
  const [manualRows, setManualRows] = useState<AccountingRow[]>([{ ...EMPTY_ROW }]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");

  const reset = () => {
    setStep("choose");
    setRawHeaders([]);
    setRawData([]);
    setColumnMapping(EMPTY_MAPPING);
    setPreview([]);
    setFileError("");
    setPdfFileName("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    setFileError("");
    if (file.name.toLowerCase().endsWith(".pdf")) {
      if (!companyCode) { setFileError("ไม่พบรหัสบริษัท กรุณาลองใหม่"); return; }
      setPdfFileName(file.name);
      setStep("pdf-loading");
      const result = await parsePdfFile(file, companyCode);
      if ("error" in result) { setStep("choose"); setFileError(result.error); return; }
      setPreview(result.rows);
      setStep("preview");
    } else {
      const result = await parseExcelFile(file);
      if ("error" in result) { setFileError(result.error); return; }
      setRawHeaders(result.headers);
      setRawData(result.data);
      setColumnMapping(result.mapping);
      setStep("mapping");
    }
  };

  const handleApplyMapping = () => {
    setPreview(applyColumnMapping(rawHeaders, rawData, columnMapping));
    setStep("preview");
  };

  const handleManualRowChange = (idx: number, field: keyof AccountingRow, value: string) => {
    setManualRows((prev) => {
      const updated = [...prev];
      if (field === "baseAmount" || field === "vatAmount" || field === "totalAmount") {
        updated[idx] = { ...updated[idx], [field]: parseFloat(value) || 0 };
        if (field !== "totalAmount") updated[idx].totalAmount = updated[idx].baseAmount + updated[idx].vatAmount;
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            นำเข้ารายงาน{type === "expense" ? "ภาษีซื้อ" : type === "income" ? "ภาษีขาย" : "บัญชี"}
            {month !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                — เดือน{MONTHS_TH[month - 1]}{year !== undefined ? ` ${year + 543}` : ""}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            อัปโหลดไฟล์ Excel/CSV จากโปรแกรมบัญชี หรือ PDF หรือกรอกข้อมูลด้วยตนเอง
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <DropZone
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            fileError={fileError}
            onFile={handleFile}
            onManual={() => setStep("manual")}
          />
        )}

        {step === "pdf-loading" && <PdfLoadingStep pdfFileName={pdfFileName} />}

        {step === "mapping" && (
          <ColumnMappingStep
            rawHeaders={rawHeaders}
            rawData={rawData}
            columnMapping={columnMapping}
            setColumnMapping={setColumnMapping}
            onBack={() => setStep("choose")}
            onApply={handleApplyMapping}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            preview={preview}
            pdfFileName={pdfFileName}
            onBack={() => setStep("mapping")}
            onImport={() => { onImport(preview, pdfFileName || undefined); handleClose(); }}
          />
        )}

        {step === "manual" && (
          <ManualEntryStep
            manualRows={manualRows}
            onRowChange={handleManualRowChange}
            onAddRow={() => setManualRows((prev) => [...prev, { ...EMPTY_ROW }])}
            onRemoveRow={(idx) => setManualRows((prev) => prev.filter((_, i) => i !== idx))}
            onBack={() => setStep("choose")}
            onImport={() => {
              const valid = manualRows.filter((r) => r.vendorName || r.baseAmount > 0);
              onImport(valid, "manual");
              handleClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
