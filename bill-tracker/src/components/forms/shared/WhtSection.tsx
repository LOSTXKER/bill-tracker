"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WHT_RATES } from "@/lib/utils/tax-calculator";

interface WhtSectionProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedRate?: number;
  onRateSelect: (rate: number, type: string) => void;
  label?: string;
  description?: string;
}

export function WhtSection({
  isEnabled,
  onToggle,
  selectedRate,
  onRateSelect,
  label = "หัก ณ ที่จ่าย",
  description = "หักภาษีผู้ขาย?",
}: WhtSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={onToggle} />
      </div>

      {isEnabled && (
        <div className="space-y-3 pt-2">
          <Label className="text-sm text-muted-foreground">ประเภทและอัตรา</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(WHT_RATES).map(([key, { rate, description }]) => (
              <button
                key={key}
                type="button"
                onClick={() => onRateSelect(rate, key)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRate === rate
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border bg-muted/20"
                }`}
              >
                <div className="font-medium text-foreground text-sm">{description}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{rate}%</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
