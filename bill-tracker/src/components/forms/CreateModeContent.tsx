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
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  MessageSquareText,
  Settings2,
  Calculator,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import type { ContactSummary } from "@/types";

const EMPTY_URLS: string[] = [];
import type { ContactDefaults } from "@/hooks/use-contact-defaults";
import type { UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import {
  TransactionFieldsSection,
  buildFieldsConfig,
} from "./shared/TransactionFieldsSection";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { CalculationSummary } from "./shared/CalculationSummary";
import { AmountInput } from "./shared/AmountInput";
import type { AmountInputMode } from "./shared/transaction-fields-types";
import { PayerSection, type PayerInfo } from "./shared/PayerSection";
import {
  InputMethodSection,
  type CategorizedFiles,
  type MultiDocAnalysisResult,
} from "./shared/InputMethodSection";
import { DocumentSettingsBlock } from "./shared/DocumentSettingsBlock";
import { PresetControls } from "./shared/PresetControls";
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
  mutateContactDefaults: () => void;
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
  mutateContactDefaults,
  setAccountSuggestion,
  whtChangeInfo,
  handleWhtToggle,
  handleDocumentTypeChange,
  handleAiResult,
  router,
}: CreateModeContentProps) {
  const {
    referenceUrls = EMPTY_URLS,
    onReferenceUrlsChange,
  } = useTransactionFormContext();

  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");

  const fieldsConfig = buildFieldsConfig(config);

  return (
    <div>
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

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column: Single Card with accounting sections */}
        <Card className="lg:col-span-3 shadow-sm border-border">
          <CardContent className="p-6 lg:p-8 space-y-5">
            {/* Sections 1 & 2 rendered by TransactionFieldsSection (sectioned layout) */}
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
              layout="sectioned"
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
              renderAfterInfoSection={
                selectedContact ? (
                  <PresetControls
                    companyCode={companyCode}
                    selectedContact={selectedContact}
                    contactDefaults={contactDefaults}
                    mutateContactDefaults={mutateContactDefaults}
                    config={config}
                    watch={watch}
                    setValue={setValue}
                  />
                ) : undefined
              }
            />

            {/* Section 3: จำนวนเงินและภาษี */}
            <div className="space-y-4">
              <div className="border-t border-border pt-5 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">จำนวนเงินและภาษี</span>
              </div>

              <AmountInput
                watch={watch}
                setValue={setValue}
                vatRate={watchVatRate || 0}
                isWht={watchIsWht || false}
                onModeChange={setAmountInputMode}
              />

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
                    const converted =
                      rate > 0 ? Math.trunc(originalAmount * rate * 100) / 100 : 0;
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
                          conversionNote: `แปลงจาก ${prev.currency} ${prev.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ${formatCurrency(newRate)}`,
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
                              conversionNote: `แปลงจาก ${prev.currencyConversion?.currency} ${prev.currencyConversion?.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ${formatCurrency(newRate)}`,
                            },
                          }
                        : null
                    );
                  }
                }}
              />

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
                documentType={
                  (watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") ||
                  "TAX_INVOICE"
                }
                onDocumentTypeChange={
                  config.type === "expense" ? handleDocumentTypeChange : undefined
                }
                totalWithVat={calculation.totalWithVat}
                netAmount={calculation.netAmount}
                netAmountLabel={config.fields.netAmountLabel}
                showCalculationSummary={false}
              />
            </div>

            {/* Section 4: ผู้จ่ายเงิน (expense only) */}
            {config.type === "expense" && mode === "create" && (
              <div className="space-y-4">
                <div className="border-t border-border pt-5 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">ผู้จ่ายเงิน</span>
                </div>

                <PayerSection
                  companyCode={companyCode}
                  totalAmount={calculation.netAmount}
                  mode={mode}
                  payers={payers}
                  onPayersChange={setPayers}
                />
              </div>
            )}

            {/* Section 5: ตั้งค่าเอกสาร */}
            <div className="space-y-4">
              <div className="border-t border-border pt-5 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">ตั้งค่าเอกสาร</span>
              </div>
              <DocumentSettingsBlock
                mode="edit"
                configType={config.type}
                documentType={watchDocumentType}
                isWht={watchIsWht || false}
                referenceUrls={referenceUrls}
                onReferenceUrlsChange={onReferenceUrlsChange}
              />
            </div>

            {/* Section 6: หมายเหตุ */}
            <div className="space-y-3">
              <div className="border-t border-border pt-5 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">หมายเหตุ</span>
              </div>

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
        <div className="lg:col-span-2 order-first lg:order-none space-y-3">
          <InputMethodSection
            key={filesInitialized ? "with-prefill" : "fresh"}
            companyCode={companyCode}
            transactionType={config.type}
            onFilesChange={setCategorizedFiles}
            onAiResult={handleAiResult}
            showWhtCert={watchIsWht}
            initialFiles={filesInitialized ? categorizedFiles : undefined}
          />

          {/* Mobile-only CalculationSummary */}
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

          <div className="hidden lg:block sticky top-20 z-10">
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
    </div>
  );
}
