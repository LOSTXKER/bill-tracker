"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import type { AccountingRow } from "./import-types";

interface ManualEntryStepProps {
  manualRows: AccountingRow[];
  onRowChange: (idx: number, field: keyof AccountingRow, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (idx: number) => void;
  onBack: () => void;
  onImport: () => void;
}

export function ManualEntryStep({
  manualRows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  onBack,
  onImport,
}: ManualEntryStepProps) {
  const validCount = manualRows.filter((r) => r.vendorName || r.baseAmount > 0).length;

  return (
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
                    onChange={(e) => onRowChange(idx, "date", e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    value={row.invoiceNumber}
                    onChange={(e) => onRowChange(idx, "invoiceNumber", e.target.value)}
                    placeholder="เลขที่..."
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    value={row.vendorName}
                    onChange={(e) => onRowChange(idx, "vendorName", e.target.value)}
                    placeholder="ชื่อบริษัท..."
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    value={row.taxId}
                    onChange={(e) => onRowChange(idx, "taxId", e.target.value)}
                    placeholder="0000000000000"
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number"
                    value={row.baseAmount || ""}
                    onChange={(e) => onRowChange(idx, "baseAmount", e.target.value)}
                    placeholder="0.00"
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number"
                    value={row.vatAmount || ""}
                    onChange={(e) => onRowChange(idx, "vatAmount", e.target.value)}
                    placeholder="0.00"
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="px-1 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveRow(idx)}
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

      <Button variant="outline" size="sm" onClick={onAddRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        เพิ่มแถว
      </Button>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>
          ย้อนกลับ
        </Button>
        <Button
          onClick={onImport}
          disabled={validCount === 0}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          นำเข้า {validCount} รายการ
        </Button>
      </div>
    </div>
  );
}
