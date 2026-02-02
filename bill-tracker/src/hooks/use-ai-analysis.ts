/**
 * useAiAnalysis Hook
 * 
 * Manages AI document analysis state and logic for transaction forms.
 * Extracted from UnifiedTransactionForm to reduce complexity.
 */

import { useState, useCallback } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { normalizeWhtType } from "@/lib/utils/tax-calculator";
import type { ContactSummary } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface MultiDocAnalysisResult {
  combined: {
    amount: number | null;
    date: string | null;
    vendorName: string | null;
    vendorTaxId: string | null;
    description: string | null;
    invoiceNumber: string | null;
    vatAmount: number | null;
    whtRate: number | null;
    whtAmount: number | null;
    whtType: string | null;
    documentType: string | null;
    [key: string]: unknown;
  };
  suggested: Record<string, unknown>;
  smart?: {
    foundContact?: { id: string; name: string };
    isNewVendor?: boolean;
    [key: string]: unknown;
  };
  aiAccountSuggestion?: {
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
    reason?: string;
    alternatives?: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      confidence: number;
    }>;
  };
  warnings?: Array<{
    type: string;
    message: string;
    severity: "info" | "warning" | "error";
  }>;
}

export interface AccountSuggestion {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
  reason: string;
  alternatives: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    confidence: number;
  }>;
}

