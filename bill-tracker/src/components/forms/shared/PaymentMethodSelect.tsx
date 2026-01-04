"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function PaymentMethodSelect({
  value,
  onChange,
  label = "วิธีชำระเงิน",
}: PaymentMethodSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CASH">เงินสด</SelectItem>
          <SelectItem value="BANK_TRANSFER">โอนเงิน</SelectItem>
          <SelectItem value="PROMPTPAY">พร้อมเพย์</SelectItem>
          <SelectItem value="CREDIT_CARD">บัตรเครดิต</SelectItem>
          <SelectItem value="CHEQUE">เช็ค</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
