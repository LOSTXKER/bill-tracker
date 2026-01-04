"use client";

import { Label } from "@/components/ui/label";

interface VatToggleProps {
  value: number;
  onChange: (value: number) => void;
}

export function VatToggle({ value, onChange }: VatToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Label className="text-foreground font-medium">ภาษีมูลค่าเพิ่ม (VAT)</Label>
        <p className="text-sm text-muted-foreground">มีใบกำกับภาษี?</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === 0
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          ไม่มี VAT
        </button>
        <button
          type="button"
          onClick={() => onChange(7)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === 7
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          VAT 7%
        </button>
      </div>
    </div>
  );
}
