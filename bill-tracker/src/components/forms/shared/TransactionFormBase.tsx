"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, LucideIcon } from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { useCategories } from "@/hooks/use-categories";
import { AmountInput } from "./AmountInput";
import { VatToggle } from "./VatToggle";
import { WhtSection } from "./WhtSection";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { CalculationSummary } from "./CalculationSummary";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { ContactSelector } from "./ContactSelector";
import { CategorySelector } from "./CategorySelector";
import { DatePicker } from "./DatePicker";
import type { ContactSummary } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface TransactionFormConfig {
  type: "expense" | "income";
  title: string;
  icon: LucideIcon;
  iconColor: string;
  buttonColor: string;
  apiEndpoint: string;
  redirectPath: string;
  
  // Field configurations
  fields: {
    dateField: {
      name: string;
      label: string;
    };
    descriptionField?: {
      name: string;
      label: string;
      placeholder: string;
    };
    whtField: {
      name: string; // "isWht" or "isWhtDeducted"
      label?: string;
      description?: string;
    };
    netAmountField: string; // "netPaid" or "netReceived"
  };
  
  // Default values
  defaultValues: Record<string, any>;
  
  // Status options
  statusOptions: Array<{
    value: string;
    label: string;
    color: string;
    condition?: (formData: any) => boolean;
  }>;
  
  // Calculation function
  calculateTotals: (
    amount: number,
    vatRate: number,
    whtRate: number
  ) => {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  };
  
  // Document upload configuration
  documentConfig: {
    type: "expense" | "income";
    fields: {
      slip: string;
      invoice: string;
      whtCert: string;
    };
  };
  
  // Additional fields renderer
  renderAdditionalFields?: (props: {
    register: any;
    watch: any;
    setValue: any;
  }) => ReactNode;
}

interface TransactionFormBaseProps {
  companyCode: string;
  config: TransactionFormConfig;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionFormBase({ companyCode, config }: TransactionFormBaseProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [calculation, setCalculation] = useState({
    baseAmount: 0,
    vatAmount: 0,
    whtAmount: 0,
    totalWithVat: 0,
    netAmount: 0,
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  // Use custom hooks for data fetching
  const { contacts, isLoading: contactsLoading } = useContacts(companyCode);
  const { categories, isLoading: categoriesLoading } = useCategories(
    companyCode,
    config.type.toUpperCase() as "EXPENSE" | "INCOME"
  );
  
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
    defaultValues: config.defaultValues,
  });

  const watchAmount = watch("amount");
  const watchVatRate = watch("vatRate");
  const watchIsWht = watch(config.fields.whtField.name);
  const watchWhtRate = watch("whtRate");
  const watchDate = watch(config.fields.dateField.name);

  useEffect(() => {
    const calc = config.calculateTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWht ? (watchWhtRate || 0) : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWht, watchWhtRate, config]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(config.apiEndpoint, {
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
          [config.fields.netAmountField]: calculation.netAmount,
          ...uploadedFiles,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      toast.success(`บันทึก${config.title}สำเร็จ`);
      router.push(config.redirectPath);
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
            <div className={`p-2 rounded-xl ${config.iconColor}`}>
              <config.icon className="h-5 w-5" />
            </div>
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DatePicker
            label={config.fields.dateField.label}
            value={watchDate}
            onChange={(date) => setValue(config.fields.dateField.name, date || new Date())}
            required
          />

          <AmountInput register={register} name="amount" />

          <ContactSelector
            contacts={contacts}
            isLoading={contactsLoading}
            selectedContact={selectedContact}
            onSelect={setSelectedContact}
            label="ผู้ติดต่อ"
            placeholder="เลือกผู้ติดต่อ..."
          />

          {config.fields.descriptionField && (
            <div className="space-y-2">
              <Label htmlFor={config.fields.descriptionField.name} className="text-foreground font-medium">
                {config.fields.descriptionField.label}
              </Label>
              <Input
                id={config.fields.descriptionField.name}
                placeholder={config.fields.descriptionField.placeholder}
                className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
                {...register(config.fields.descriptionField.name)}
              />
            </div>
          )}

          <CategorySelector
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            label="หมวดหมู่"
            placeholder="เลือกหมวดหมู่"
          />

          {config.renderAdditionalFields?.({ register, watch, setValue })}

          <DocumentUploadSection
            type={config.documentConfig.type}
            onSlipUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, [config.documentConfig.fields.slip]: url }))
            }
            onInvoiceUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, [config.documentConfig.fields.invoice]: url }))
            }
            onWhtCertUpload={(url) =>
              setUploadedFiles((prev) => ({ ...prev, [config.documentConfig.fields.whtCert]: url }))
            }
            showWhtCert={watchIsWht}
          />

          <Separator className="my-6" />

          <VatToggle value={watchVatRate} onChange={(value) => setValue("vatRate", value)} />

          <WhtSection
            isEnabled={watchIsWht}
            onToggle={(enabled) => {
              setValue(config.fields.whtField.name, enabled);
              if (!enabled) {
                setValue("whtRate", undefined);
                setValue("whtType", undefined);
              }
            }}
            selectedRate={watchWhtRate}
            onRateSelect={(rate, type) => {
              setValue("whtRate", rate);
              setValue("whtType", type);
            }}
            label={config.fields.whtField.label}
            description={config.fields.whtField.description}
          />

          <PaymentMethodSelect
            value={watch("paymentMethod")}
            onChange={(value) => setValue("paymentMethod", value)}
            label={config.type === "income" ? "วิธีรับเงิน" : undefined}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">สถานะเอกสาร</Label>
            <select
              className="w-full h-11 px-3 rounded-md bg-muted/30 border border-border focus:bg-background transition-colors"
              {...register("status")}
            >
              {config.statusOptions.map((option) => {
                if (option.condition && !option.condition(watch())) {
                  return null;
                }
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>
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
            type={config.type}
            showWhtNote={watchIsWht && !!watchWhtRate}
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
            className={`flex-1 h-11 ${config.buttonColor}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              `บันทึก${config.title}`
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
