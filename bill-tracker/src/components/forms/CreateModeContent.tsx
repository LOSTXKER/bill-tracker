"use client";

import { Dispatch, SetStateAction, useState } from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSummary } from "@/types";

const EMPTY_URLS: string[] = [];
import type { ContactDefaults } from "@/hooks/use-contact-defaults";
import type { UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import {
  TransactionFieldsSection,
  buildFieldsConfig,
} from "./shared/TransactionFieldsSection";
import { ContactDefaultsSuggestion } from "./shared/ContactDefaultsSuggestion";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { CalculationSummary } from "./shared/CalculationSummary";
import type { AmountInputMode } from "./shared/transaction-fields-types";
import { PayerSection, type PayerInfo } from "./shared/PayerSection";
import {
  InputMethodSection,
  type CategorizedFiles,
  type MultiDocAnalysisResult,
} from "./shared/InputMethodSection";
import { DocumentSettingsBlock } from "./shared/DocumentSettingsBlock";
import { useTransactionFormContext } from "./TransactionFormContext";

// ---------------------------------------------------------------------------
// Shared local types
// ---------------------------------------------------------------------------

export type CurrencyConversionValue = {
  detected: boolean;
  currency: string | null;
  originalAmount: number | null;
  convertedAmount: number | null;
  exchangeRate: number | null;
  conversionNote: string | null;
};

export type AccountSuggestion = {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  confidence: number;
  reason: string;
  alternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;
} | null;

export type WhtChangeInfo = {
  isLocked: boolean;
  requiresConfirmation: boolean;
  message: string;
} | undefined;

export type Calculation = {
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
  totalWithVat: number;
  netAmount: number;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateModeContentProps {
  config: UnifiedTransactionConfig;
  companyCode: string;
  mode: "create" | "view" | "edit";
  register: UseFormRegister<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  isLoading: boolean;
  calculation: Calculation;
  watchAmount: number;
  watchVatRate: number;
  watchIsWht: boolean;
  watchWhtRate: number;
  watchWhtType: string;
  watchDocumentType: string | undefined;
  categorizedFiles: CategorizedFiles;
  setCategorizedFiles: Dispatch<SetStateAction<CategorizedFiles>>;
  currencyConversion: CurrencyConversionValue | null;
  setCurrencyConversion: Dispatch<SetStateAction<CurrencyConversionValue | null>>;
  aiResult: MultiDocAnalysisResult | null;
  setAiResult: Dispatch<SetStateAction<MultiDocAnalysisResult | null>>;
  payers: PayerInfo[];
  setPayers: Dispatch<SetStateAction<PayerInfo[]>>;
  filesInitialized: boolean;
  selectedContact: ContactSummary | null;
  contactDefaults: ContactDefaults | null;
  hasContactDefaults: boolean;
  defaultsSuggestionDismissed: boolean;
  setDefaultsSuggestionDismissed: Dispatch<SetStateAction<boolean>>;
  applyContactDefaults: () => void;
  setAccountSuggestion: Dispatch<SetStateAction<AccountSuggestion>>;
  whtChangeInfo: WhtChangeInfo;
  handleWhtToggle: (enabled: boolean, confirmed?: boolean, reason?: string) => void;
  handleDocumentTypeChange: (docType: string) => void;
  handleAiResult: (result: MultiDocAnalysisResult) => void;
  router: { back: () => void };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateModeContent({
  config,
  companyCode,
  mode,
  register,
  watch,
  setValue,
  isLoading,
  calculation,
  watchAmount,
  watchVatRate,
  watchIsWht,
  watchWhtRate,
  watchWhtType,
  watchDocumentType,
  categorizedFiles,
  setCategorizedFiles,
  currencyConversion,
  setCurrencyConversion,
  aiResult,
  setAiResult,
  payers,
  setPayers,
  filesInitialized,
  selectedContact,
  contactDefaults,
  hasContactDefaults,
  defaultsSuggestionDismissed,
  setDefaultsSuggestionDismissed,
  applyContactDefaults,
  setAccountSuggestion,
  whtChangeInfo,
  handleWhtToggle,
  handleDocumentTypeChange,
  handleAiResult,
  router,
}: CreateModeContentProps) {
  const {
    whtDeliveryMethod,
    onWhtDeliveryMethodChange,
    whtDeliveryEmail,
    onWhtDeliveryEmailChange,
    whtDeliveryNotes,
    onWhtDeliveryNotesChange,
    updateContactDelivery = false,
    onUpdateContactDeliveryChange,
    taxInvoiceRequestMethod,
    onTaxInvoiceRequestMethodChange,
    taxInvoiceRequestEmail,
    onTaxInvoiceRequestEmailChange,
    taxInvoiceRequestNotes,
    onTaxInvoiceRequestNotesChange,
    updateContactTaxInvoiceRequest = false,
    onUpdateContactTaxInvoiceRequestChange,
    hasDocument,
    onHasDocumentChange,
    referenceUrls = EMPTY_URLS,
    onReferenceUrlsChange,
  } = useTransactionFormContext();

  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");

  const fieldsConfig = buildFieldsConfig(config);

  return (
    <>
      {/* Header row — mirrors TransactionViewToolbar layout */}
      <div className="flex items-center justify-between gap-4 py-3 mb-4 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("shrink-0 rounded-full h-9 w-9", config.iconColor)}
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground">{config.title}</h1>
            {aiResult && (
              <p className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                <Sparkles className="h-3 w-3" />
                AI วิเคราะห์เอกสารแล้ว — กรุณาตรวจสอบข้อมูลด้านล่าง
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              `บันทึก${config.title}`
            )}
          </Button>
        </div>
      </div>

      {/* Two-column grid — same structure as ViewEditModeContent */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column: Main Info Card */}
        <Card className="lg:col-span-3 shadow-sm border-border">
          <CardContent className="p-6 lg:p-8 space-y-6">
            <TransactionFieldsSection
              config={fieldsConfig}
              companyCode={companyCode}
              mode={mode}
              register={register}
              watch={watch}
              setValue={setValue}
              vatRate={watchVatRate || 0}
              renderAdditionalFields={() =>
                config.renderAdditionalFields?.({ register, watch, setValue, mode })
              }
              isWht={watchIsWht || false}
              onAmountInputModeChange={setAmountInputMode}
              onAiSuggestAccount={(suggestion) => {
                setAccountSuggestion({
                  accountId: suggestion.accountId,
                  accountCode: null,
                  accountName: null,
                  confidence: 80,
                  reason: "AI จำแนกจากรายละเอียด",
                  alternatives: suggestion.alternatives,
                });
              }}
            />

            {selectedContact && hasContactDefaults && contactDefaults && !defaultsSuggestionDismissed && (
              <ContactDefaultsSuggestion
                contactName={selectedContact.name}
                defaults={contactDefaults}
                onApply={applyContactDefaults}
                onDismiss={() => setDefaultsSuggestionDismissed(true)}
              />
            )}

            {contactDefaults && contactDefaults.descriptionPresets.length > 0 && (
              <PresetDropdown
                presets={contactDefaults.descriptionPresets}
                descriptionFieldName={config.fields.descriptionField?.name}
                setValue={setValue}
              />
            )}

            <CurrencyConversionNote
              currencyConversion={currencyConversion ?? undefined}
              manualMode={mode === "create"}
              onManualToggle={(enabled) => {
                if (enabled) {
                  setCurrencyConversion({
                    detected: true,
                    currency: "USD",
                    originalAmount: 0,
                    convertedAmount: 0,
                    exchangeRate: 0,
                    conversionNote: null,
                  });
                  if (config.type === "expense") {
                    setValue("vatRate", 0);
                    setValue("documentType", "CASH_RECEIPT");
                  }
                } else {
                  setCurrencyConversion(null);
                  setValue("amount", 0);
                }
              }}
              onCurrencyChange={(currency) => {
                setCurrencyConversion((prev) =>
                  prev ? { ...prev, currency } : null
                );
              }}
              onOriginalAmountChange={(originalAmount) => {
                setCurrencyConversion((prev) => {
                  if (!prev) return null;
                  const rate = prev.exchangeRate || 0;
                  const converted = rate > 0 ? Math.trunc(originalAmount * rate * 100) / 100 : 0;
                  if (converted > 0) setValue("amount", converted);
                  return { ...prev, originalAmount, convertedAmount: converted };
                });
              }}
              onRateChange={(newRate, newConvertedAmount) => {
                setValue("amount", newConvertedAmount);
                setCurrencyConversion((prev) =>
                  prev
                    ? {
                        ...prev,
                        exchangeRate: newRate,
                        convertedAmount: newConvertedAmount,
                        conversionNote: `แปลงจาก ${prev.currency} ${prev.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ฿${newRate.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                      }
                    : null
                );
                if (aiResult?.currencyConversion) {
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          currencyConversion: {
                            ...prev.currencyConversion!,
                            exchangeRate: newRate,
                            convertedAmount: newConvertedAmount,
                            conversionNote: `แปลงจาก ${prev.currencyConversion?.currency} ${prev.currencyConversion?.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ฿${newRate.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                          },
                        }
                      : null
                  );
                }
              }}
            />

            <div className="border-t border-border" />

            <TransactionAmountCard
              mode={mode}
              type={config.type}
              amount={watchAmount || 0}
              onAmountChange={(value) => setValue("amount", value)}
              vatRate={watchVatRate || 0}
              onVatRateChange={(value) => setValue("vatRate", value)}
              vatAmount={calculation.vatAmount}
              whtEnabled={watchIsWht || false}
              onWhtToggle={handleWhtToggle}
              whtRate={watchWhtRate}
              whtType={watchWhtType}
              onWhtRateSelect={(rate, type) => {
                setValue("whtRate", rate);
                setValue("whtType", type);
              }}
              whtAmount={calculation.whtAmount}
              whtLabel={config.fields.whtField.label}
              whtDescription={config.fields.whtField.description}
              whtChangeInfo={whtChangeInfo}
              documentType={(watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || "TAX_INVOICE"}
              onDocumentTypeChange={config.type === "expense" ? handleDocumentTypeChange : undefined}
              totalWithVat={calculation.totalWithVat}
              netAmount={calculation.netAmount}
              netAmountLabel={config.fields.netAmountLabel}
              showCalculationSummary={false}
            />

            <div className="lg:hidden">
              <Card className="shadow-sm border-border">
                <CardContent className="p-4">
                  <CalculationSummary
                    baseAmount={watchAmount || 0}
                    vatRate={watchVatRate || 0}
                    vatAmount={calculation.vatAmount}
                    totalWithVat={calculation.totalWithVat}
                    whtRate={watchWhtRate}
                    whtAmount={calculation.whtAmount}
                    netAmount={calculation.netAmount}
                    type={config.type}
                    showWhtNote={(watchIsWht || false) && !!watchWhtRate}
                    inputMode={amountInputMode}
                  />
                </CardContent>
              </Card>
            </div>

            {config.type === "expense" && mode === "create" && (
              <PayerSection
                companyCode={companyCode}
                totalAmount={calculation.netAmount}
                mode={mode}
                payers={payers}
                onPayersChange={setPayers}
              />
            )}

            <DocumentSettingsBlock
              mode="edit"
              configType={config.type}
              documentType={watchDocumentType}
              isWht={watchIsWht || false}
              selectedContact={selectedContact}
              whtDeliveryMethod={whtDeliveryMethod ?? null}
              onWhtDeliveryMethodChange={onWhtDeliveryMethodChange}
              whtDeliveryEmail={whtDeliveryEmail}
              onWhtDeliveryEmailChange={onWhtDeliveryEmailChange}
              whtDeliveryNotes={whtDeliveryNotes}
              onWhtDeliveryNotesChange={onWhtDeliveryNotesChange}
              updateContactDelivery={updateContactDelivery}
              onUpdateContactDeliveryChange={onUpdateContactDeliveryChange}
              taxInvoiceRequestMethod={taxInvoiceRequestMethod ?? null}
              onTaxInvoiceRequestMethodChange={onTaxInvoiceRequestMethodChange}
              taxInvoiceRequestEmail={taxInvoiceRequestEmail}
              onTaxInvoiceRequestEmailChange={onTaxInvoiceRequestEmailChange}
              taxInvoiceRequestNotes={taxInvoiceRequestNotes}
              onTaxInvoiceRequestNotesChange={onTaxInvoiceRequestNotesChange}
              updateContactTaxInvoiceRequest={updateContactTaxInvoiceRequest}
              onUpdateContactTaxInvoiceRequestChange={onUpdateContactTaxInvoiceRequestChange}
              hasDocument={hasDocument}
              onHasDocumentChange={onHasDocumentChange}
              referenceUrls={referenceUrls}
              onReferenceUrlsChange={onReferenceUrlsChange}
            />

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
              <Textarea
                {...register("notes")}
                placeholder="เพิ่มหมายเหตุ (ถ้ามี)..."
                rows={2}
                className="bg-muted/30 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Uploads + Sticky Summary */}
        <div className="lg:col-span-2 order-first lg:order-none space-y-4">
          <InputMethodSection
            key={filesInitialized ? "with-prefill" : "fresh"}
            companyCode={companyCode}
            transactionType={config.type}
            onFilesChange={setCategorizedFiles}
            onAiResult={handleAiResult}
            showWhtCert={watchIsWht}
            initialFiles={filesInitialized ? categorizedFiles : undefined}
          />

          <div className="hidden lg:block sticky top-20">
            <Card className="shadow-sm border-border">
              <CardContent className="p-4">
                <CalculationSummary
                  baseAmount={watchAmount || 0}
                  vatRate={watchVatRate || 0}
                  vatAmount={calculation.vatAmount}
                  totalWithVat={calculation.totalWithVat}
                  whtRate={watchWhtRate}
                  whtAmount={calculation.whtAmount}
                  netAmount={calculation.netAmount}
                  type={config.type}
                  showWhtNote={(watchIsWht || false) && !!watchWhtRate}
                  inputMode={amountInputMode}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Preset Dropdown (internal)
// ---------------------------------------------------------------------------

function PresetDropdown({
  presets,
  descriptionFieldName,
  setValue,
}: {
  presets: { label: string; description: string; accountId?: string | null }[];
  descriptionFieldName?: string;
  setValue: UseFormSetValue<Record<string, unknown>>;
}) {
  const { onAccountChange } = useTransactionFormContext();

  const handleSelect = (index: string) => {
    const preset = presets[Number(index)];
    if (!preset) return;

    if (preset.description && descriptionFieldName) {
      setValue(descriptionFieldName, preset.description);
    }
    if (preset.accountId) {
      onAccountChange(preset.accountId);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">
          เลือกรายการบันทึกที่ใช้บ่อย
        </Label>
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="เลือกรายการที่ต้องการ..." />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset, index) => (
              <SelectItem key={index} value={String(index)}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
