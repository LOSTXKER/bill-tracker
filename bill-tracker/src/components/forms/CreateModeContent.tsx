"use client";

import { Dispatch, SetStateAction } from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { ContactSummary } from "@/types";
import type { ContactDefaults } from "@/hooks/use-contact-defaults";
import type { UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import {
  TransactionFieldsSection,
  type TransactionFieldsConfig,
} from "./shared/TransactionFieldsSection";
import { ContactDefaultsSuggestion } from "./shared/ContactDefaultsSuggestion";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { PayerSection, type PayerInfo } from "./shared/PayerSection";
import {
  InputMethodSection,
  type CategorizedFiles,
  type MultiDocAnalysisResult,
} from "./shared/InputMethodSection";

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
  const fieldsConfig: TransactionFieldsConfig = {
    type: config.type,
    dateField: config.fields.dateField,
    descriptionField: config.fields.descriptionField,
    statusOptions: config.statusOptions,
    showDueDate: config.showDueDate,
  };

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
          <div className={`p-2 rounded-xl ${config.iconColor}`}>
            <config.icon className="h-5 w-5" />
          </div>
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Fields Section */}
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

          {/* Contact Defaults Suggestion */}
          {selectedContact && hasContactDefaults && contactDefaults && !defaultsSuggestionDismissed && (
            <ContactDefaultsSuggestion
              contactName={selectedContact.name}
              defaults={contactDefaults}
              onApply={applyContactDefaults}
              onDismiss={() => setDefaultsSuggestionDismissed(true)}
            />
          )}

          {/* Currency Conversion Note - manual toggle + AI-detected */}
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

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Tax & Amount Section */}
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
          />

          {/* Payer Section (expense only, create mode) */}
          {config.type === "expense" && mode === "create" && (
            <PayerSection
              companyCode={companyCode}
              totalAmount={calculation.netAmount}
              mode={mode}
              payers={payers}
              onPayersChange={setPayers}
            />
          )}

          {/* Notes (view/edit mode only) */}
          {mode !== "create" && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
              {mode === "edit" ? (
                <Textarea
                  {...register("notes")}
                  placeholder="เพิ่มหมายเหตุ..."
                  rows={2}
                  className="bg-muted/30 resize-none"
                />
              ) : (
                <p className="text-base text-muted-foreground">
                  {(watch("notes") as string) || <span className="italic">ไม่มีหมายเหตุ</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column for CREATE mode */}
        <div className="lg:col-span-2">
          <InputMethodSection
            key={filesInitialized ? "with-prefill" : "fresh"}
            companyCode={companyCode}
            transactionType={config.type}
            onFilesChange={setCategorizedFiles}
            onAiResult={handleAiResult}
            showWhtCert={watchIsWht}
            initialFiles={filesInitialized ? categorizedFiles : undefined}
          />
        </div>
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
  );
}
