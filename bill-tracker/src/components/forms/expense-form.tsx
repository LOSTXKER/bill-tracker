"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Receipt } from "lucide-react";
import { calculateExpenseTotals } from "@/lib/utils/tax-calculator";
import { useContacts } from "@/hooks/use-contacts";
import { useCategories } from "@/hooks/use-categories";
import { AmountInput } from "./shared/AmountInput";
import { VatToggle } from "./shared/VatToggle";
import { WhtSection } from "./shared/WhtSection";
import { PaymentMethodSelect } from "./shared/PaymentMethodSelect";
import { CalculationSummary } from "./shared/CalculationSummary";
import { DocumentUploadSection } from "./shared/DocumentUploadSection";
import { ContactSelector } from "./shared/ContactSelector";
import { CategorySelector } from "./shared/CategorySelector";
import { DatePicker } from "./shared/DatePicker";
import type { ExpenseInput } from "@/lib/validations/expense";
import type { ContactSummary } from "@/types";

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

  // Use custom hooks for data fetching
  const { contacts, isLoading: contactsLoading } = useContacts(companyCode);
  const { categories, isLoading: categoriesLoading } = useCategories(companyCode, "EXPENSE");
  
  // Contact and category state
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      amount: 0,
      vatRate: 7,
      isWht: false,
      paymentMethod: "BANK_TRANSFER",
      status: "PENDING_PHYSICAL",
      billDate: new Date(),
    },
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWht = watch("isWht");
  const watchWhtRate = watch("whtRate");
  const watchBillDate = watch("billDate");
  const watchDueDate = watch("dueDate");

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
          contactId: selectedContact?.id || null,
          categoryId: selectedCategory,
          category: undefined, // Remove old enum field
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
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Receipt className="h-5 w-5 text-destructive" />
            </div>
            บันทึกรายจ่าย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DatePicker
            label="วันที่จ่ายเงิน"
            value={watchBillDate}
            onChange={(date) => setValue("billDate", date || new Date())}
            required
          />

          <AmountInput register={register} name="amount" />

          <ContactSelector
            contacts={contacts}
            isLoading={contactsLoading}
            selectedContact={selectedContact}
            onSelect={setSelectedContact}
            label="ผู้ติดต่อ (ผู้ขาย/ร้านค้า)"
            placeholder="เลือกผู้ติดต่อ..."
          />

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground font-medium">
              รายละเอียด
            </Label>
            <Input
              id="description"
              placeholder="เช่น ค่าหมึกพิมพ์ DTF"
              className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
              {...register("description")}
            />
          </div>

          <CategorySelector
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            label="หมวดหมู่"
            placeholder="เลือกหมวดหมู่"
          />

          <DatePicker
            label="วันครบกำหนด (ถ้ามี)"
            value={watchDueDate}
            onChange={(date) => setValue("dueDate", date)}
          />

          <DocumentUploadSection
            type="expense"
            onSlipUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, slipUrl: url }))
            }
            onInvoiceUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, taxInvoiceUrl: url }))
            }
            onWhtCertUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, whtCertUrl: url }))
            }
            showWhtCert={watchIsWht}
          />

          <Separator className="my-6" />

          <VatToggle value={watchVatRate} onChange={(value) => setValue("vatRate", value)} />

          <WhtSection
            isEnabled={watchIsWht}
            onToggle={(enabled) => {
              setValue("isWht", enabled);
              if (!enabled) {
                setValue("whtRate", undefined);
                setValue("whtType", undefined);
              }
            }}
            selectedRate={watchWhtRate}
            onRateSelect={(rate, type) => {
              setValue("whtRate", rate);
              setValue("whtType", type as ExpenseInput["whtType"]);
            }}
          />

          <PaymentMethodSelect
            value={watch("paymentMethod")}
            onChange={(value) => setValue("paymentMethod", value as ExpenseInput["paymentMethod"])}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">สถานะเอกสาร</Label>
            <Select
              defaultValue="PENDING_PHYSICAL"
              onValueChange={(value) => setValue("status", value as ExpenseInput["status"])}
            >
              <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_PHYSICAL">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    ได้บิลครบแล้ว (รอส่งบัญชี)
                  </div>
                </SelectItem>
                <SelectItem value="WAITING_FOR_DOC">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    ร้านส่งบิลตามมา
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-6" />

          <CalculationSummary
            baseAmount={calculation.baseAmount}
            vatRate={watchVatRate}
            vatAmount={calculation.vatAmount}
            totalWithVat={calculation.totalWithVat}
            whtRate={watchWhtRate}
            whtAmount={calculation.whtAmount}
            netAmount={calculation.netAmount}
            type="expense"
          />
        </CardContent>

        <CardFooter className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11"
            onClick={() => router.back()}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
