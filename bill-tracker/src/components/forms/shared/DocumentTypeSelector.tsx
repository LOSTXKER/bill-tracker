"use client";

import { Label } from "@/components/ui/label";
import { FileText, Receipt, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

import type { ExpenseDocumentType } from "@prisma/client";
export type { ExpenseDocumentType };

interface DocumentTypeSelectorProps {
  value: ExpenseDocumentType;
  onChange: (value: ExpenseDocumentType) => void;
  disabled?: boolean;
}

const DOCUMENT_OPTIONS: Array<{
  value: ExpenseDocumentType;
  label: string;
  description: string;
  icon: typeof Receipt;
}> = [
  {
    value: "CASH_RECEIPT",
    label: "มีบิลเงินสด",
    description: "มีใบเสร็จรับเงิน/บิลเงินสด",
    icon: Receipt,
  },
  {
    value: "NO_DOCUMENT",
    label: "ไม่มีเอกสาร",
    description: "ค่าใช้จ่ายเบ็ดเตล็ด",
    icon: FileX,
  },
];

export function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/50 p-4 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="space-y-1">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-600" />
          ประเภทเอกสาร
        </Label>
        <p className="text-sm text-muted-foreground">
          รายการ VAT 0% ไม่ต้องมีใบกำกับภาษี
        </p>
      </div>

      <div className="grid gap-2">
        {DOCUMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                isSelected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-border/50 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              {isSelected && (
                <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
