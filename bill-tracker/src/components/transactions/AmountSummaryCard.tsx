"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { WHT_OPTIONS } from "@/lib/constants/transaction";

interface AmountData {
  amount: number;
  vatRate: number;
  vatAmount: number;
  isWht: boolean;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  netAmount: number;
}

interface Calculation {
  vatAmount: number;
  whtAmount: number;
  netAmount: number;
}

interface AmountSummaryCardProps {
  data: AmountData;
  calculation: Calculation;
  isEditing: boolean;
  onUpdate: (updates: Partial<AmountData>) => void;
  whtFieldName?: "isWht" | "isWhtDeducted";
  netAmountLabel?: string;
}

export function AmountSummaryCard({
  data,
  calculation,
  isEditing,
  onUpdate,
  whtFieldName = "isWht",
  netAmountLabel = "ยอดชำระสุทธิ",
}: AmountSummaryCardProps) {
  const isWhtEnabled = whtFieldName === "isWht" ? data.isWht : data.isWht;

  const handleWhtToggle = (checked: boolean) => {
    onUpdate({
      isWht: checked,
      whtRate: checked ? 3 : null,
      whtType: checked ? "SERVICE_3" : null,
    });
  };

  const handleWhtTypeChange = (value: string) => {
    const opt = WHT_OPTIONS.find((o) => o.value === value);
    onUpdate({
      whtType: value,
      whtRate: opt?.rate || 0,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          รายละเอียดยอดเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount before tax */}
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">จำนวนเงินก่อนภาษี</Label>
          {isEditing ? (
            <Input
              type="number"
              value={data.amount || ""}
              onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
              className="w-40 h-10 text-right bg-muted/30"
              placeholder="0.00"
            />
          ) : (
            <span className="font-mono font-medium">
              {formatCurrency(Number(data.amount))}
            </span>
          )}
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">VAT</Label>
            {isEditing && (
              <Select
                value={String(data.vatRate || 0)}
                onValueChange={(v) => onUpdate({ vatRate: Number(v) })}
              >
                <SelectTrigger className="w-20 h-8 bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="7">7%</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!isEditing && (
              <span className="text-sm text-muted-foreground">({data.vatRate}%)</span>
            )}
          </div>
          <span className="font-mono">
            {formatCurrency(isEditing ? calculation.vatAmount : Number(data.vatAmount || 0))}
          </span>
        </div>

        <div className="h-px bg-border" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">รวมเป็นเงิน</Label>
          <span className="font-mono font-medium">
            {formatCurrency(
              isEditing
                ? (Number(data.amount) || 0) + calculation.vatAmount
                : Number(data.amount) + Number(data.vatAmount || 0)
            )}
          </span>
        </div>

        {/* WHT Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">หัก ณ ที่จ่าย</Label>
            {isEditing && (
              <Switch checked={isWhtEnabled || false} onCheckedChange={handleWhtToggle} />
            )}
          </div>
          {(isEditing ? isWhtEnabled : data.isWht) && (
            <span className="font-mono text-destructive">
              -{formatCurrency(isEditing ? calculation.whtAmount : Number(data.whtAmount || 0))}
            </span>
          )}
        </div>

        {/* WHT Type Selector */}
        {isEditing && isWhtEnabled && (
          <Select
            value={data.whtType || "SERVICE_3"}
            onValueChange={handleWhtTypeChange}
          >
            <SelectTrigger className="h-10 bg-muted/30">
              <SelectValue placeholder="เลือกประเภท" />
            </SelectTrigger>
            <SelectContent>
              {WHT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!isEditing && data.isWht && data.whtType && (
          <div className="text-sm text-muted-foreground">
            ประเภท: {WHT_OPTIONS.find((o) => o.value === data.whtType)?.label}
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Net Amount */}
        <div className="flex items-center justify-between pt-2">
          <Label className="text-base font-medium">{netAmountLabel}</Label>
          <span className="text-xl font-bold text-emerald-600">
            {formatCurrency(isEditing ? calculation.netAmount : Number(data.netAmount))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
