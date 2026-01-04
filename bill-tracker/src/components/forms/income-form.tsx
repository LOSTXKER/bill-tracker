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
import { Loader2, Wallet } from "lucide-react";
import { calculateIncomeTotals } from "@/lib/utils/tax-calculator";
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
import type { IncomeInput } from "@/lib/validations/income";
import type { ContactSummary } from "@/types";

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

  // Use custom hooks for data fetching
  const { contacts, isLoading: contactsLoading } = useContacts(companyCode);
  const { categories, isLoading: categoriesLoading } = useCategories(companyCode, "INCOME");
  
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
      vatRate: 0,
      isWhtDeducted: false,
      paymentMethod: "BANK_TRANSFER",
      status: "PENDING_COPY_SEND",
    },
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWhtDeducted = watch("isWhtDeducted");
  const watchWhtRate = watch("whtRate");

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
          contactId: selectedContact?.id || null,
          categoryId: selectedCategory,
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
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            บันทึกรายรับ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AmountInput register={register} name="amount" />

          <ContactSelector
            contacts={contacts}
            isLoading={contactsLoading}
            selectedContact={selectedContact}
            onSelect={setSelectedContact}
            label="ผู้ติดต่อ (ลูกค้า)"
            placeholder="เลือกผู้ติดต่อ..."
          />

          <div className="space-y-2">
            <Label htmlFor="source" className="text-foreground font-medium">
              แหล่งที่มา/รายละเอียด
            </Label>
            <Input
              id="source"
              placeholder="เช่น ค่าสกรีนเสื้อ 100 ตัว"
              className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
              {...register("source")}
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

          <DocumentUploadSection
            type="income"
            onSlipUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, customerSlipUrl: url }))
            }
            onInvoiceUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, myBillCopyUrl: url }))
            }
            onWhtCertUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, whtCertUrl: url }))
            }
            showWhtCert={watchIsWhtDeducted}
          />

          <Separator className="my-6" />

          <VatToggle value={watchVatRate} onChange={(value) => setValue("vatRate", value)} />

          <WhtSection
            isEnabled={watchIsWhtDeducted}
            onToggle={(enabled) => {
              setValue("isWhtDeducted", enabled);
              if (!enabled) {
                setValue("whtRate", undefined);
                setValue("whtType", undefined);
              }
            }}
            selectedRate={watchWhtRate}
            onRateSelect={(rate, type) => {
              setValue("whtRate", rate);
              setValue("whtType", type as IncomeInput["whtType"]);
            }}
            label="โดนหัก ณ ที่จ่าย"
            description="ลูกค้าหักภาษีเรา?"
          />

          <PaymentMethodSelect
            value={watch("paymentMethod")}
            onChange={(value) => setValue("paymentMethod", value as IncomeInput["paymentMethod"])}
            label="วิธีรับเงิน"
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">สถานะเอกสาร</Label>
            <Select
              defaultValue="PENDING_COPY_SEND"
              onValueChange={(value) => setValue("status", value as IncomeInput["status"])}
            >
              <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_DOC_REQUIRED">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
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
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    เอกสารครบ (รอส่งบัญชี)
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
            type="income"
            showWhtNote={watchIsWhtDeducted && !!watchWhtRate}
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
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
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