export interface VendorSuggestion {
  name: string;
  taxId?: string | null;
  branchNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface MergeData {
  amount?: number | null;
  vatRate?: number | null;
  date?: string | null;
  description?: string | null;
  invoiceNumber?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  [key: string]: unknown;
}

interface UseAiAnalysisConfig {
  type: "expense" | "income";
  fields: {
    dateField: { name: string };
    descriptionField?: { name: string };
    whtField: { name: string };
  };
}

interface UseAiAnalysisOptions {
  setValue: UseFormSetValue<Record<string, unknown>>;
  config: UseAiAnalysisConfig;
  contacts: ContactSummary[];
  onContactFound?: (contact: ContactSummary) => void;
  onPendingContactId?: (contactId: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useAiAnalysis({
  setValue,
  config,
  contacts,
  onContactFound,
  onPendingContactId,
}: UseAiAnalysisOptions) {
  // State
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [accountSuggestion, setAccountSuggestion] = useState<AccountSuggestion | null>(null);
  const [vendorSuggestion, setVendorSuggestion] = useState<VendorSuggestion | null>(null);

  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);

  /**
   * Apply AI result data to the form
   */
  const applyAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      const { combined, suggested } = result;
      
      // Extended combined data (handle potential nested structures)
      const extendedCombined = combined as typeof combined & {
        vendorBranchNumber?: string | null;
        vendorEmail?: string | null;
      };

      // Apply amount
      const amount = (suggested.amount as number | null | undefined) ?? combined.amount;
      if (amount !== null && amount !== undefined && amount > 0) {
        setValue("amount", amount);
      }

      // Apply VAT
      const vatAmount = (suggested.vatAmount as number | null | undefined) ?? combined.vatAmount;
      if (vatAmount !== null && vatAmount !== undefined) {
        // Calculate VAT rate from amount
        if (amount && amount > 0 && vatAmount > 0) {
          const calculatedVatRate = Math.round((vatAmount / amount) * 100);
          if (calculatedVatRate === 7 || calculatedVatRate === 0) {
            setValue("vatRate", calculatedVatRate);
          }
        }
      }

      // Apply date
      const date = (suggested.date as string | null) ?? combined.date;
      if (date) {
        setValue(config.fields.dateField.name, date);
      }

      // Apply invoice number
      const invoiceNumber = (suggested.invoiceNumber as string | null) ?? combined.invoiceNumber;
      if (invoiceNumber) {
        setValue("invoiceNumber", invoiceNumber);
      }

      // Apply description
      if (config.fields.descriptionField) {
        const description = (suggested.description as string | null) ?? combined.description;
        if (description) {
          setValue(config.fields.descriptionField.name, description);
        }
      }

      // Apply contact
      const contactIdToUse = (suggested.contactId as string) || result.smart?.foundContact?.id;
      if (contactIdToUse) {
        const contact = contacts.find((c) => c.id === contactIdToUse);
        if (contact) {
          onContactFound?.(contact);
          setVendorSuggestion(null);
        } else {
          onPendingContactId?.(contactIdToUse);
        }
      } else if (result.smart?.isNewVendor && (combined.vendorName || combined.vendorTaxId)) {
        // No contact found - suggest creating new one
        setVendorSuggestion({
          name: combined.vendorName || "",
          taxId: combined.vendorTaxId,
          branchNumber: extendedCombined.vendorBranchNumber ?? null,
          address: null,
          phone: null,
          email: extendedCombined.vendorEmail ?? null,
        });
      }

      // Apply account suggestion (don't auto-fill, just show suggestion)
      if (result.aiAccountSuggestion?.accountId) {
        setAccountSuggestion({
          accountId: result.aiAccountSuggestion.accountId,
          accountCode: result.aiAccountSuggestion.accountCode,
          accountName: result.aiAccountSuggestion.accountName,
          confidence: result.aiAccountSuggestion.confidence,
          reason: result.aiAccountSuggestion.reason || "AI วิเคราะห์จากเอกสาร",
          alternatives: result.aiAccountSuggestion.alternatives || [],
        });
      }

      // Show AI warnings
      if (result.warnings && Array.isArray(result.warnings)) {
        for (const warning of result.warnings) {
          if (warning.severity === "warning") {
            toast.warning(warning.message, { duration: 8000 });
          } else {
            toast.info(warning.message, { duration: 5000 });
          }
        }
      }

      // Apply WHT (Withholding Tax)
      const whtRate = (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
      const whtAmount = (suggested.whtAmount as number | null | undefined) ?? extendedCombined.whtAmount;
      const rawWhtType = (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;
      const whtType = normalizeWhtType(rawWhtType);

      // Enable WHT if we have rate OR amount
      const hasWht = 
        (whtRate !== null && whtRate !== undefined && whtRate > 0) ||
        (whtAmount !== null && whtAmount !== undefined && whtAmount > 0);

      if (hasWht) {
        setValue(config.fields.whtField.name, true);

        if (whtRate && whtRate > 0) {
          setValue("whtRate", whtRate);
        } else if (whtAmount) {
          // Calculate rate from amount
          const aiAmount = extendedCombined.amount || (suggested.amount as number | null);
          if (aiAmount && aiAmount > 0) {
            const calculatedRate = Math.round((whtAmount / aiAmount) * 100);
            if ([1, 2, 3, 5].includes(calculatedRate)) {
              setValue("whtRate", calculatedRate);
            }
          }
        }

        if (whtType) {
          setValue("whtType", whtType);
        }
      }

      setAiApplied(true);

      // Build success message
      const documentType = (suggested.documentType as string | null | undefined) || extendedCombined.documentType;
      const docTypeNames: Record<string, string> = {
        TAX_INVOICE: "ใบกำกับภาษี",
        RECEIPT: "ใบเสร็จรับเงิน",
        INVOICE: "ใบแจ้งหนี้",
        BANK_SLIP: "สลิปโอนเงิน",
        WHT_CERT: "ใบหัก ณ ที่จ่าย",
      };
      const docTypeName = documentType ? docTypeNames[documentType] : null;

      toast.success("กรอกข้อมูลจาก AI แล้ว", {
        description: docTypeName
          ? `ตรวจพบ${docTypeName} - โปรดตรวจสอบความถูกต้องก่อนบันทึก`
          : "โปรดตรวจสอบความถูกต้องก่อนบันทึก",
      });
    },
    [setValue, config, contacts, onContactFound, onPendingContactId]
  );

  /**
   * Apply merged data to the form
   */
  const applyMergedData = useCallback(
    (mergedData: MergeData) => {
      if (mergedData.amount !== undefined && mergedData.amount !== null) {
        setValue("amount", mergedData.amount);
      }
      if (mergedData.vatRate !== undefined && mergedData.vatRate !== null) {
        setValue("vatRate", mergedData.vatRate);
      }
      if (mergedData.date) {
        setValue(config.fields.dateField.name, mergedData.date);
      }
      if (config.fields.descriptionField && mergedData.description) {
        setValue(config.fields.descriptionField.name, mergedData.description);
      }
      if (mergedData.invoiceNumber) {
        setValue("invoiceNumber", mergedData.invoiceNumber);
      }
      if (mergedData.contactId) {
        const contact = contacts.find((c) => c.id === mergedData.contactId);
        if (contact) {
          onContactFound?.(contact);
        }
      }
    },
    [setValue, config, contacts, onContactFound]
  );

  /**
   * Handle new AI analysis result
   * Returns true if result was applied directly, false if merge dialog is needed
   */
  const handleAiAnalysisResult = useCallback(
    (result: MultiDocAnalysisResult, hasExistingData: boolean) => {
      if (!hasExistingData) {
        // No existing data - apply directly
        applyAiResult(result);
        setAiResult(result);
        return true;
      } else {
        // Has existing data - show merge dialog
        setPendingAiResult(result);
        setShowMergeDialog(true);
        return false;
      }
    },
    [applyAiResult]
  );

  /**
   * Accept account suggestion
   */
  const acceptAccountSuggestion = useCallback(
    (accountId: string) => {
      setValue("accountId", accountId);
      setAccountSuggestion(null);
    },
    [setValue]
  );

  /**
   * Dismiss account suggestion
   */
  const dismissAccountSuggestion = useCallback(() => {
    setAccountSuggestion(null);
  }, []);

  /**
   * Clear vendor suggestion
   */
  const clearVendorSuggestion = useCallback(() => {
    setVendorSuggestion(null);
  }, []);

  /**
   * Reset all AI state
   */
  const resetAiState = useCallback(() => {
    setAiResult(null);
    setAiApplied(false);
    setAccountSuggestion(null);
    setVendorSuggestion(null);
    setPendingAiResult(null);
    setShowMergeDialog(false);
    setExistingFormData(null);
    setNewAiData(null);
  }, []);

  return {
    // State
    aiResult,
    aiApplied,
    accountSuggestion,
    vendorSuggestion,
    showMergeDialog,
    pendingAiResult,
    existingFormData,
    newAiData,

    // Actions
    setAiResult,
    setAiApplied,
    applyAiResult,
    applyMergedData,
    handleAiAnalysisResult,
    acceptAccountSuggestion,
    dismissAccountSuggestion,
    clearVendorSuggestion,
    resetAiState,

    // Merge dialog
    setShowMergeDialog,
    setPendingAiResult,
    setExistingFormData,
    setNewAiData,
  };
}

export type UseAiAnalysisReturn = ReturnType<typeof useAiAnalysis>;
