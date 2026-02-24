"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, FileText, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccountingRow {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface ColumnMapping {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: string;
  vatAmount: string;
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: "วัน/เดือน/ปี",
  invoiceNumber: "เลขที่ใบกำกับ",
  vendorName: "ชื่อผู้ขาย/ผู้ให้บริการ",
  taxId: "เลขประจำตัวผู้เสียภาษี",
  baseAmount: "มูลค่าสินค้า/บริการ",
  vatAmount: "จำนวนเงินภาษี",
};

const THAI_COLUMN_HINTS: Record<string, keyof ColumnMapping> = {
  "วัน": "date",
  "วันที่": "date",
  "date": "date",
  "เลขที่ใบกำกับ": "invoiceNumber",
  "เลขที่": "invoiceNumber",
  "invoice": "invoiceNumber",
  "ชื่อผู้ขาย": "vendorName",
  "ชื่อ": "vendorName",
  "ผู้ขาย": "vendorName",
  "vendor": "vendorName",
  "เลขประจำตัว": "taxId",
  "taxid": "taxId",
  "tax": "taxId",
  "มูลค่าสินค้า": "baseAmount",
  "มูลค่า": "baseAmount",
  "amount": "baseAmount",
  "ภาษี": "vatAmount",
  "vat": "vatAmount",
};

const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface ImportPanelProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: AccountingRow[]) => void;
  companyCode?: string;
  month?: number;
  year?: number;
  type?: "expense" | "income";
}

