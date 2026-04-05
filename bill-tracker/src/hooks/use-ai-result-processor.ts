/**
 * Hook for processing AI analysis results and applying them to transaction forms.
 * Uses grouped state setters (patchContactState / patchAiState) to produce
 * fewer setState calls and avoid cascading re-render chains (React #185).
 */

import { useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { normalizeWhtType } from "@/lib/utils/tax-calculator";
import type { ContactSummary } from "@/types";
import type { MultiDocAnalysisResult } from "@/components/forms/shared/InputMethodSection";
import type { UnifiedTransactionConfig } from "@/components/forms/UnifiedTransactionForm";
import type {
  ContactFormState,
  AiFormState,
} from "@/components/forms/hooks/useTransactionFormState";

export type { AiFormState, ContactFormState };

export interface UseAiResultProcessorProps {
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<any>;
  contacts: ContactSummary[];
  patchContactState: (patch: Partial<ContactFormState>) => void;
  patchAiState: (patch: Partial<AiFormState>) => void;
}

export function useAiResultProcessor({
  config,
  setValue,
  contacts,
  patchContactState,
  patchAiState,
}: UseAiResultProcessorProps) {
  const applyAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      if (!result) return;

      const combined = result.combined || {
        totalAmount: 0,
        vatAmount: 0,
        date: null,
        invoiceNumbers: [],
        vendorName: null,
        vendorTaxId: null,
      };
      const smart = result.smart;
      const suggested = (smart?.suggested || {}) as Record<string, unknown>;

      const extendedCombined = combined as typeof combined & {
        vatRate?: number | null;
        amount?: number | null;
        whtRate?: number | null;
        whtAmount?: number | null;
        whtType?: string | null;
        documentType?: string | null;
        vendorBranchNumber?: string | null;
        vendorEmail?: string | null;
        description?: string | null;
        invoiceNumber?: string | null;
        items?: string[];
      };

      // --- Apply form values via setValue (batched by react-hook-form) ---

      const hasCurrencyConversion =
        result.currencyConversion?.convertedAmount !== null &&
        result.currencyConversion?.convertedAmount !== undefined &&
        result.currencyConversion?.currency !== "THB";

      const safeNum = (v: unknown): number | null =>
        typeof v === "number" && Number.isFinite(v) ? v : null;

      if (hasCurrencyConversion && safeNum(result.currencyConversion?.convertedAmount)) {
        let convertedBase = result.currencyConversion!.convertedAmount!;
        // If the AI converted totalAmount (gross) but also returned a vatRate,
        // reverse-calculate the base so we don't treat the gross as pre-VAT.
        if (
          !safeNum(extendedCombined.amount) &&
          safeNum(combined.totalAmount) &&
          safeNum(extendedCombined.vatRate) &&
          extendedCombined.vatRate! > 0
        ) {
          convertedBase = Math.round(convertedBase / (1 + extendedCombined.vatRate! / 100) * 100) / 100;
        }
        setValue("amount", convertedBase);
      } else if (safeNum(extendedCombined.amount)) {
        setValue("amount", extendedCombined.amount);
      } else if (safeNum(combined.totalAmount) && safeNum(extendedCombined.vatRate)) {
        const amountBeforeVat = combined.totalAmount! / (1 + extendedCombined.vatRate! / 100);
        setValue("amount", Math.round(amountBeforeVat * 100) / 100);
      } else if (safeNum(combined.totalAmount)) {
        setValue("amount", combined.totalAmount);
      } else if (safeNum(suggested.amount as number)) {
        setValue("amount", suggested.amount);
      }

      const aiVatRate = suggested.vatRate ?? extendedCombined.vatRate;
      if (hasCurrencyConversion) {
        // Foreign documents: default to VAT 0% (foreign vendors don't issue Thai tax invoices).
        // Only keep a non-zero rate if the AI explicitly returned one.
        const explicitAiVatRate = typeof aiVatRate === "number" && !Number.isNaN(aiVatRate);
        setValue("vatRate", explicitAiVatRate ? aiVatRate : 0);
        if (config.type === "expense" && (!explicitAiVatRate || aiVatRate === 0)) {
          setValue("documentType", "CASH_RECEIPT");
        }
      } else if (aiVatRate !== null && aiVatRate !== undefined && typeof aiVatRate === "number" && !Number.isNaN(aiVatRate)) {
        setValue("vatRate", aiVatRate);
      }

      if (combined.date || suggested.date) {
        const dateStr = combined.date || (suggested.date as string);
        if (dateStr) {
          setValue(config.fields.dateField.name, new Date(dateStr));
        }
      }

      const invoiceNum = combined.invoiceNumbers && combined.invoiceNumbers.length > 0
        ? combined.invoiceNumbers.join(", ")
        : null;
      if (invoiceNum) {
        setValue("invoiceNumber", invoiceNum);
      }

      if (config.fields.descriptionField) {
        let description: string | null = null;

        if (extendedCombined.description && typeof extendedCombined.description === "string") {
          description = extendedCombined.description;
        }

        if (!description) {
          const allItems: string[] = [];
          for (const file of result.files || []) {
            const extracted = file.extracted as {
              items?: Array<{ description: string } | string>;
            };
            if (extracted?.items && Array.isArray(extracted.items)) {
              for (const item of extracted.items) {
                if (typeof item === "string" && item.trim()) {
                  allItems.push(item.trim());
                } else if (typeof item === "object" && item?.description && item.description.trim()) {
                  allItems.push(item.description.trim());
                }
              }
            }
          }
          if (allItems.length > 0) {
            const itemsText = allItems.slice(0, 5).join(", ");
            description =
              allItems.length > 5 ? `${itemsText} และอื่นๆ (${allItems.length} รายการ)` : itemsText;
          }
        }

        if (!description && suggested.description) {
          description = suggested.description as string;
        }

        if (!description && combined.vendorName) {
          const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
          description = `${prefix} ${combined.vendorName}`;
        }

        if (description) {
          setValue(config.fields.descriptionField.name, description);
        }
      }

      // WHT
      const whtRate = (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
      const whtAmount = (suggested.whtAmount as number | null | undefined) ?? extendedCombined.whtAmount;
      const rawWhtType = (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;
      const whtType = normalizeWhtType(rawWhtType);

      const hasWht = (whtRate !== null && whtRate !== undefined && whtRate > 0) ||
                     (whtAmount !== null && whtAmount !== undefined && whtAmount > 0);

      if (hasWht) {
        setValue(config.fields.whtField.name, true);

        if (whtRate && whtRate > 0) {
          setValue("whtRate", whtRate);
        } else if (whtAmount) {
          const aiAmount = extendedCombined.amount || (suggested.amount as number | null);
          if (aiAmount && aiAmount > 0) {
            const calculatedRate = Math.round((whtAmount / aiAmount) * 100);
            const validRates = hasCurrencyConversion
              ? [1, 2, 3, 5, 10, 15]
              : [1, 2, 3, 5];
            if (validRates.includes(calculatedRate)) {
              setValue("whtRate", calculatedRate);
            }
          }
        }

        if (whtType) {
          setValue("whtType", whtType);
        }
      }

      // --- Apply grouped contact state in one batch ---

      const contactPatch: Partial<ContactFormState> = {};
      const contactIdToUse = (suggested.contactId as string) || result.smart?.foundContact?.id;

      if (contactIdToUse) {
        const contact = contacts.find((c) => c.id === contactIdToUse);
        if (contact) {
          contactPatch.selectedContact = contact;
          contactPatch.aiVendorSuggestion = null;
        } else {
          contactPatch.pendingContactId = contactIdToUse;
        }
      } else if (result.smart?.isNewVendor && (combined.vendorName || combined.vendorTaxId)) {
        contactPatch.aiVendorSuggestion = {
          name: combined.vendorName || "",
          taxId: combined.vendorTaxId,
          branchNumber: extendedCombined.vendorBranchNumber ?? null,
          address: null,
          phone: null,
          email: extendedCombined.vendorEmail ?? null,
        };
      }

      if (Object.keys(contactPatch).length > 0) {
        patchContactState(contactPatch);
      }

      // --- Apply grouped AI state in one batch ---

      const aiPatch: Partial<AiFormState> = { aiApplied: true };

      if (result.aiAccountSuggestion?.accountId) {
        aiPatch.accountSuggestion = {
          accountId: result.aiAccountSuggestion.accountId,
          accountCode: result.aiAccountSuggestion.accountCode,
          accountName: result.aiAccountSuggestion.accountName,
          confidence: result.aiAccountSuggestion.confidence,
          reason: result.aiAccountSuggestion.reason || "AI วิเคราะห์จากเอกสาร",
          alternatives: result.aiAccountSuggestion.alternatives || [],
        };
      }

      patchAiState(aiPatch);

      // --- Warnings ---

      if (result.warnings && Array.isArray(result.warnings)) {
        for (const warning of result.warnings) {
          if (warning.severity === "warning") {
            toast.warning(warning.message, { duration: 8000 });
          } else {
            toast.info(warning.message, { duration: 5000 });
          }
        }
      }

      // --- Success toast ---

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
    [setValue, config, contacts, patchContactState, patchAiState]
  );

  return { applyAiResult };
}
