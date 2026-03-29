"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import type { ColumnMapping } from "./import-types";
import { FIELD_LABELS } from "./import-types";

interface ColumnMappingStepProps {
  rawHeaders: string[];
  rawData: string[][];
  columnMapping: ColumnMapping;
  setColumnMapping: React.Dispatch<React.SetStateAction<ColumnMapping>>;
  onBack: () => void;
  onApply: () => void;
}

export function ColumnMappingStep({
  rawHeaders,
  rawData,
  columnMapping,
  setColumnMapping,
  onBack,
  onApply,
}: ColumnMappingStepProps) {
  return (
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
              value={columnMapping[field] || "__none__"}
              onValueChange={(val) =>
                setColumnMapping((prev) => ({ ...prev, [field]: val === "__none__" ? "" : val }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="เลือกคอลัมน์..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- ไม่เลือก --</SelectItem>
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
        <Button variant="outline" onClick={onBack}>
          ย้อนกลับ
        </Button>
        <Button
          onClick={onApply}
          disabled={!columnMapping.date || !columnMapping.vendorName || !columnMapping.baseAmount}
        >
          ดูตัวอย่าง
        </Button>
      </div>
    </div>
  );
}
