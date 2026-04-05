import { toast } from "sonner";
import type { MultiDocAnalysisResult } from "@/lib/ai/types";
import type { ContactSummary } from "@/types";
import type { MergeData } from "../shared/MergeOptionsDialog";
import type { AccountSuggestion, AiVendorSuggestion } from "./transaction-form-types";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";

export interface ApplyAiResultParams {
  setValue: (name: string, value: unknown) => void;
  config: UnifiedTransactionConfig;
  contacts: ContactSummary[];
  setSelectedContact: (contact: ContactSummary | null) => void;
  setPendingContactId: (id: string | null) => void;
  setAiVendorSuggestion: (suggestion: AiVendorSuggestion | null) => void;
  setAccountSuggestion: (suggestion: AccountSuggestion | null) => void;
  setAiApplied: (applied: boolean) => void;
}

export function extractAiData(
  result: MultiDocAnalysisResult,
  config: UnifiedTransactionConfig
): MergeData {
  if (!result) {
    return {
      amount: null, vatAmount: null, vatRate: null, whtAmount: null, whtRate: null,
      vendorName: null, vendorTaxId: null, contactId: null, date: null,
      invoiceNumber: null, description: null, accountId: null, accountName: null,
    };
  }

  const combined = result.combined || {
    totalAmount: 0, vatAmount: 0, date: null, invoiceNumbers: [], vendorName: null, vendorTaxId: null,
  };
  const suggested = ((result.smart?.suggested || {}) as Record<string, unknown>);
  const vendorName = (combined.vendorName || suggested.vendorName) as string | null;
  const extendedCombined = combined as typeof combined & { vatRate?: number | null; amount?: number | null };

  let description = (suggested.description as string) || null;
  if (!description && vendorName && config.fields.descriptionField) {
    const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
    description = `${prefix} ${vendorName}`;
  }

  let amount: number | null = null;
  if (extendedCombined.amount) {
    amount = extendedCombined.amount;
  } else if (combined.totalAmount && extendedCombined.vatRate) {
    amount = Math.round((combined.totalAmount / (1 + extendedCombined.vatRate / 100)) * 100) / 100;
  } else if (combined.totalAmount) {
    amount = combined.totalAmount;
  } else if (suggested.amount) {
    amount = suggested.amount as number;
  }

  return {
    amount,
    vatAmount: combined.vatAmount || (suggested.vatAmount as number) || null,
    vatRate: (suggested.vatRate as number) ?? extendedCombined.vatRate ?? null,
    whtAmount: (suggested.whtAmount as number) || null,
    whtRate: (suggested.whtRate as number) || null,
    vendorName,
    vendorTaxId: combined.vendorTaxId || (suggested.vendorTaxId as string) || null,
    contactId: (suggested.contactId as string) || null,
    date: combined.date || (suggested.date as string) || null,
    invoiceNumber: combined.invoiceNumbers?.[0] || null,
    description,
    accountId: (suggested.accountId as string) || null,
    accountName: (suggested.accountName as string) || null,
  };
}

