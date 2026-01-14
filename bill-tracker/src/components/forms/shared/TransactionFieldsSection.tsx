"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "./DatePicker";
import { ContactSelector, type AiVendorSuggestion } from "./ContactSelector";
import { AccountSelector, SuggestNewAccount } from "./account-selector";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import type { ContactSummary } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface TransactionFieldsConfig {
  type: "expense" | "income";
  dateField: {
    name: string;
    label: string;
  };
  descriptionField?: {
    name: string;
    label: string;
    placeholder: string;
  };
  statusOptions: Array<{
    value: string;
    label: string;
    color: string;
    condition?: (formData: Record<string, unknown>) => boolean;
  }>;
  showDueDate?: boolean;
}

// Simplified form control types (compatible with react-hook-form)
type FormRegister = (name: string) => Record<string, unknown>;
type FormWatch = (name?: string) => unknown;
type FormSetValue = (name: string, value: unknown) => void;

export interface TransactionFieldsSectionProps {
  config: TransactionFieldsConfig;
  companyCode: string;
  mode: "create" | "view" | "edit";
  
  // Form controls (simplified types)
  register: FormRegister;
  watch: FormWatch;
  setValue: FormSetValue;
  
  // Contact state
  contacts: ContactSummary[];
  contactsLoading: boolean;
  selectedContact: ContactSummary | null;
  onContactSelect: (contact: ContactSummary | null) => void;
  onContactCreated?: (contact: ContactSummary) => void;
  oneTimeContactName?: string;
  onOneTimeContactNameChange?: (name: string) => void;
  
  // Account state
  selectedAccount: string | null;
  onAccountChange: (value: string | null) => void;
  suggestedAccountId?: string;
  suggestNewAccount?: SuggestNewAccount;
  accountAlternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;
  
  // Optional AI suggestion button
  onSuggestAccount?: () => void;
  isSuggestingAccount?: boolean;
  accountSuggestionSource?: "learned" | "ai" | "none";
  
  // AI-detected new vendor suggestion
  aiVendorSuggestion?: AiVendorSuggestion | null;
  
