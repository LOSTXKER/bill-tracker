"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Receipt, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExpenseDocumentType = "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";

interface DocumentTypeSelectorProps {
  value: ExpenseDocumentType;
  onChange: (value: ExpenseDocumentType) => void;
  disabled?: boolean;
}

const DOCUMENT_OPTIONS = [
  {
    value: "CASH_RECEIPT" as const,
    label: "มีบิลเงินสด",
    description: "มีใบเสร็จรับเงิน/บิลเงินสด",
    icon: Receipt,
  },
  {
    value: "NO_DOCUMENT" as const,
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
      
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as ExpenseDocumentType)}
        disabled={disabled}
        className="grid gap-2"
      >
        {DOCUMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                isSelected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-border/50 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              )}
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
