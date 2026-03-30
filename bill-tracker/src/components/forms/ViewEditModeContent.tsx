"use client";

import { Dispatch, SetStateAction } from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareText } from "lucide-react";
import type { UnifiedTransactionConfig } from "./UnifiedTransactionForm";
import type { BaseTransaction } from "./hooks/useTransactionForm";
import {
  TransactionFieldsSection,
  buildFieldsConfig,
} from "./shared/TransactionFieldsSection";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { PayerSection, type PayerInfo } from "./shared/PayerSection";
import { TransactionSidePanel } from "./TransactionSidePanel";
import type {
  AccountSuggestion,
  CurrencyConversionValue,
  WhtChangeInfo,
  Calculation,
} from "./CreateModeContent";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ViewEditModeContentProps {
  config: UnifiedTransactionConfig;
  companyCode: string;
  mode: "create" | "view" | "edit";
  register: UseFormRegister<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  calculation: Calculation;
  watchAmount: number;
  watchVatRate: number;
  watchIsWht: boolean;
  watchWhtRate: number;
  watchWhtType: string;
  watchDocumentType: string | undefined;
  transaction: BaseTransaction;
  currencyConversion: CurrencyConversionValue | null;
  setCurrencyConversion: Dispatch<SetStateAction<CurrencyConversionValue | null>>;
  payers: PayerInfo[];
  setPayers: Dispatch<SetStateAction<PayerInfo[]>>;
  whtChangeInfo: WhtChangeInfo;
  handleWhtToggle: (enabled: boolean, confirmed?: boolean, reason?: string) => void;
  handleDocumentTypeChange: (docType: string) => void;
  setAccountSuggestion: Dispatch<SetStateAction<AccountSuggestion>>;
  uploadingType: string | null;
  handleFileUploadWrapper: (file: File, type: "slip" | "invoice" | "wht" | "other") => Promise<void>;
  handleDeleteFileWrapper: (type: "slip" | "invoice" | "wht" | "other", urlToDelete: string) => Promise<void>;
  auditRefreshKey: number;
  currentUserId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewEditModeContent({
  config,
  companyCode,
  mode,
  register,
  watch,
  setValue,
  calculation,
  watchAmount,
  watchVatRate,
  watchIsWht,
  watchWhtRate,
  watchWhtType,
  watchDocumentType,
  transaction,
  currencyConversion,
  setCurrencyConversion,
  payers,
  setPayers,
  whtChangeInfo,
  handleWhtToggle,
  handleDocumentTypeChange,
  setAccountSuggestion,
  uploadingType,
  handleFileUploadWrapper,
  handleDeleteFileWrapper,
  auditRefreshKey,
  currentUserId,
}: ViewEditModeContentProps) {
  const fieldsConfig = buildFieldsConfig(config);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column: Main Info */}
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
              isWht={config.type === "expense" ? transaction?.isWht : transaction?.isWhtDeducted}
              onAiSuggestAccount={mode === "edit" ? (suggestion) => {
                setAccountSuggestion({
                  accountId: suggestion.accountId,
                  accountCode: null,
                  accountName: null,
                  confidence: 80,
                  reason: "AI จำแนกจากรายละเอียด",
                  alternatives: suggestion.alternatives,
                });
              } : undefined}
            />

            {/* Currency Conversion Note - show in view/edit mode when currency data exists */}
            {currencyConversion && (
              <CurrencyConversionNote
                currencyConversion={currencyConversion}
                onRateChange={mode === "edit" ? (newRate, newConvertedAmount) => {
                  setValue("amount", newConvertedAmount);
                  setCurrencyConversion((prev) => prev ? {
                    ...prev,
                    exchangeRate: newRate,
                    convertedAmount: newConvertedAmount,
                    conversionNote: `แปลงจาก ${prev.currency} ${prev.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ฿${newRate.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                  } : null);
                } : undefined}
              />
            )}

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
              documentType={(transaction?.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || (watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || "TAX_INVOICE"}
              onDocumentTypeChange={config.type === "expense" && mode === "edit" ? handleDocumentTypeChange : undefined}
              totalWithVat={calculation.totalWithVat}
              netAmount={calculation.netAmount}
              netAmountLabel={config.fields.netAmountLabel}
            />

            {/* Payer Section (expense only, view/edit mode) */}
            {config.type === "expense" && (
              <PayerSection
                companyCode={companyCode}
                totalAmount={calculation.netAmount}
                mode={mode}
                payers={payers}
                onPayersChange={setPayers}
              />
            )}

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <MessageSquareText className="h-3.5 w-3.5" />
                หมายเหตุ
              </p>
              {mode === "edit" ? (
                <Textarea
                  {...register("notes")}
                  placeholder="เพิ่มหมายเหตุ..."
                  rows={2}
                  className="bg-muted/30 resize-none"
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {(watch("notes") as string) || <span className="italic text-muted-foreground/60">ไม่มีหมายเหตุ</span>}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <TransactionSidePanel
          config={config}
          transaction={transaction}
          companyCode={companyCode}
          uploadingType={uploadingType}
          onFileUpload={handleFileUploadWrapper}
          onFileDelete={handleDeleteFileWrapper}
          auditRefreshKey={auditRefreshKey}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