  // Additional fields renderer (e.g., due date for expenses)
  renderAdditionalFields?: () => React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function TransactionFieldsSection({
  config,
  companyCode,
  mode,
  register,
  watch,
  setValue,
  contacts,
  contactsLoading,
  selectedContact,
  onContactSelect,
  onContactCreated,
  oneTimeContactName,
  onOneTimeContactNameChange,
  selectedAccount,
  onAccountChange,
  suggestedAccountId,
  suggestNewAccount,
  accountAlternatives,
  onSuggestAccount,
  isSuggestingAccount,
  accountSuggestionSource,
  aiVendorSuggestion,
  renderAdditionalFields,
}: TransactionFieldsSectionProps) {
  const isEditable = mode === "create" || mode === "edit";
  const watchStatus = watch("status") as string | undefined;
  const watchDate = watch(config.dateField.name);
  const formData = watch() as Record<string, unknown>;

  // Load account details for view mode
  const [accountDetails, setAccountDetails] = useState<{ code: string; name: string } | null>(null);
  
  useEffect(() => {
    if (!isEditable && selectedAccount) {
      fetch(`/api/${companyCode}/accounts/${selectedAccount}`, {
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then(json => {
          // Handle new API format { success, data: { account: {...} } }
          const account = json.success ? json.data?.account : json;
          if (account?.code && account?.name) {
            setAccountDetails({ code: account.code, name: account.name });
          }
        })
        .catch(() => setAccountDetails(null));
    }
  }, [selectedAccount, isEditable, companyCode]);

  // View mode: Clean label-value display
  if (!isEditable) {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const PAYMENT_METHOD_LABELS: Record<string, string> = {
      CASH: "เงินสด",
      BANK_TRANSFER: "โอนเงิน",
      PROMPTPAY: "พร้อมเพย์",
      CREDIT_CARD: "บัตรเครดิต",
      CHEQUE: "เช็ค",
    };

    return (
      <div className="space-y-6">
        {/* Row 1: Date & Amount */}
        <div className="grid grid-cols-2 gap-x-12">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{config.dateField.label}</p>
            <p className="text-base font-semibold text-foreground">
              {watchDate ? new Date(watchDate as string).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }) : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">จำนวนเงิน (ก่อน VAT)</p>
            <p className="text-xl font-bold text-foreground">
              ฿{formatCurrency((watch("amount") as number) || 0)}
            </p>
          </div>
        </div>

        {/* Row 2: Contact & Account */}
        <div className="grid grid-cols-2 gap-x-12">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {config.type === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ"}
            </p>
            <p className="text-base font-semibold text-foreground">
              {selectedContact?.name || <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">บัญชี</p>
            <p className="text-base font-semibold text-foreground">
              {accountDetails ? `${accountDetails.code} ${accountDetails.name}` : <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
        </div>

        {/* Row 3: Description */}
        {config.descriptionField && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">{config.descriptionField.label}</p>
            <p className="text-base text-foreground leading-relaxed">
              {(watch(config.descriptionField.name) as string) || <span className="text-muted-foreground">-</span>}
            </p>
          </div>
        )}

        {/* Row 4: Invoice & Reference */}
        <div className="grid grid-cols-2 gap-x-12">
          <div>
            <p className="text-sm text-muted-foreground mb-1">เลขที่ใบกำกับ</p>
            <p className="text-base font-semibold text-foreground">
              {(watch("invoiceNumber") as string) || <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">เลขอ้างอิง</p>
            <p className="text-base font-semibold text-foreground">
              {(watch("referenceNo") as string) || <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
        </div>

        {/* Row 5: Due Date & Payment Method */}
        <div className="grid grid-cols-2 gap-x-12">
          {renderAdditionalFields?.()}
          <div>
            <p className="text-sm text-muted-foreground mb-1">วิธีชำระเงิน</p>
            <p className="text-base font-semibold text-foreground">
              {PAYMENT_METHOD_LABELS[(watch("paymentMethod") as string)] || "โอนเงิน"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit mode: Form inputs
  return (
    <div className="space-y-4">
      {/* Row 1: Date & Amount */}
      <div className="grid sm:grid-cols-2 gap-4">
        <DatePicker
          label={config.dateField.label}
          value={watchDate as Date | undefined}
          onChange={(date) => setValue(config.dateField.name, date || new Date())}
          required
        />
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-foreground font-medium">
            จำนวนเงิน (ก่อน VAT)
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              ฿
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className="pl-10 text-2xl h-14 font-semibold bg-muted/30 border-border focus:bg-background transition-colors"
              placeholder="0.00"
              {...register("amount")}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Contact & Account */}
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

        {/* Account Selector with AI Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              บัญชี <span className="text-red-500">*</span>
              {accountSuggestionSource === "learned" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  🤖 AI จำได้
                </span>
              )}
            </Label>
            {onSuggestAccount && (
              <button
                type="button"
                className="inline-flex items-center h-7 px-2.5 text-xs border border-primary/30 rounded-md hover:bg-primary/10 hover:text-primary hover:border-primary disabled:opacity-50"
                onClick={onSuggestAccount}
                disabled={isSuggestingAccount}
              >
                {isSuggestingAccount ? (
                  <span className="animate-spin h-3.5 w-3.5">⏳</span>
                ) : (
                  <>
                    <span className="mr-1.5">✨</span>
                    <span className="font-medium">AI แนะนำ</span>
                  </>
                )}
              </button>
            )}
          </div>
          <AccountSelector
            value={selectedAccount}
            onValueChange={onAccountChange}
            companyCode={companyCode}
            placeholder="เลือกบัญชี"
            suggestedAccountId={suggestedAccountId}
            suggestNewAccount={suggestNewAccount}
            alternatives={accountAlternatives}
          />
        </div>
      </div>

      {/* Row 3: Description */}
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

      {/* Row 4: Invoice Number & Reference No */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber" className="text-sm text-muted-foreground">
            เลขที่ใบกำกับ
          </Label>
          <Input
            id="invoiceNumber"
            placeholder="เลขที่ใบกำกับภาษี (ถ้ามี)"
            className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
            {...register("invoiceNumber")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo" className="text-sm text-muted-foreground">
            เลขอ้างอิง
          </Label>
          <Input
            id="referenceNo"
            placeholder="เลขอ้างอิง (ถ้ามี)"
            className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
            {...register("referenceNo")}
          />
        </div>
      </div>

      {/* Row 5: Additional fields + Payment Method + Status */}
      <div className="grid sm:grid-cols-2 gap-4">
        {renderAdditionalFields?.()}

        <PaymentMethodSelect
          value={(watch("paymentMethod") as string) || "BANK_TRANSFER"}
          onChange={(value) => setValue("paymentMethod", value)}
          label={config.type === "income" ? "วิธีรับเงิน" : undefined}
        />

        {/* Status Selector - Only in create mode */}
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
    </div>
  );
}
