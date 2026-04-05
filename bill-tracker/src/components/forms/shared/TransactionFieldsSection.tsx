"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "./DatePicker";
import { ContactSelector } from "./ContactSelector";

const EMPTY_URLS: string[] = [];
import { AccountSelector } from "./account-selector";
import { CategorySelector } from "./CategorySelector";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AmountInput } from "./AmountInput";
import { TransactionFieldsViewMode } from "./TransactionFieldsViewMode";
import { DocumentSettingsBlock } from "./DocumentSettingsBlock";
import { useTransactionFormContext } from "../TransactionFormContext";

export type {
  TransactionFieldsConfig,
  TransactionFieldsSectionProps,
  AmountInputMode,
  InternalCompanyOption,
} from "./transaction-fields-types";
export { buildFieldsConfig } from "./transaction-fields-types";

import type { TransactionFieldsSectionProps } from "./transaction-fields-types";

export function TransactionFieldsSection({
  config,
  companyCode,
  mode,
  register,
  watch,
  setValue,
  vatRate = 0,
  renderAdditionalFields,
  isWht = false,
  onAiSuggestAccount,
  onAmountInputModeChange,
}: TransactionFieldsSectionProps) {
  const {
    contacts,
    contactsLoading,
    selectedContact,
    onContactSelect,
    onContactCreated,
    oneTimeContactName,
    onOneTimeContactNameChange,
    aiVendorSuggestion,
    selectedAccount,
    onAccountChange,
    suggestedAccountId,
    suggestedAccountAlternatives,
    selectedCategory,
    onCategoryChange,
    suggestedCategoryId,
    suggestedCategoryAlternatives,
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
    internalCompanyId,
    onInternalCompanyChange,
    accessibleCompanies = [],
    referenceUrls = EMPTY_URLS,
    onReferenceUrlsChange,
  } = useTransactionFormContext();

  const isEditable = mode === "create" || mode === "edit";
  const watchStatus = watch("status") as string | undefined;
  const watchDate = watch(config.dateField.name);
  const watchDocumentType = watch("documentType") as string | undefined;
  const formData = watch() as Record<string, unknown>;

  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const handleAiSuggestAccount = async () => {
    const description = watch(config.descriptionField?.name || "description") as string;

    if (!description || description.trim().length < 3) {
      toast.error("กรุณาพิมพ์รายละเอียดก่อน", {
        description: "AI ต้องการข้อความอย่างน้อย 3 ตัวอักษรเพื่อวิเคราะห์",
      });
      return;
    }

    if (!onAiSuggestAccount) return;

    setAiSuggestLoading(true);
    try {
      const res = await fetch(`/api/${companyCode.toLowerCase()}/ai/analyze-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: description,
          type: config.type,
        }),
      });

      if (!res.ok) {
        throw new Error("AI ไม่สามารถวิเคราะห์ได้");
      }

      const json = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error || "ไม่สามารถวิเคราะห์ได้");
      }

      const result = json.data;

      // Handle category suggestion
      if (result.category?.categoryId) {
        if (!selectedCategory) {
          onCategoryChange(result.category.categoryId);
        }
        toast.success("AI แนะนำหมวดหมู่สำเร็จ", {
          description: `[${result.category.groupName}] ${result.category.categoryName}`,
        });
      }

      // Handle account suggestion
      if (result.account?.id) {
        const alternatives = (result.accountAlternatives || []).map((alt: any) => ({
          accountId: alt.id,
          accountCode: alt.code,
          accountName: alt.name,
          confidence: alt.confidence || 50,
          reason: alt.reason || "ทางเลือกอื่น",
        }));

        onAiSuggestAccount({
          accountId: result.account.id,
          alternatives,
        });

        if (!selectedAccount) {
          onAccountChange(result.account.id);
        }
      }

      if (!result.category?.categoryId && !result.account?.id) {
        toast.info("AI ไม่สามารถจำแนกหมวดหมู่ได้", {
          description: "ลองเพิ่มรายละเอียดเพิ่มเติม",
        });
      }
    } catch (error) {
      console.error("AI suggest error:", error);
      toast.error("ไม่สามารถวิเคราะห์ได้", {
        description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setAiSuggestLoading(false);
    }
  };

  if (!isEditable) {
    return (
      <TransactionFieldsViewMode
        config={config}
        companyCode={companyCode}
        watch={watch}
        selectedContact={selectedContact}
        oneTimeContactName={oneTimeContactName}
        selectedAccount={selectedAccount}
        selectedCategory={selectedCategory}
        referenceUrls={referenceUrls}
        renderAdditionalFields={renderAdditionalFields}
        internalCompanyId={internalCompanyId}
        accessibleCompanies={accessibleCompanies}
        isWht={isWht}
        whtDeliveryMethod={whtDeliveryMethod}
        whtDeliveryEmail={whtDeliveryEmail}
        whtDeliveryNotes={whtDeliveryNotes}
        taxInvoiceRequestMethod={taxInvoiceRequestMethod}
        taxInvoiceRequestEmail={taxInvoiceRequestEmail}
        taxInvoiceRequestNotes={taxInvoiceRequestNotes}
        hasDocument={hasDocument}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Date & Amount */}
      <div className="grid sm:grid-cols-2 gap-4">
        <DatePicker
          label={config.dateField.label}
          value={watchDate as Date | undefined}
          onChange={(date) => setValue(config.dateField.name, date || new Date())}
          required
        />
        <AmountInput watch={watch} setValue={setValue} vatRate={vatRate} isWht={isWht} onModeChange={onAmountInputModeChange} />
      </div>

      {/* Contact & Category */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ContactSelector
          contacts={contacts}
          isLoading={contactsLoading}
          selectedContact={selectedContact}
          onSelect={onContactSelect}
          label={config.type === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ"}
          placeholder="พิมพ์ชื่อหรือเลือกจากรายชื่อ..."
          companyCode={companyCode}
          onContactCreated={onContactCreated}
          required
          contactName={oneTimeContactName}
          onContactNameChange={onOneTimeContactNameChange}
          aiVendorSuggestion={aiVendorSuggestion}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              หมวดหมู่ <span className="text-red-500">*</span>
            </Label>
            {onAiSuggestAccount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
                onClick={handleAiSuggestAccount}
                disabled={aiSuggestLoading}
              >
                {aiSuggestLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI จำแนก
              </Button>
            )}
          </div>
          <CategorySelector
            value={selectedCategory}
            onValueChange={onCategoryChange}
            companyCode={companyCode}
            type={config.type === "expense" ? "EXPENSE" : "INCOME"}
            placeholder="เลือกหมวดหมู่..."
            suggestedCategoryId={suggestedCategoryId}
            alternatives={suggestedCategoryAlternatives}
            required
          />
        </div>
      </div>

      {/* Account (optional) */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">
          บัญชี (ไม่บังคับ)
        </Label>
        <AccountSelector
          value={selectedAccount}
          onValueChange={onAccountChange}
          companyCode={companyCode}
          placeholder="เลือกบัญชี"
          suggestedAccountId={suggestedAccountId}
          alternatives={suggestedAccountAlternatives}
          filterClass={config.type === "expense" ? "EXPENSE" : config.type === "income" ? "REVENUE" : undefined}
        />
      </div>

      {/* Internal Company (expense only) */}
      {config.type === "expense" && onInternalCompanyChange && accessibleCompanies.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            บริษัทภายใน (เป็นค่าใช้จ่ายจริงของ)
          </Label>
          <Select
            value={internalCompanyId || "__none__"}
            onValueChange={(value) => onInternalCompanyChange(value === "__none__" ? null : value)}
          >
            <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
              <SelectValue placeholder="ไม่ระบุ (ใช้บริษัทที่บันทึก)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">ไม่ระบุ (ใช้บริษัทที่บันทึก)</span>
              </SelectItem>
              {accessibleCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            ถ้าค่าใช้จ่ายนี้เป็นของบริษัทอื่น (ต่างจากที่บันทึก) ให้เลือกบริษัทจริงที่นี่
          </p>
        </div>
      )}

      {/* Description */}
      {config.descriptionField && (
        <div className="space-y-2">
          <Label htmlFor={config.descriptionField.name} className="text-sm text-muted-foreground">
            {config.descriptionField.label} <span className="text-red-500">*</span>
          </Label>
          <Input
            id={config.descriptionField.name}
            placeholder={config.descriptionField.placeholder}
            className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
            {...register(config.descriptionField.name)}
            required
          />
        </div>
      )}

      {/* Additional fields + Status */}
      <div className="grid sm:grid-cols-2 gap-4">
        {renderAdditionalFields?.()}
        {mode === "create" && config.statusOptions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">สถานะเริ่มต้น</Label>
            <Select
              value={watchStatus || ""}
              onValueChange={(value) => setValue("status", value)}
            >
              <SelectTrigger className="h-11 bg-muted/30 border-border focus:bg-background">
                <SelectValue placeholder="อัตโนมัติ" />
              </SelectTrigger>
              <SelectContent>
                {config.statusOptions.map((option) => {
                  if (option.condition && !option.condition(formData)) {
                    return null;
                  }
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ปกติระบบจะเลือกให้อัตโนมัติตามเอกสารที่แนบ
            </p>
          </div>
        )}
      </div>

      {mode === "edit" && (
        <DocumentSettingsBlock
          mode="edit"
          configType={config.type}
          documentType={watchDocumentType}
          isWht={isWht}
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
      )}
    </div>
  );
}
