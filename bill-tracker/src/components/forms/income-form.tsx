"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, Wallet } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { incomeSchema, type IncomeInput } from "@/lib/validations/income";
import { calculateIncomeTotals, formatCurrency, WHT_RATES } from "@/lib/utils/tax-calculator";

interface IncomeFormProps {
  companyCode: string;
}

export function IncomeForm({ companyCode }: IncomeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [calculation, setCalculation] = useState({
    baseAmount: 0,
    vatAmount: 0,
    whtAmount: 0,
    totalWithVat: 0,
    netAmount: 0,
  });
  const [uploadedFiles, setUploadedFiles] = useState<{
    customerSlipUrl?: string;
    myBillCopyUrl?: string;
    whtCertUrl?: string;
  }>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      companyId: "",
      amount: 0,
      vatRate: 0,
      isWhtDeducted: false,
      whtRate: undefined,
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    },
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWhtDeducted = watch("isWhtDeducted");
  const watchWhtRate = watch("whtRate");

  // Recalculate totals when values change
  useEffect(() => {
    const calc = calculateIncomeTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWhtDeducted ? (watchWhtRate || 0) : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWhtDeducted, watchWhtRate]);

  const onSubmit = async (data: IncomeInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyCode: companyCode.toUpperCase(),
          vatAmount: calculation.vatAmount,
          whtAmount: calculation.whtAmount,
          netReceived: calculation.netAmount,
          ...uploadedFiles,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      toast.success("บันทึกรายรับสำเร็จ");
      router.push(`/${companyCode.toLowerCase()}/dashboard`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600">
            <Wallet className="h-5 w-5" />
            บันทึกรายรับ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน (ก่อน VAT)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                ฿
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                className="pl-8 text-2xl h-14 font-bold"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">ชื่อลูกค้า</Label>
            <Input
              id="customerName"
              placeholder="เช่น บริษัท ABC จำกัด"
              {...register("customerName")}
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">แหล่งที่มา/รายละเอียด</Label>
            <Input
              id="source"
              placeholder="เช่น ค่าสกรีนเสื้อ 100 ตัว"
              {...register("source")}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label>เอกสารประกอบ</Label>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600 mb-2 block">
                  สลิปลูกค้าโอนมา
                </Label>
                <FileUpload
                  maxFiles={1}
                  folder="customer-slips"
                  onChange={(files) =>
                    setUploadedFiles((prev) => ({
                      ...prev,
                      customerSlipUrl: files[0],
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-2 block">
                  สำเนาบิลที่เราเขียนให้
                </Label>
                <FileUpload
                  maxFiles={1}
                  folder="bills"
                  onChange={(files) =>
                    setUploadedFiles((prev) => ({
                      ...prev,
                      myBillCopyUrl: files[0],
                    }))
                  }
                />
              </div>
              {watchIsWhtDeducted && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">
                    ใบ 50 ทวิ ที่ลูกค้าให้มา
                  </Label>
                  <FileUpload
                    maxFiles={1}
                    folder="wht-certs"
                    onChange={(files) =>
                      setUploadedFiles((prev) => ({
                        ...prev,
                        whtCertUrl: files[0],
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* VAT Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ภาษีมูลค่าเพิ่ม (VAT)</Label>
              <p className="text-sm text-slate-500">ออกใบกำกับภาษี?</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setValue("vatRate", 0)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  watchVatRate === 0
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ไม่มี VAT
              </button>
              <button
                type="button"
                onClick={() => setValue("vatRate", 7)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  watchVatRate === 7
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                VAT 7%
              </button>
            </div>
          </div>

          {/* WHT Deducted Section */}
          <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>โดนหัก ณ ที่จ่าย</Label>
                <p className="text-sm text-slate-500">ลูกค้าหักภาษีเรา?</p>
              </div>
              <Switch
                checked={watchIsWhtDeducted}
                onCheckedChange={(checked) => {
                  setValue("isWhtDeducted", checked);
                  if (!checked) {
                    setValue("whtRate", undefined);
                    setValue("whtType", undefined);
                  }
                }}
              />
            </div>

            {watchIsWhtDeducted && (
              <div className="space-y-3 pt-2">
                <Label>อัตราที่โดนหัก</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(WHT_RATES).map(([key, { rate, description }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setValue("whtRate", rate);
                        setValue("whtType", key as IncomeInput["whtType"]);
                      }}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        watchWhtRate === rate
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <div className="font-medium">{description}</div>
                      <div className="text-sm text-slate-500">{rate}%</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>วิธีรับเงิน</Label>
            <Select
              defaultValue="BANK_TRANSFER"
              onValueChange={(value) => setValue("paymentMethod", value as IncomeInput["paymentMethod"])}
            >
              <SelectTrigger>
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

          {/* Document Status */}
          <div className="space-y-2">
            <Label>สถานะเอกสาร</Label>
            <Select
              defaultValue="PENDING_COPY_SEND"
              onValueChange={(value) => setValue("status", value as IncomeInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_DOC_REQUIRED">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    ไม่ต้องทำเอกสาร
                  </div>
                </SelectItem>
                <SelectItem value="WAITING_ISSUE">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    รอออกบิลให้ลูกค้า
                  </div>
                </SelectItem>
                {watchIsWhtDeducted && (
                  <SelectItem value="WAITING_WHT_CERT">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      รอใบ 50 ทวิ จากลูกค้า
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="PENDING_COPY_SEND">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    เอกสารครบ (รอส่งบัญชี)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Calculation Summary */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                สรุปยอด
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดก่อน VAT</span>
                <span>{formatCurrency(calculation.baseAmount)}</span>
              </div>
              {watchVatRate > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>VAT {watchVatRate}%</span>
                  <span>+{formatCurrency(calculation.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดรวม VAT</span>
                <span>{formatCurrency(calculation.totalWithVat)}</span>
              </div>
              {watchIsWhtDeducted && watchWhtRate && (
                <div className="flex justify-between text-orange-600">
                  <span>ลูกค้าหัก {watchWhtRate}%</span>
                  <span>-{formatCurrency(calculation.whtAmount)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>ยอดรับจริง</span>
              <span className="text-emerald-600">
                {formatCurrency(calculation.netAmount)}
              </span>
            </div>

            {watchIsWhtDeducted && watchWhtRate && (
              <p className="text-xs text-orange-600">
                * ต้องทวงใบ 50 ทวิ จากลูกค้า เพื่อใช้เป็นเครดิตภาษี
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกรายรับ"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
