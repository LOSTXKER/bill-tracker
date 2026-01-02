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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, Upload, Receipt } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { expenseSchema, type ExpenseInput, EXPENSE_CATEGORY_LABELS } from "@/lib/validations/expense";
import { calculateExpenseTotals, formatCurrency, WHT_RATES } from "@/lib/utils/tax-calculator";

interface ExpenseFormProps {
  companyCode: string;
}

export function ExpenseForm({ companyCode }: ExpenseFormProps) {
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
    slipUrl?: string;
    taxInvoiceUrl?: string;
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
      vatRate: 7,
      isWht: false,
      whtRate: undefined,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
    },
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWht = watch("isWht");
  const watchWhtRate = watch("whtRate");

  // Recalculate totals when values change
  useEffect(() => {
    const calc = calculateExpenseTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWht ? (watchWhtRate || 0) : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWht, watchWhtRate]);

  const onSubmit = async (data: ExpenseInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyCode: companyCode.toUpperCase(),
          vatAmount: calculation.vatAmount,
          whtAmount: calculation.whtAmount,
          netPaid: calculation.netAmount,
          ...uploadedFiles,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      toast.success("บันทึกรายจ่ายสำเร็จ");
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
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Receipt className="h-5 w-5" />
            บันทึกรายจ่าย
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

          {/* Vendor Name */}
          <div className="space-y-2">
            <Label htmlFor="vendorName">ชื่อร้าน/ผู้ขาย</Label>
            <Input
              id="vendorName"
              placeholder="เช่น ร้านหมึก DTF"
              {...register("vendorName")}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Input
              id="description"
              placeholder="เช่น ค่าหมึกพิมพ์ DTF"
              {...register("description")}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label>เอกสารประกอบ</Label>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600 mb-2 block">
                  สลิปโอนเงิน
                </Label>
                <FileUpload
                  maxFiles={1}
                  folder="slips"
                  onChange={(files) =>
                    setUploadedFiles((prev) => ({
                      ...prev,
                      slipUrl: files[0],
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-2 block">
                  ใบกำกับภาษี/ใบเสร็จ
                </Label>
                <FileUpload
                  maxFiles={1}
                  folder="invoices"
                  onChange={(files) =>
                    setUploadedFiles((prev) => ({
                      ...prev,
                      taxInvoiceUrl: files[0],
                    }))
                  }
                />
              </div>
              {watchIsWht && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">
                    ใบหัก ณ ที่จ่าย (50 ทวิ)
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

          {/* Category */}
          <div className="space-y-2">
            <Label>หมวดหมู่</Label>
            <Select
              onValueChange={(value) => setValue("category", value as ExpenseInput["category"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* VAT Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ภาษีมูลค่าเพิ่ม (VAT)</Label>
              <p className="text-sm text-slate-500">มีใบกำกับภาษี?</p>
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

          {/* WHT Section */}
          <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>หัก ณ ที่จ่าย</Label>
                <p className="text-sm text-slate-500">หักภาษีผู้ขาย?</p>
              </div>
              <Switch
                checked={watchIsWht}
                onCheckedChange={(checked) => {
                  setValue("isWht", checked);
                  if (!checked) {
                    setValue("whtRate", undefined);
                    setValue("whtType", undefined);
                  }
                }}
              />
            </div>

            {watchIsWht && (
              <div className="space-y-3 pt-2">
                <Label>ประเภทและอัตรา</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(WHT_RATES).map(([key, { rate, description }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setValue("whtRate", rate);
                        setValue("whtType", key as ExpenseInput["whtType"]);
                      }}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        watchWhtRate === rate
                          ? "border-red-500 bg-red-50 dark:bg-red-950"
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
            <Label>วิธีชำระเงิน</Label>
            <Select
              defaultValue="BANK_TRANSFER"
              onValueChange={(value) => setValue("paymentMethod", value as ExpenseInput["paymentMethod"])}
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
              defaultValue="PENDING_PHYSICAL"
              onValueChange={(value) => setValue("status", value as ExpenseInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_PHYSICAL">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    ได้บิลครบแล้ว (รอส่งบัญชี)
                  </div>
                </SelectItem>
                <SelectItem value="WAITING_FOR_DOC">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    ร้านส่งบิลตามมา
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
              {watchIsWht && watchWhtRate && (
                <div className="flex justify-between text-red-600">
                  <span>หัก ณ ที่จ่าย {watchWhtRate}%</span>
                  <span>-{formatCurrency(calculation.whtAmount)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>ยอดโอนจริง</span>
              <span className="text-emerald-600">
                {formatCurrency(calculation.netAmount)}
              </span>
            </div>
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
            className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกรายจ่าย"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
