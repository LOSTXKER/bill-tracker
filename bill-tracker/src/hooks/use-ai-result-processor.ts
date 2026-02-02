/**
 * Hook for processing AI analysis results and applying them to transaction forms
 * Extracted from UnifiedTransactionForm to reduce component complexity
 */

import { useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { normalizeWhtType } from "@/lib/utils/tax-calculator";
import type { ContactSummary } from "@/types";
import type { MultiDocAnalysisResult } from "@/components/forms/shared/InputMethodSection";
import type { UnifiedTransactionConfig } from "@/components/forms/UnifiedTransactionForm";

export interface AiVendorSuggestion {
  name: string;
  taxId: string | null | undefined;
  branchNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface AccountSuggestion {
  accountId: string;
  accountCode: string | null;
  accountName: string | null;
  confidence: number | string;
  reason: string;
  alternatives: Array<{
    accountId: string;
    accountCode: string | null;
    accountName: string | null;
    confidence: number | string;
    reason: string;
  }>;
}

export interface UseAiResultProcessorProps {
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<any>;
  contacts: ContactSummary[];
  setSelectedContact: (contact: ContactSummary | null) => void;
  setAiVendorSuggestion: (suggestion: AiVendorSuggestion | null) => void;
  setAccountSuggestion: (suggestion: AccountSuggestion | null) => void;
  setPendingContactId: (id: string | null) => void;
  setAiApplied: (applied: boolean) => void;
}

export function useAiResultProcessor({
  config,
  setValue,
  contacts,
  setSelectedContact,
  setAiVendorSuggestion,
  setAccountSuggestion,
  setPendingContactId,
  setAiApplied,
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

      // Apply amount
      const hasCurrencyConversion =
        result.currencyConversion?.convertedAmount !== null &&
        result.currencyConversion?.convertedAmount !== undefined &&
        result.currencyConversion?.currency !== "THB";

      if (hasCurrencyConversion && result.currencyConversion?.convertedAmount) {
        setValue("amount", result.currencyConversion.convertedAmount);
      } else if (extendedCombined.amount) {
        setValue("amount", extendedCombined.amount);
      } else if (combined.totalAmount && extendedCombined.vatRate) {
        const amountBeforeVat = combined.totalAmount / (1 + extendedCombined.vatRate / 100);
        setValue("amount", Math.round(amountBeforeVat * 100) / 100);
      } else if (combined.totalAmount) {
        setValue("amount", combined.totalAmount);
      } else if (suggested.amount !== null && suggested.amount !== undefined) {
        setValue("amount", suggested.amount);
      }

      // Apply VAT rate
      const vatRate = suggested.vatRate ?? extendedCombined.vatRate;
      if (vatRate !== null && vatRate !== undefined) {
        setValue("vatRate", vatRate);
      }

      // Apply date
      if (combined.date || suggested.date) {
        const dateStr = combined.date || (suggested.date as string);
        if (dateStr) {
          setValue(config.fields.dateField.name, new Date(dateStr));
        }
      }

      // Apply invoice number (รองรับ invoiceNumbers จาก AI)
      const invoiceNum = combined.invoiceNumbers && combined.invoiceNumbers.length > 0 
        ? combined.invoiceNumbers.join(", ") 
        : null;
      if (invoiceNum) {
        setValue("invoiceNumber", invoiceNum);
      }

      // Apply description - ใช้ AI สรุปมาก่อน
      if (config.fields.descriptionField) {
        let description: string | null = null;
        
        // 1. ใช้ description จาก AI (สรุปค่าใช้จ่าย)
        if (extendedCombined.description && typeof extendedCombined.description === "string") {
          description = extendedCombined.description;
        }
        
        // 2. ถ้าไม่มี ลองรวม items จาก OCR
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

        // 3. ถ้ายังไม่มี ลอง suggested
        if (!description && suggested.description) {
          description = suggested.description as string;
        }

        // 4. Fallback เป็นชื่อร้าน
        if (!description && combined.vendorName) {
          const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
          description = `${prefix} ${combined.vendorName}`;
        }

        if (description) {
          setValue(config.fields.descriptionField.name, description);
        }
      }

      // Apply contact
      const contactIdToUse = (suggested.contactId as string) || result.smart?.foundContact?.id;
      if (contactIdToUse) {
        const contact = contacts.find((c) => c.id === contactIdToUse);
        if (contact) {
          setSelectedContact(contact);
          setAiVendorSuggestion(null); // Clear suggestion when contact is found
        } else {
          setPendingContactId(contactIdToUse);
        }
      } else if (result.smart?.isNewVendor && (combined.vendorName || combined.vendorTaxId)) {
        // ไม่พบผู้ติดต่อ → แนะนำสร้างใหม่
        setAiVendorSuggestion({
          name: combined.vendorName || "",
          taxId: combined.vendorTaxId,
          branchNumber: extendedCombined.vendorBranchNumber ?? null,
          address: null,
          phone: null,
          email: extendedCombined.vendorEmail ?? null,
        });
      }

      // ไม่ auto-fill บัญชี - ให้ผู้ใช้เลือกเอง
      // แต่เก็บ suggestion พร้อม alternatives ไว้แสดงใน UI
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

      // แสดงคำเตือนจาก AI (ถ้ามี)
      if (result.warnings && Array.isArray(result.warnings)) {
        for (const warning of result.warnings) {
          if (warning.severity === "warning") {
            toast.warning(warning.message, {
              duration: 8000, // แสดงนานขึ้นให้อ่าน
            });
          } else {
            toast.info(warning.message, {
              duration: 5000,
            });
          }
        }
      }

      // Apply WHT (Withholding Tax) from AI
      const whtRate = (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
      const whtAmount = (suggested.whtAmount as number | null | undefined) ?? extendedCombined.whtAmount;
      const rawWhtType = (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;
      // Normalize AI's whtType to valid enum key (e.g., "ค่าธรรมเนียม" -> "SERVICE_3")
      const whtType = normalizeWhtType(rawWhtType);
      
      // Debug: Log WHT data from AI
      console.log("[AI WHT Debug]", {
        "suggested.whtRate": suggested.whtRate,
        "extendedCombined.whtRate": extendedCombined.whtRate,
        "extendedCombined.whtAmount": whtAmount,
        "whtRate (final)": whtRate,
        "rawWhtType": rawWhtType,
        "whtType (normalized)": whtType,
      });
      
      // Enable WHT if we have rate OR amount
      const hasWht = (whtRate !== null && whtRate !== undefined && whtRate > 0) || 
                     (whtAmount !== null && whtAmount !== undefined && whtAmount > 0);
      
      if (hasWht) {
        // Enable WHT toggle
        console.log("[AI WHT] Enabling WHT - rate:", whtRate, "amount:", whtAmount, "type:", whtType);
        setValue(config.fields.whtField.name, true);
        
        // Set rate (calculate from amount if not provided)
        if (whtRate && whtRate > 0) {
          setValue("whtRate", whtRate);
        } else if (whtAmount) {
          // Calculate rate from amount: rate = (whtAmount / baseAmount) * 100
          const aiAmount = extendedCombined.amount || (suggested.amount as number | null);
          if (aiAmount && aiAmount > 0) {
            const calculatedRate = Math.round((whtAmount / aiAmount) * 100);
            if ([1, 2, 3, 5].includes(calculatedRate)) {
              setValue("whtRate", calculatedRate);
              console.log("[AI WHT] Calculated rate from amount:", calculatedRate, "%");
            }
          }
        }
        
        if (whtType) {
          setValue("whtType", whtType);
        }
      }

      setAiApplied(true);
      
      // Build success message with document type info
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
    [setValue, config, contacts, setSelectedContact, setAiVendorSuggestion, setAccountSuggestion, setPendingContactId, setAiApplied]
  );

  return { applyAiResult };
}
