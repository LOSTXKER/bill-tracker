"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, FileText } from "lucide-react";
import type { AccountingRow } from "./import-types";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface PreviewStepProps {
  preview: AccountingRow[];
  pdfFileName: string;
  onBack: () => void;
  onImport: () => void;
}

export function PreviewStep({ preview, pdfFileName, onBack, onImport }: PreviewStepProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <span>
          {pdfFileName ? (
            <>อ่าน PDF สำเร็จ — พบ <strong>{preview.length}</strong> รายการ</>
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
              <TableHead className="text-xs text-muted-foreground">วันที่</TableHead>
              <TableHead className="text-xs text-muted-foreground">เลขที่ใบกำกับ</TableHead>
              <TableHead className="text-xs text-muted-foreground">ชื่อผู้ขาย</TableHead>
              <TableHead className="text-xs text-right text-muted-foreground">ยอด</TableHead>
              <TableHead className="text-xs text-right text-muted-foreground">VAT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs py-1.5">{row.date}</TableCell>
                <TableCell className="text-xs py-1.5">{row.invoiceNumber || "-"}</TableCell>
                <TableCell className="text-xs py-1.5 max-w-[160px] truncate">{row.vendorName}</TableCell>
                <TableCell className="text-xs py-1.5 text-right">
                  {formatCurrency(row.baseAmount)}
                </TableCell>
                <TableCell className="text-xs py-1.5 text-right text-blue-600">
                  {formatCurrency(row.vatAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>
          ย้อนกลับ
        </Button>
        <Button onClick={onImport} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          นำเข้า {preview.length} รายการ
        </Button>
      </div>
    </div>
  );
}
