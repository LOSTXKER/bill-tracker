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

export type AmountInputMode = "beforeVat" | "includingVat";

// Internal company option for dropdown
export interface InternalCompanyOption {
  id: string;
  name: string;
  code: string;
}

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
  
  // VAT rate (for amount input conversion)
  vatRate?: number;
  
  // Additional fields renderer (e.g., due date for expenses)
  renderAdditionalFields?: () => React.ReactNode;
  
  // Internal company tracking (expense only)
  internalCompanyId?: string | null;
  onInternalCompanyChange?: (id: string | null) => void;
  accessibleCompanies?: InternalCompanyOption[];
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
  vatRate = 0,
  renderAdditionalFields,
  internalCompanyId,
  onInternalCompanyChange,
  accessibleCompanies = [],
}: TransactionFieldsSectionProps) {
  const isEditable = mode === "create" || mode === "edit";
  const watchStatus = watch("status") as string | undefined;
  const watchDate = watch(config.dateField.name);
  const formData = watch() as Record<string, unknown>;
  
  // Amount input mode state
  const [amountInputMode, setAmountInputMode] = useState<AmountInputMode>("beforeVat");
  const [displayAmount, setDisplayAmount] = useState<string>("");
  
  // Sync display amount with form amount when form changes (e.g., from AI)
  const formAmount = watch("amount") as number | undefined;
  useEffect(() => {
    // Only update if amount changed externally
    if (formAmount !== undefined && formAmount !== null) {
      if (amountInputMode === "includingVat" && vatRate > 0) {
        const includingVat = Math.round(formAmount * (1 + vatRate / 100) * 100) / 100;
        setDisplayAmount(String(includingVat));
      } else {
        setDisplayAmount(String(formAmount));
      }
    }
  }, [formAmount, amountInputMode, vatRate]);
  
  // Handle amount input change
  const handleAmountInput = (value: string) => {
    setDisplayAmount(value);
    const numValue = parseFloat(value) || 0;
    
    if (amountInputMode === "includingVat" && vatRate > 0) {
      // Convert from including VAT to before VAT
      const beforeVat = Math.round((numValue / (1 + vatRate / 100)) * 100) / 100;
      setValue("amount", beforeVat);
    } else {
      setValue("amount", numValue);
    }
  };
  
  // Handle input mode toggle
  const handleInputModeToggle = (newMode: AmountInputMode) => {
    if (newMode === amountInputMode) return;
    
    // Convert current display amount to new mode
    const currentValue = parseFloat(displayAmount) || 0;
    
    if (newMode === "includingVat" && vatRate > 0) {
      // Switching to "including VAT" - multiply by (1 + rate)
      const includingVat = Math.round(currentValue * (1 + vatRate / 100) * 100) / 100;
      setDisplayAmount(String(includingVat));
    } else if (newMode === "beforeVat" && vatRate > 0) {
      // Switching to "before VAT" - divide by (1 + rate)
      const beforeVat = Math.round((currentValue / (1 + vatRate / 100)) * 100) / 100;
      setDisplayAmount(String(beforeVat));
    }
    
    setAmountInputMode(newMode);
  };
  
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
              {selectedContact?.name || oneTimeContactName || <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">บัญชี</p>
            <p className="text-base font-semibold text-foreground">
              {accountDetails ? `${accountDetails.code} ${accountDetails.name}` : <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
        </div>

        {/* Row 2.5: Internal Company (expense only) */}
        {config.type === "expense" && internalCompanyId && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">บริษัทภายใน (เป็นค่าใช้จ่ายจริงของ)</p>
            <p className="text-base font-semibold text-foreground">
              {accessibleCompanies.find(c => c.id === internalCompanyId)?.name || 
               <span className="text-muted-foreground font-normal">-</span>}
            </p>
          </div>
        )}

        {/* Row 3: Description */}
        {config.descriptionField && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">{config.descriptionField.label}</p>
            <p className="text-base text-foreground leading-relaxed">
              {(watch(config.descriptionField.name) as string) || <span className="text-muted-foreground">-</span>}
            </p>
          </div>
        )}

        {/* Row 4: Additional fields (Due Date removed) */}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="amount" className="text-foreground font-medium">
              จำนวนเงิน
            </Label>
            {/* Amount input mode toggle - only show when VAT > 0 */}
            {vatRate > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleInputModeToggle("beforeVat")}
                  className={`px-2 py-1 rounded transition-all ${
                    amountInputMode === "beforeVat"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  ก่อน VAT
                </button>
                <button
                  type="button"
                  onClick={() => handleInputModeToggle("includingVat")}
                  className={`px-2 py-1 rounded transition-all ${
                    amountInputMode === "includingVat"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  รวม VAT
                </button>
              </div>
            )}
          </div>
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
              value={displayAmount}
              onChange={(e) => handleAmountInput(e.target.value)}
            />
          </div>
          {/* Show hint when in "including VAT" mode */}
          {amountInputMode === "includingVat" && vatRate > 0 && (
            <p className="text-xs text-muted-foreground">
              ยอดก่อน VAT: ฿{((parseFloat(displayAmount) || 0) / (1 + vatRate / 100)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
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

      {/* Row 2.5: Internal Company (expense only) */}
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

      {/* Row 4: Additional fields + Status */}
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
