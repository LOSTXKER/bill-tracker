"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  // Find current selected key based on rate
  const selectedKey = Object.entries(WHT_RATES).find(
    ([, { rate }]) => rate === selectedRate
  )?.[0];

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
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">ประเภทและอัตรา</Label>
          <Select
            value={selectedKey || ""}
            onValueChange={(key) => {
              const whtInfo = WHT_RATES[key as keyof typeof WHT_RATES];
              if (whtInfo) {
                onRateSelect(whtInfo.rate, key);
              }
            }}
          >
            <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
              <SelectValue placeholder="เลือกประเภทภาษีหัก ณ ที่จ่าย" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WHT_RATES).map(([key, { rate, description }]) => (
                <SelectItem key={key} value={key}>
                  {description} ({rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
