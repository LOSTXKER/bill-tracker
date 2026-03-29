"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExchangeRatesProps {
  companyId: string;
  initialRates: Record<string, number>;
}

const CURRENCIES = [
  { code: "USD", name: "ดอลลาร์สหรัฐ", symbol: "$", flag: "🇺🇸" },
  { code: "AED", name: "เดอแรม UAE", symbol: "د.إ", flag: "🇦🇪" },
  { code: "EUR", name: "ยูโร", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "ปอนด์", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "เยน", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "หยวน", symbol: "¥", flag: "🇨🇳" },
  { code: "SGD", name: "ดอลลาร์สิงคโปร์", symbol: "S$", flag: "🇸🇬" },
  { code: "HKD", name: "ดอลลาร์ฮ่องกง", symbol: "HK$", flag: "🇭🇰" },
  { code: "MYR", name: "ริงกิต", symbol: "RM", flag: "🇲🇾" },
] as const;

export function ExchangeRatesSection({ companyId, initialRates }: ExchangeRatesProps) {
  const router = useRouter();
  // Initialize rates from all currencies
  const [rates, setRates] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    CURRENCIES.forEach(currency => {
      initial[currency.code] = initialRates[currency.code]?.toString() || "";
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleRateChange = (currency: string, value: string) => {
    // Allow only numbers and decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    setRates((prev) => ({
      ...prev,
      [currency]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert to numbers and filter out empty values
      const exchangeRates: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(rates)) {
        if (rate && !isNaN(parseFloat(rate))) {
          exchangeRates[currency] = parseFloat(rate);
        }
      }

      const response = await fetch(`/api/companies/${companyId}/exchange-rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRates }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถบันทึกได้");
      }

      toast.success("บันทึกอัตราแลกเปลี่ยนสำเร็จ");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    return CURRENCIES.some(
      currency => rates[currency.code] !== (initialRates[currency.code]?.toString() || "")
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>อัตราแลกเปลี่ยนเงินตรา</CardTitle>
        </div>
        <CardDescription>
          ตั้งค่าอัตราแลกเปลี่ยนสกุลเงินต่างประเทศเป็นบาท (THB) สำหรับการแปลงอัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency Rate Inputs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CURRENCIES.map((currency) => (
            <div key={currency.code} className="space-y-2">
              <Label htmlFor={`rate-${currency.code}`} className="flex items-center gap-2">
                <span className="text-2xl">{currency.flag}</span>
                <div>
                  <p className="font-medium">{currency.code}</p>
                  <p className="text-xs text-muted-foreground">{currency.name}</p>
                </div>
              </Label>
              <div className="relative">
                <Input
                  id={`rate-${currency.code}`}
                  type="text"
                  inputMode="decimal"
                  value={rates[currency.code]}
                  onChange={(e) => handleRateChange(currency.code, e.target.value)}
                  placeholder="0.00"
                  className="h-11 pr-16 text-right font-mono text-lg"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ฿ / {currency.symbol}
                </div>
              </div>
              {rates[currency.code] && (
                <p className="text-xs text-muted-foreground">
                  ตัวอย่าง: {currency.symbol}100 = ฿
                  {(parseFloat(rates[currency.code]) * 100).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 วิธีใช้งาน:</strong>
          </p>
          <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>• AI จะอ่านสกุลเงินจากใบเสร็จอัตโนมัติ</li>
            <li>• ระบบจะแปลงเป็นบาทตามอัตราที่ตั้งค่าไว้</li>
            <li>• จำนวนเงินต้นทางจะถูกบันทึกในหมายเหตุ</li>
            <li>• อัปเดตอัตราเป็นประจำเพื่อความแม่นยำ</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกอัตราแลกเปลี่ยน
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
