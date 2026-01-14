"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAYMENT_METHODS: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตรเครดิต",
  CHEQUE: "เช็ค",
};

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function PaymentMethodSelect({
  value,
  onChange,
  label = "วิธีชำระเงิน",
  disabled = false,
}: PaymentMethodSelectProps) {
  // View mode - display text only
  if (disabled) {
    return (
      <Select value={value} disabled>
        <SelectTrigger className="h-11 bg-transparent border-0 p-0 shadow-none font-medium [&>svg]:hidden">
          <SelectValue>{PAYMENT_METHODS[value] || value}</SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PAYMENT_METHODS).map(([key, labelText]) => (
            <SelectItem key={key} value={key}>
              {labelText}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
