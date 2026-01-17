"use client";

import { useState, useEffect } from "react";
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
import { ContactSelector, type AiVendorSuggestion } from "./ContactSelector";
import { AccountSelector } from "./account-selector";
import type { ContactSummary } from "@/types";
import { Plus, X, ExternalLink, Link2 } from "lucide-react";

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
  suggestedAccountAlternatives?: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason: string;
  }>;
  
  // AI-detected new vendor suggestion
  aiVendorSuggestion?: AiVendorSuggestion | null;
  
  // Reference URLs state
  referenceUrls?: string[];
  onReferenceUrlsChange?: (urls: string[]) => void;
  
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
  suggestedAccountAlternatives,
  aiVendorSuggestion,
  referenceUrls = [],
  onReferenceUrlsChange,
  renderAdditionalFields,
}: TransactionFieldsSectionProps) {
  const isEditable = mode === "create" || mode === "edit";
  const watchStatus = watch("status") as string | undefined;
  const watchDate = watch(config.dateField.name);
  const formData = watch() as Record<string, unknown>;
  
  // Reference URL input state
  const [newReferenceUrl, setNewReferenceUrl] = useState("");
  
  const addReferenceUrl = () => {
    if (!newReferenceUrl.trim()) return;
    let url = newReferenceUrl.trim();
    
    // Auto-add https:// if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      // Invalid URL, don't add
      return;
    }
    
    if (!referenceUrls.includes(url)) {
      onReferenceUrlsChange?.([...referenceUrls, url]);
    }
    setNewReferenceUrl("");
  };
  
  const removeReferenceUrl = (urlToRemove: string) => {
    onReferenceUrlsChange?.(referenceUrls.filter(url => url !== urlToRemove));
  };

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

        {/* Row 5: Due Date */}
        {renderAdditionalFields?.()}
        
        {/* Row 6: Reference URLs */}
        {referenceUrls.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">ลิงค์อ้างอิง</p>
            <div className="space-y-2">
              {referenceUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
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

        {/* Account Selector - AI แนะนำจากเอกสารอัตโนมัติ */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">บัญชี</Label>
          <AccountSelector
            value={selectedAccount}
            onValueChange={onAccountChange}
            companyCode={companyCode}
            placeholder="เลือกบัญชี"
            suggestedAccountId={suggestedAccountId}
            alternatives={suggestedAccountAlternatives}
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

      {/* Row 5: Additional fields + Status */}
      <div className="grid sm:grid-cols-2 gap-4">
        {renderAdditionalFields?.()}

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
      
      {/* Row 6: Reference URLs */}
      {onReferenceUrlsChange && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            ลิงค์อ้างอิง
          </Label>
          
          {/* Existing URLs */}
          {referenceUrls.length > 0 && (
            <div className="space-y-2 mb-2">
              {referenceUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1"
                  >
                    {url}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeReferenceUrl(url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add new URL */}
          <div className="flex gap-2">
            <Input
              placeholder="พิมพ์ลิงค์ เช่น shopee.co.th/..."
              value={newReferenceUrl}
              onChange={(e) => setNewReferenceUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addReferenceUrl();
                }
              }}
              className="h-10 bg-muted/30 border-border focus:bg-background"
            />
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary/90"
              onClick={addReferenceUrl}
              disabled={!newReferenceUrl.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            เพิ่มลิงค์สินค้า, ลิงค์ติดตามพัสดุ, หรือลิงค์อ้างอิงอื่นๆ (ระบบจะเติม https:// ให้อัตโนมัติ)
          </p>
        </div>
      )}
    </div>
  );
}
