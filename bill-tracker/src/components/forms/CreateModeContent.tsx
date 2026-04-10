"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
import { Loader2, Sparkles, ArrowLeft, ListChecks, MessageSquareText, Settings2, Calculator, Wallet, Plus, Bookmark, Replace } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import type { ContactSummary } from "@/types";

const EMPTY_URLS: string[] = [];
import type { ContactDefaults, TransactionPreset } from "@/hooks/use-contact-defaults";
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
    selectedAccount,
    selectedCategory,
  } = useTransactionFormContext();

  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");
  const [savePresetOpen, setSavePresetOpen] = useState(false);

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
                  <>
                    <div className="flex items-center gap-2">
                      {contactDefaults && contactDefaults.presets.length > 0 && (
                        <div className="flex-1">
                          <PresetDropdown
                            presets={contactDefaults.presets}
                            config={config}
                            setValue={setValue}
                          />
                        </div>
                      )}
                      <div className={contactDefaults && contactDefaults.presets.length > 0 ? "" : "flex-1"}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-9 whitespace-nowrap"
                          onClick={() => setSavePresetOpen(true)}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          บันทึกเป็น Preset
                        </Button>
                      </div>
                    </div>
                    <SavePresetDialog
                      open={savePresetOpen}
                      onOpenChange={setSavePresetOpen}
                      companyCode={companyCode}
                      contactId={selectedContact.id}
                      existingPresets={contactDefaults?.presets ?? []}
                      config={config}
                      watch={watch}
                      onSaved={mutateContactDefaults}
                    />
                  </>
                ) : undefined
              }
            />

            {/* Section 3: จำนวนเงินและภาษี */}
            <div className="space-y-4">
              <div className="border-t border-border pt-5 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">จำนวนเงินและภาษี</span>
              </div>

              <AmountInput watch={watch} setValue={setValue} vatRate={watchVatRate || 0} isWht={watchIsWht || false} onModeChange={setAmountInputMode} />

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
                documentType={(watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || "TAX_INVOICE"}
                onDocumentTypeChange={config.type === "expense" ? handleDocumentTypeChange : undefined}
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

// ---------------------------------------------------------------------------
// Preset Dropdown (internal)
// ---------------------------------------------------------------------------

function PresetDropdown({
  presets,
  config,
  setValue,
}: {
  presets: TransactionPreset[];
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<Record<string, unknown>>;
}) {
  const { onAccountChange, onCategoryChange } = useTransactionFormContext();

  const handleSelect = (index: string) => {
    const preset = presets[Number(index)];
    if (!preset) return;

    if (preset.description && config.fields.descriptionField?.name) {
      setValue(config.fields.descriptionField.name, preset.description);
    }
    if (preset.accountId) onAccountChange(preset.accountId);
    if (preset.categoryId) onCategoryChange(preset.categoryId);
    if (preset.vatRate != null) setValue("vatRate", Number(preset.vatRate));
    if (preset.whtEnabled != null) {
      setValue("isWht", preset.whtEnabled);
      if (preset.whtType) setValue("whtType", preset.whtType);
      if (preset.whtRate != null) setValue("whtRate", Number(preset.whtRate));
    }
    if (preset.documentType) setValue("documentType", preset.documentType);
    if (preset.notes) setValue("notes", preset.notes);
  };

  return (
    <div className="flex items-center gap-3">
      <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">
          เลือก Preset
        </Label>
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="เลือก preset..." />
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

// ---------------------------------------------------------------------------
// Save Preset Dialog (internal)
// ---------------------------------------------------------------------------

const DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "ใบกำกับภาษี",
  CASH_RECEIPT: "บิลเงินสด",
  NO_DOCUMENT: "ไม่มีเอกสาร",
};

const WHT_TYPE_LABELS: Record<string, string> = {
  SERVICE_3: "ค่าบริการ",
  PROFESSIONAL_5: "ค่าวิชาชีพ",
  TRANSPORT_1: "ค่าขนส่ง",
  RENT_5: "ค่าเช่า",
  ADVERTISING_2: "ค่าโฆษณา",
};

function SavePresetDialog({
  open,
  onOpenChange,
  companyCode,
  contactId,
  existingPresets,
  config,
  watch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCode: string;
  contactId: string;
  existingPresets: TransactionPreset[];
  config: UnifiedTransactionConfig;
  watch: UseFormWatch<Record<string, unknown>>;
  onSaved: () => void;
}) {
  const {
    selectedAccount,
    selectedCategory,
  } = useTransactionFormContext();

  const [saveMode, setSaveMode] = useState<"new" | "overwrite">("new");
  const [overwriteIndex, setOverwriteIndex] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSaveMode("new");
      setOverwriteIndex(null);
      setLabel("");

      if (selectedAccount) {
        fetch(`/api/${companyCode.toLowerCase()}/accounts`)
          .then(r => r.json())
          .then(json => {
            const accounts = json.data?.accounts || json.accounts || [];
            const found = accounts.find((a: { id: string; code: string; name: string }) => a.id === selectedAccount);
            setAccountName(found ? `${found.code} - ${found.name}` : null);
          })
          .catch(() => setAccountName(null));
      } else {
        setAccountName(null);
      }

      if (selectedCategory) {
        const catType = config.type === "expense" ? "EXPENSE" : "INCOME";
        fetch(`/api/${companyCode}/categories?type=${catType}`)
          .then(r => r.json())
          .then(json => {
            const groups = json.data?.categories || [];
            for (const g of groups) {
              const found = (g.children || []).find((c: { id: string }) => c.id === selectedCategory);
              if (found) { setCategoryName(found.name); return; }
            }
            setCategoryName(null);
          })
          .catch(() => setCategoryName(null));
      } else {
        setCategoryName(null);
      }
    }
  }, [open, selectedAccount, selectedCategory, companyCode, config.type]);

  const buildPresetFromForm = (): TransactionPreset => {
    const desc = config.fields.descriptionField
      ? String(watch(config.fields.descriptionField.name) || "")
      : "";
    return {
      label: label.trim(),
      description: desc,
      accountId: selectedAccount || null,
      categoryId: selectedCategory || null,
      vatRate: watch("vatRate") != null ? Number(watch("vatRate")) : null,
      whtEnabled: !!watch("isWht"),
      whtRate: watch("whtRate") != null ? Number(watch("whtRate")) : null,
      whtType: (watch("whtType") as string) || null,
      documentType: (watch("documentType") as string) || null,
      notes: (watch("notes") as string) || null,
    };
  };

  const handleSelectOverwriteTarget = (index: number) => {
    setOverwriteIndex(index);
    const preset = existingPresets[index];
    if (preset) setLabel(preset.label);
  };

  const handleSaveModeChange = (mode: "new" | "overwrite") => {
    setSaveMode(mode);
    if (mode === "new") {
      setOverwriteIndex(null);
      setLabel("");
    } else if (mode === "overwrite" && existingPresets.length > 0) {
      handleSelectOverwriteTarget(0);
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("กรุณาระบุชื่อ Preset");
      return;
    }
    if (saveMode === "overwrite" && overwriteIndex === null) {
      toast.error("กรุณาเลือก preset ที่ต้องการบันทึกทับ");
      return;
    }

    setSaving(true);
    try {
      const newPreset = buildPresetFromForm();

      const updatedPresets =
        saveMode === "overwrite" && overwriteIndex !== null
          ? existingPresets.map((p, i) => (i === overwriteIndex ? newPreset : p))
          : [...existingPresets, newPreset];

      const res = await fetch(
        `/api/${companyCode.toUpperCase()}/contacts/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptionPresets: updatedPresets }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }

      toast.success(saveMode === "overwrite" ? "บันทึกทับ preset แล้ว" : "บันทึก preset แล้ว");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const hasExisting = existingPresets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึกเป็น Preset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PresetPreviewSummary
            config={config}
            watch={watch}
            accountName={accountName}
            categoryName={categoryName}
          />

          {hasExisting && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={saveMode === "new" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleSaveModeChange("new")}
              >
                <Plus className="h-3.5 w-3.5" />
                สร้างใหม่
              </Button>
              <Button
                type="button"
                variant={saveMode === "overwrite" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleSaveModeChange("overwrite")}
              >
                <Replace className="h-3.5 w-3.5" />
                บันทึกทับอันเดิม
              </Button>
            </div>
          )}

          {saveMode === "overwrite" && hasExisting && (
            <div className="space-y-1.5">
              <Label className="text-sm">เลือก preset ที่ต้องการบันทึกทับ</Label>
              <Select
                value={overwriteIndex !== null ? String(overwriteIndex) : undefined}
                onValueChange={(val) => handleSelectOverwriteTarget(Number(val))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="เลือก preset..." />
                </SelectTrigger>
                <SelectContent>
                  {existingPresets.map((preset, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">ชื่อ Preset <span className="text-red-500">*</span></Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น ค่าบริการรายเดือน"
              className="h-10"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {saveMode === "overwrite" ? "บันทึกทับ" : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Preset Preview Summary (internal)
// ---------------------------------------------------------------------------

function PresetPreviewSummary({
  config,
  watch,
  accountName,
  categoryName,
}: {
  config: UnifiedTransactionConfig;
  watch: UseFormWatch<Record<string, unknown>>;
  accountName: string | null;
  categoryName: string | null;
}) {
  const desc = config.fields.descriptionField
    ? String(watch(config.fields.descriptionField.name) || "")
    : "";
  const vatRate = watch("vatRate") != null ? Number(watch("vatRate")) : null;
  const whtEnabled = !!watch("isWht");
  const whtRate = watch("whtRate") != null ? Number(watch("whtRate")) : null;
  const whtType = (watch("whtType") as string) || null;
  const docType = (watch("documentType") as string) || null;
  const notes = (watch("notes") as string) || null;

  const rows: { label: string; value: string | null }[] = [];

  if (desc) rows.push({ label: "คำอธิบาย", value: desc });
  if (docType && config.type === "expense") rows.push({ label: "ประเภทเอกสาร", value: DOC_TYPE_LABELS[docType] || docType });
  rows.push({ label: "VAT", value: vatRate ? `${vatRate}%` : "ไม่มี" });

  if (whtEnabled && whtRate) {
    const typeLabel = whtType ? WHT_TYPE_LABELS[whtType] || whtType : null;
    rows.push({ label: "หัก ณ ที่จ่าย", value: `${whtRate}%${typeLabel ? ` (${typeLabel})` : ""}` });
  } else {
    rows.push({ label: "หัก ณ ที่จ่าย", value: "ไม่หัก" });
  }

  if (accountName) rows.push({ label: "บัญชี", value: accountName });
  if (categoryName) rows.push({ label: "หมวดหมู่", value: categoryName });
  if (notes) rows.push({ label: "หมายเหตุ", value: notes });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-0">
      <p className="text-xs font-medium text-muted-foreground mb-2">ข้อมูลที่จะบันทึก</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="text-muted-foreground whitespace-nowrap">{row.label}</span>
            <span className="text-foreground truncate">{row.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