export function ImportPanel({ open, onClose, onImport, companyCode, month, year, type }: ImportPanelProps) {
  const [step, setStep] = useState<"choose" | "mapping" | "preview" | "manual" | "pdf-loading">("choose");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: "",
    invoiceNumber: "",
    vendorName: "",
    taxId: "",
    baseAmount: "",
    vatAmount: "",
  });
  const [preview, setPreview] = useState<AccountingRow[]>([]);
  const [manualRows, setManualRows] = useState<AccountingRow[]>([
    {
      date: "",
      invoiceNumber: "",
      vendorName: "",
      taxId: "",
      baseAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
    },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("choose");
    setRawHeaders([]);
    setRawData([]);
    setColumnMapping({ date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: "", vatAmount: "" });
    setPreview([]);
    setFileError("");
    setPdfFileName("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const autoDetectColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: "", vatAmount: "" };
    headers.forEach((h) => {
      const lower = h.toLowerCase().trim();
      for (const [hint, field] of Object.entries(THAI_COLUMN_HINTS)) {
        if (lower.includes(hint.toLowerCase()) && !mapping[field]) {
          mapping[field] = h;
          break;
        }
      }
    });
    return mapping;
  };

  const parsePdf = async (file: File) => {
    if (!companyCode) {
      setFileError("ไม่พบรหัสบริษัท กรุณาลองใหม่");
      return;
    }
    setFileError("");
    setPdfFileName(file.name);
    setStep("pdf-loading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/${companyCode}/reconcile/extract-pdf`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setStep("choose");
        setFileError(json.error ?? "AI ไม่สามารถอ่าน PDF ได้");
        return;
      }

      setPreview(json.data.rows as AccountingRow[]);
      setStep("preview");
    } catch {
      setStep("choose");
      setFileError("เกิดข้อผิดพลาดในการส่งไฟล์ กรุณาลองใหม่");
    }
  };

  const parseExcel = async (file: File) => {
    setFileError("");
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "dd/mm/yyyy" });

      // Find header row (first non-empty row with text content)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i] as string[];
        if (row && row.some((cell) => typeof cell === "string" && cell.trim().length > 1)) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = (rows[headerRowIdx] as string[]).map((h) => String(h ?? "").trim()).filter(Boolean);
      const dataRows = rows.slice(headerRowIdx + 1).filter((r) => {
        const row = r as string[];
        return row && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
      }) as string[][];

      setRawHeaders(headers);
      setRawData(dataRows);
      setColumnMapping(autoDetectColumns(headers));
      setStep("mapping");
    } catch {
      setFileError("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบ Excel/CSV");
    }
  };

  const parseFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith(".pdf")) {
      await parsePdf(file);
    } else {
      await parseExcel(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, "").trim();
    return parseFloat(cleaned) || 0;
  };

  const parseDate = (val: string): string => {
    if (!val) return "";
    // Handle dd/mm/yyyy or d/m/yyyy (Buddhist or Gregorian)
    const parts = String(val).split(/[\/\-\.]/);
    if (parts.length === 3) {
      let [d, m, y] = parts.map((p) => p.trim());
      // Convert Buddhist year if > 2500
      if (parseInt(y) > 2500) y = String(parseInt(y) - 543);
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return val;
  };

  const applyMapping = () => {
    const rows: AccountingRow[] = rawData
      .map((row) => {
        const get = (colName: string) => {
          const idx = rawHeaders.indexOf(colName);
          return idx >= 0 ? String(row[idx] ?? "").trim() : "";
        };

        const base = parseNumber(get(columnMapping.baseAmount));
        const vat = parseNumber(get(columnMapping.vatAmount));

        return {
          date: parseDate(get(columnMapping.date)),
          invoiceNumber: get(columnMapping.invoiceNumber),
          vendorName: get(columnMapping.vendorName),
          taxId: get(columnMapping.taxId),
          baseAmount: base,
          vatAmount: vat,
          totalAmount: base + vat,
        };
      })
      .filter((r) => r.vendorName || r.baseAmount > 0);

    setPreview(rows);
    setStep("preview");
  };

  const handleManualRowChange = (
    idx: number,
    field: keyof AccountingRow,
    value: string
  ) => {
    setManualRows((prev) => {
      const updated = [...prev];
      if (field === "baseAmount" || field === "vatAmount" || field === "totalAmount") {
        updated[idx] = { ...updated[idx], [field]: parseFloat(value) || 0 };
        if (field !== "totalAmount") {
          updated[idx].totalAmount = updated[idx].baseAmount + updated[idx].vatAmount;
        }
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const addManualRow = () => {
    setManualRows((prev) => [
      ...prev,
      { date: "", invoiceNumber: "", vendorName: "", taxId: "", baseAmount: 0, vatAmount: 0, totalAmount: 0 },
    ]);
  };

  const removeManualRow = (idx: number) => {
    setManualRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImportManual = () => {
    const valid = manualRows.filter((r) => r.vendorName || r.baseAmount > 0);
    onImport(valid);
    handleClose();
  };

  const handleImportPreview = () => {
    onImport(preview);
    handleClose();
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

        {/* Step: Choose */}
        {step === "choose" && (
          <div className="space-y-4 py-2">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">
                  <FileSpreadsheet className="h-3 w-3" /> .xlsx / .xls / .csv
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5">
                  <FileText className="h-3 w-3" /> .pdf (AI อ่าน)
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {fileError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {fileError}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">หรือ</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setStep("manual")}
            >
              <Plus className="h-4 w-4" />
              กรอกข้อมูลเองทีละแถว
            </Button>
          </div>
        )}

        {/* Step: PDF Loading */}
        {step === "pdf-loading" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">AI กำลังอ่าน PDF...</p>
              <p className="text-sm text-muted-foreground">{pdfFileName}</p>
              <p className="text-xs text-muted-foreground">Gemini กำลัง extract ตารางภาษี อาจใช้เวลา 10-30 วินาที</p>
            </div>
          </div>
        )}

        {/* Step: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              พบ {rawHeaders.length} คอลัมน์ และ {rawData.length} แถวข้อมูล — กรุณาตรวจสอบการจับคู่คอลัมน์
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(FIELD_LABELS) as [keyof ColumnMapping, string][]).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {label}
                    {(field === "date" || field === "vendorName" || field === "baseAmount") && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <Select
                    value={columnMapping[field]}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({ ...prev, [field]: val }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="เลือกคอลัมน์..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- ไม่เลือก --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Raw preview */}
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 border-b">
                <p className="text-xs font-medium text-muted-foreground">ตัวอย่างข้อมูล (3 แถวแรก)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30">
                      {rawHeaders.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t">
                        {rawHeaders.map((_, j) => (
                          <td key={j} className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate">
                            {String(row[j] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("choose")}>
                ย้อนกลับ
              </Button>
              <Button
                onClick={applyMapping}
                disabled={!columnMapping.date || !columnMapping.vendorName || !columnMapping.baseAmount}
              >
                ดูตัวอย่าง
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <span>
                {pdfFileName ? (
                  <>AI อ่าน PDF สำเร็จ — พบ <strong>{preview.length}</strong> รายการ</>
                ) : (
                  <>พร้อมนำเข้า <strong>{preview.length}</strong> รายการ</>
                )}
              </span>
              {pdfFileName && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5">
                  <FileText className="h-3 w-3" /> PDF
                </span>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">วันที่</TableHead>
                    <TableHead className="text-xs">เลขที่ใบกำกับ</TableHead>
                    <TableHead className="text-xs">ชื่อผู้ขาย</TableHead>
                    <TableHead className="text-xs text-right">ยอด</TableHead>
                    <TableHead className="text-xs text-right">VAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5">{row.date}</TableCell>
                      <TableCell className="text-xs py-1.5">{row.invoiceNumber || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5 max-w-[160px] truncate">{row.vendorName}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">
                        {row.baseAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right text-blue-600">
                        {row.vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                ย้อนกลับ
              </Button>
              <Button onClick={handleImportPreview} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                นำเข้า {preview.length} รายการ
              </Button>
            </div>
          </div>
        )}

        {/* Step: Manual Entry */}
        {step === "manual" && (
          <div className="space-y-4 py-2">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-28">วันที่</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-32">เลขที่ใบกำกับ</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">ชื่อผู้ขาย/ผู้ให้บริการ</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-32">เลขภาษี</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-28">ยอดก่อน VAT</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-24">VAT</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-1 py-1">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleManualRowChange(idx, "date", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={row.invoiceNumber}
                          onChange={(e) => handleManualRowChange(idx, "invoiceNumber", e.target.value)}
                          placeholder="เลขที่..."
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={row.vendorName}
                          onChange={(e) => handleManualRowChange(idx, "vendorName", e.target.value)}
                          placeholder="ชื่อบริษัท..."
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={row.taxId}
                          onChange={(e) => handleManualRowChange(idx, "taxId", e.target.value)}
                          placeholder="0000000000000"
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.baseAmount || ""}
                          onChange={(e) => handleManualRowChange(idx, "baseAmount", e.target.value)}
                          placeholder="0.00"
                          className="h-7 text-xs text-right"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.vatAmount || ""}
                          onChange={(e) => handleManualRowChange(idx, "vatAmount", e.target.value)}
                          placeholder="0.00"
                          className="h-7 text-xs text-right"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeManualRow(idx)}
                          disabled={manualRows.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={addManualRow} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              เพิ่มแถว
            </Button>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("choose")}>
                ย้อนกลับ
              </Button>
              <Button
                onClick={handleImportManual}
                disabled={!manualRows.some((r) => r.vendorName || r.baseAmount > 0)}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                นำเข้า {manualRows.filter((r) => r.vendorName || r.baseAmount > 0).length} รายการ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
