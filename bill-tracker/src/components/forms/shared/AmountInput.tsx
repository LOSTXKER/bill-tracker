"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseFormRegister, FieldValues, Path } from "react-hook-form";

interface AmountInputProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  name: Path<T>;
  label?: string;
  error?: string;
}

export function AmountInput<T extends FieldValues>({
  register,
  name,
  label = "จำนวนเงิน (ก่อน VAT)",
  error,
}: AmountInputProps<T>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-foreground font-medium">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          ฿
        </span>
        <Input
          id={name}
          type="number"
          step="0.01"
          min="0"
          className="pl-10 text-2xl h-14 font-semibold bg-muted/30 border-border focus:bg-background transition-colors"
          placeholder="0.00"
          {...register(name, { valueAsNumber: true })}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