export function applyAiResultToForm(
  result: MultiDocAnalysisResult,
  params: ApplyAiResultParams
): void {
  if (!result) return;

  const {
    setValue, config, contacts,
    setSelectedContact, setPendingContactId, setAiVendorSuggestion, setAccountSuggestion, setAiApplied,
  } = params;

  const combined = result.combined || {
    totalAmount: 0, vatAmount: 0, date: null, invoiceNumbers: [], vendorName: null, vendorTaxId: null,
  };
  const suggested = ((result.smart?.suggested || {}) as Record<string, unknown>);
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
  };

  const hasCurrencyConversion =
    result.currencyConversion?.convertedAmount !== null &&
    result.currencyConversion?.convertedAmount !== undefined &&
    result.currencyConversion?.currency !== "THB";

  if (hasCurrencyConversion && result.currencyConversion?.convertedAmount) {
    let convertedBase = result.currencyConversion.convertedAmount;
    if (
      !extendedCombined.amount &&
      combined.totalAmount &&
      extendedCombined.vatRate &&
      extendedCombined.vatRate > 0
    ) {
      convertedBase = Math.round(convertedBase / (1 + extendedCombined.vatRate / 100) * 100) / 100;
    }
    setValue("amount", convertedBase);
  } else if (extendedCombined.amount) {
    setValue("amount", extendedCombined.amount);
  } else if (combined.totalAmount && extendedCombined.vatRate) {
    setValue("amount", Math.round((combined.totalAmount / (1 + extendedCombined.vatRate / 100)) * 100) / 100);
  } else if (combined.totalAmount) {
    setValue("amount", combined.totalAmount);
  } else if (suggested.amount !== null && suggested.amount !== undefined) {
    setValue("amount", suggested.amount);
  }

  const aiVatRate = suggested.vatRate ?? extendedCombined.vatRate;
  if (hasCurrencyConversion) {
    const explicitAiVatRate = aiVatRate !== null && aiVatRate !== undefined && typeof aiVatRate === "number";
    setValue("vatRate", explicitAiVatRate ? aiVatRate : 0);
    if (config.type === "expense" && (!explicitAiVatRate || aiVatRate === 0)) {
      setValue("documentType", "CASH_RECEIPT");
    }
  } else if (aiVatRate !== null && aiVatRate !== undefined) {
    setValue("vatRate", aiVatRate);
  }

  if (combined.date || suggested.date) {
    const dateStr = combined.date || (suggested.date as string);
    if (dateStr) setValue(config.fields.dateField.name, new Date(dateStr));
  }

  const invoiceNum =
    combined.invoiceNumbers && combined.invoiceNumbers.length > 0
      ? combined.invoiceNumbers.join(", ")
      : null;
  if (invoiceNum) setValue("invoiceNumber", invoiceNum);

  if (config.fields.descriptionField) {
    let description: string | null = null;

    if (extendedCombined.description && typeof extendedCombined.description === "string") {
      description = extendedCombined.description;
    }
    if (!description) {
      const allItems: string[] = [];
      for (const file of result.files || []) {
        const extracted = file.extracted as { items?: Array<{ description: string } | string> };
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
        description = allItems.length > 5 ? `${itemsText} และอื่นๆ (${allItems.length} รายการ)` : itemsText;
      }
    }
    if (!description && suggested.description) description = suggested.description as string;
    if (!description && combined.vendorName) {
      const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
      description = `${prefix} ${combined.vendorName}`;
    }
    if (description) setValue(config.fields.descriptionField.name, description);
  }

  const contactIdToUse = (suggested.contactId as string) || result.smart?.foundContact?.id;
  if (contactIdToUse) {
    const contact = contacts.find((c) => c.id === contactIdToUse);
    if (contact) {
      setSelectedContact(contact);
      setAiVendorSuggestion(null);
    } else {
      setPendingContactId(contactIdToUse);
    }
  } else if (result.smart?.isNewVendor && (combined.vendorName || combined.vendorTaxId)) {
    setAiVendorSuggestion({
      name: combined.vendorName || "",
      taxId: combined.vendorTaxId,
      branchNumber: extendedCombined.vendorBranchNumber ?? null,
      address: null,
      phone: null,
      email: extendedCombined.vendorEmail ?? null,
    });
  }

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

  if (result.warnings && Array.isArray(result.warnings)) {
    for (const warning of result.warnings) {
      if (warning.severity === "warning") {
        toast.warning(warning.message, { duration: 8000 });
      } else {
        toast.info(warning.message, { duration: 5000 });
      }
    }
  }

  const whtRate = (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
  const whtAmount = extendedCombined.whtAmount;
  const whtType = (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;
  const hasWht =
    (whtRate !== null && whtRate !== undefined && whtRate > 0) ||
    (whtAmount !== null && whtAmount !== undefined && whtAmount > 0);

  if (hasWht) {
    setValue(config.fields.whtField.name, true);
    if (whtRate && whtRate > 0) {
      setValue("whtRate", whtRate);
    } else if (whtAmount) {
      const aiAmount = extendedCombined.amount || (suggested.amount as number | null);
      if (aiAmount && aiAmount > 0) {
        const calculatedRate = Math.round((whtAmount / aiAmount) * 100);
        if ([1, 2, 3, 5].includes(calculatedRate)) setValue("whtRate", calculatedRate);
      }
    }
    if (whtType) setValue("whtType", whtType);
  }

  setAiApplied(true);

  const documentType =
    (suggested.documentType as string | null | undefined) || extendedCombined.documentType;
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
}
