"use client";

/**
 * Custom hook for transaction form logic
 * Extracted from UnifiedTransactionForm for better maintainability
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ContactSummary } from "@/types";
import type { MultiDocAnalysisResult } from "@/lib/ai/types";
import { MergeData, MergeDecision } from "../shared/MergeOptionsDialog";
import { ConflictField, ConflictResolution, detectConflicts } from "../shared/ConflictDialog";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";

// =============================================================================
// Types
// =============================================================================

export interface BaseTransaction {
  id: string;
  companyId: string;
  contact: { id: string; name: string; taxId: string | null } | null;
  account?: { id: string; code: string; name: string } | null;
  accountId?: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number | null;
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  paymentMethod: string;
  status: string;
  notes: string | null;
  invoiceNumber: string | null;
  referenceNo: string | null;
  company: { code: string; name: string };
  creator?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedByUser?: { name: string } | null;
  workflowStatus?: string;
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  hasInvoice?: boolean;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  // Approval workflow fields
  approvalStatus?: string;
  rejectedReason?: string | null;
  submittedAt?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  [key: string]: unknown;
}

export interface UseTransactionFormProps {
  companyCode: string;
  config: UnifiedTransactionConfig;
  mode: "create" | "view" | "edit";
  transactionId?: string;
  contacts: ContactSummary[];
  onModeChange?: (mode: "view" | "edit") => void;
}

export interface AccountSuggestion {
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
}

export interface AiVendorSuggestion {
  name: string;
  taxId?: string | null;
  branchNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useTransactionForm({
  companyCode,
  config,
  mode,
  transactionId,
  contacts,
  onModeChange,
}: UseTransactionFormProps) {
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(mode !== "create");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction state
  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // Calculation state
  const [calculation, setCalculation] = useState({
    baseAmount: 0,
    vatAmount: 0,
    whtAmount: 0,
    totalWithVat: 0,
    netAmount: 0,
  });

  // AI states
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Merge dialog states
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);

  // Conflict dialog states
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictField[]>([]);
  const [pendingMergedData, setPendingMergedData] = useState<MergeData | null>(null);

  // Contact states
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [oneTimeContactName, setOneTimeContactName] = useState("");
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [aiVendorSuggestion, setAiVendorSuggestion] = useState<AiVendorSuggestion | null>(null);

  // Account states
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [accountSuggestion, setAccountSuggestion] = useState<AccountSuggestion | null>(null);

  // Reference URLs
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    defaultValues: mode === "create" ? config.defaultValues : {},
  });

  const watchAmount = watch("amount") as number;
  const watchVatRate = watch("vatRate") as number;
  const watchIsWht = watch(config.fields.whtField.name) as boolean;
  const watchWhtRate = watch("whtRate") as number;
  const watchWhtType = watch("whtType") as string;
  const watchDate = watch(config.fields.dateField.name);

  // ==========================================================================
  // Fetch transaction for view/edit mode
  // ==========================================================================
  const fetchTransaction = useCallback(async () => {
    if (mode === "create" || !transactionId) return;

    try {
      setLoading(true);
      const res = await fetch(`${config.apiEndpoint}/${transactionId}`);
      if (!res.ok) throw new Error(`Failed to fetch ${config.type}`);
      const result = await res.json();
      const data = result.data?.[config.type] || result[config.type];
      setTransaction(data);

      // Populate form
      if (data) {
        reset({
          amount: data.amount,
          vatRate: data.vatRate,
          [config.fields.whtField.name]: data[config.fields.whtField.name],
          whtRate: data.whtRate,
          whtType: data.whtType,
          paymentMethod: data.paymentMethod,
          status: data.status,
          invoiceNumber: data.invoiceNumber,
          referenceNo: data.referenceNo,
          notes: data.notes,
          [config.fields.dateField.name]: data[config.fields.dateField.name]
            ? new Date(data[config.fields.dateField.name])
            : undefined,
          ...(config.fields.descriptionField
            ? { [config.fields.descriptionField.name]: data[config.fields.descriptionField.name] }
            : {}),
          ...(config.showDueDate
            ? { dueDate: data.dueDate ? new Date(data.dueDate) : undefined }
            : {}),
        });

        // Set contact
        if (data.contact) {
          setSelectedContact({
            id: data.contact.id,
            name: data.contact.name,
            taxId: data.contact.taxId,
          });
        }

        // Set account
        if (data.accountId) {
          setSelectedAccount(data.accountId);
        }

        // Set reference URLs
        if (data.referenceUrls && Array.isArray(data.referenceUrls)) {
          setReferenceUrls(data.referenceUrls);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [config, mode, transactionId, reset]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await fetchTransaction();
    setAuditRefreshKey((prev) => prev + 1);
  }, [fetchTransaction]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Apply pending contact when contacts are loaded
  useEffect(() => {
    if (pendingContactId && contacts.length > 0 && !selectedContact) {
      const contact = contacts.find((c) => c.id === pendingContactId);
      if (contact) {
        setSelectedContact(contact);
        setPendingContactId(null);
      }
    }
  }, [pendingContactId, contacts, selectedContact]);

  // Fetch on mount
  useEffect(() => {
    if (mode !== "create") {
      fetchTransaction();
    }
  }, [fetchTransaction, mode]);

  // Recalculate totals
  useEffect(() => {
    const calc = config.calculateTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWht ? watchWhtRate || 0 : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWht, watchWhtRate, config]);

  // ==========================================================================
  // Form data extraction
  // ==========================================================================

  const hasExistingData = useCallback(() => {
    const hasAmount = watchAmount !== null && watchAmount !== undefined && watchAmount !== 0;
    const hasContact = selectedContact !== null;
    return hasAmount || hasContact;
  }, [watchAmount, selectedContact]);

  const extractFormData = useCallback((): MergeData => {
    return {
      amount: watchAmount ? Number(watchAmount) : null,
      vatAmount: calculation.vatAmount || null,
      vatRate: watchVatRate || null,
      whtAmount: calculation.whtAmount || null,
      whtRate: watchWhtRate || null,
      vendorName: selectedContact?.name || null,
      vendorTaxId: selectedContact?.taxId || null,
      contactId: selectedContact?.id || null,
      date: watchDate ? new Date(watchDate as string).toISOString() : null,
      invoiceNumber: (watch("invoiceNumber") as string) || null,
      description: config.fields.descriptionField
        ? (watch(config.fields.descriptionField.name) as string) || null
        : null,
      accountId: selectedAccount || null,
      accountName: accountSuggestion?.accountName || null,
    };
  }, [
    watchAmount,
    calculation.vatAmount,
    calculation.whtAmount,
    watchVatRate,
    watchWhtRate,
    selectedContact,
    watchDate,
    watch,
    config,
    selectedAccount,
    accountSuggestion,
  ]);

  const extractAiData = useCallback(
    (result: MultiDocAnalysisResult): MergeData => {
      if (!result) {
        return {
          amount: null,
          vatAmount: null,
          vatRate: null,
          whtAmount: null,
          whtRate: null,
          vendorName: null,
          vendorTaxId: null,
          contactId: null,
          date: null,
          invoiceNumber: null,
          description: null,
          accountId: null,
          accountName: null,
        };
      }

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
      const vendorName = (combined.vendorName || suggested.vendorName) as string | null;

      const extendedCombined = combined as typeof combined & {
        vatRate?: number | null;
        amount?: number | null;
      };

      let description = (suggested.description as string) || null;
      if (!description && vendorName && config.fields.descriptionField) {
        const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
        description = `${prefix} ${vendorName}`;
      }

      let amount: number | null = null;
      if (extendedCombined.amount) {
        amount = extendedCombined.amount;
      } else if (combined.totalAmount && extendedCombined.vatRate) {
        amount =
          Math.round((combined.totalAmount / (1 + extendedCombined.vatRate / 100)) * 100) / 100;
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
    },
    [config]
  );

  // ==========================================================================
  // AI Result Handling
  // ==========================================================================

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
      // Apply invoice number
      const invoiceNum =
        combined.invoiceNumbers && combined.invoiceNumbers.length > 0
          ? combined.invoiceNumbers.join(", ")
          : null;
      if (invoiceNum) {
        setValue("invoiceNumber", invoiceNum);
      }

      // Apply description
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
                } else if (
                  typeof item === "object" &&
                  item?.description &&
                  item.description.trim()
                ) {
                  allItems.push(item.description.trim());
                }
              }
            }
          }
          if (allItems.length > 0) {
            const itemsText = allItems.slice(0, 5).join(", ");
            description =
              allItems.length > 5
                ? `${itemsText} และอื่นๆ (${allItems.length} รายการ)`
                : itemsText;
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

      // Apply contact
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

      // Set account suggestion (don't auto-fill)
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

      // Show warnings
      if (result.warnings && Array.isArray(result.warnings)) {
        for (const warning of result.warnings) {
          if (warning.severity === "warning") {
            toast.warning(warning.message, { duration: 8000 });
          } else {
            toast.info(warning.message, { duration: 5000 });
          }
        }
      }

      // Apply WHT
      const whtRate =
        (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
      const whtAmount = extendedCombined.whtAmount;
      const whtType =
        (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;

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

      // Success toast
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
    },
    [setValue, config, contacts]
  );

  const handleAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      setAiResult(result);
      setAiApplied(false);

      if (hasExistingData()) {
        setPendingAiResult(result);
        setExistingFormData(extractFormData());
        setNewAiData(extractAiData(result));
        setShowMergeDialog(true);
      } else {
        applyAiResult(result);
      }
    },
    [hasExistingData, extractFormData, extractAiData, applyAiResult]
  );

  // ==========================================================================
  // Merge/Conflict Handlers
  // ==========================================================================

  const applyMergedData = useCallback(
    (data: MergeData) => {
      if (data.amount !== null) setValue("amount", data.amount);
      if (data.vatRate !== null) setValue("vatRate", data.vatRate);
      if (data.date) setValue(config.fields.dateField.name, new Date(data.date));
      if (data.invoiceNumber) setValue("invoiceNumber", data.invoiceNumber);
      if (data.description && config.fields.descriptionField) {
        setValue(config.fields.descriptionField.name, data.description);
      }
      if (data.contactId) {
        const contact = contacts.find((c) => c.id === data.contactId);
        if (contact) setSelectedContact(contact);
      }
      if (data.accountId) setSelectedAccount(data.accountId);
    },
    [setValue, config, contacts]
  );

  const handleMergeDecision = useCallback(
    (decision: MergeDecision) => {
      if (decision.action === "cancel") {
        setPendingAiResult(null);
        toast.info("เก็บไฟล์ไว้ แต่ไม่เปลี่ยนข้อมูลในฟอร์ม");
        return;
      }

      if (decision.action === "replace" && decision.mergedData) {
        applyMergedData(decision.mergedData);
        if (pendingAiResult) {
          setAiResult(pendingAiResult);
          setAiApplied(true);
        }
        setPendingAiResult(null);
        toast.success("แทนที่ข้อมูลด้วยข้อมูลจาก AI แล้ว");
        return;
      }

      if (decision.action === "merge" && decision.mergedData) {
        const conflicts = detectConflicts(
          existingFormData as unknown as Record<string, unknown>,
          newAiData as unknown as Record<string, unknown>
        );

        if (conflicts.length > 0) {
          setPendingConflicts(conflicts);
          setPendingMergedData(decision.mergedData);
          setShowConflictDialog(true);
        } else {
          applyMergedData(decision.mergedData);
          if (pendingAiResult) {
            setAiResult(pendingAiResult);
            setAiApplied(true);
          }
          setPendingAiResult(null);
          toast.success("รวมยอดเงินแล้ว");
        }
      }
    },
    [existingFormData, newAiData, pendingAiResult, applyMergedData]
  );

  const handleConflictResolution = useCallback(
    (resolution: ConflictResolution) => {
      if (!pendingMergedData || !existingFormData || !newAiData) return;

      const finalData: MergeData = { ...pendingMergedData };

      for (const [field, choice] of Object.entries(resolution)) {
        const sourceData = choice === "existing" ? existingFormData : newAiData;
        (finalData as unknown as Record<string, unknown>)[field] = (
          sourceData as unknown as Record<string, unknown>
        )[field];
      }

      applyMergedData(finalData);
      if (pendingAiResult) {
        setAiResult(pendingAiResult);
        setAiApplied(true);
      }
      setPendingAiResult(null);
      setPendingConflicts([]);
      setPendingMergedData(null);
      toast.success("รวมข้อมูลสำเร็จ");
    },
    [pendingMergedData, existingFormData, newAiData, pendingAiResult, applyMergedData]
  );

  // ==========================================================================
  // WHT Change Rules
  // ==========================================================================

  const WHT_LOCKED_STATUSES = ["SENT_TO_ACCOUNTANT", "COMPLETED"];
  const WHT_CONFIRM_STATUSES = ["WHT_ISSUED", "WHT_CERT_RECEIVED", "READY_FOR_ACCOUNTING"];

  const whtChangeInfo = useMemo(() => {
    if (!transaction || mode !== "edit") return undefined;

    const currentStatus = transaction.workflowStatus || "";
    const hasWhtCert = transaction.hasWhtCert || false;
    const currentWht = config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted;

    if (WHT_LOCKED_STATUSES.includes(currentStatus)) {
      return {
        isLocked: true,
        requiresConfirmation: false,
        message: "ไม่สามารถเปลี่ยนได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
      };
    }

    if (WHT_CONFIRM_STATUSES.includes(currentStatus) || hasWhtCert) {
      return {
        isLocked: false,
        requiresConfirmation: true,
        message: currentWht
          ? "คุณกำลังจะยกเลิกหัก ณ ที่จ่าย สถานะจะถูกย้อนกลับและอาจต้อง void เอกสาร 50 ทวิ"
          : "คุณกำลังจะเพิ่มหัก ณ ที่จ่าย ต้องออกหนังสือรับรอง (50 ทวิ) ก่อนส่งบัญชี",
      };
    }

    return undefined;
  }, [transaction, mode, config.type]);

  const handleWhtToggle = useCallback(
    (enabled: boolean, confirmed?: boolean, reason?: string) => {
      setValue(config.fields.whtField.name, enabled);

      if (!enabled) {
        setValue("whtRate", undefined);
        setValue("whtType", undefined);
      }

      if (confirmed) {
        setValue("_whtChangeConfirmed" as any, true);
        if (reason) {
          setValue("_whtChangeReason" as any, reason);
        }
      }
    },
    [setValue, config.fields.whtField.name]
  );

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Form
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    errors,

    // Watch values
    watchAmount,
    watchVatRate,
    watchIsWht,
    watchWhtRate,
    watchWhtType,
    watchDate,

    // Loading states
    isLoading,
    setIsLoading,
    loading,
    saving,
    setSaving,
    error,

    // Transaction
    transaction,
    setTransaction,
    fetchTransaction,
    refreshAll,
    auditRefreshKey,
    setAuditRefreshKey,

    // Calculation
    calculation,

    // AI
    aiResult,
    aiApplied,
    handleAiResult,

    // Merge dialog
    showMergeDialog,
    setShowMergeDialog,
    existingFormData,
    newAiData,
    handleMergeDecision,

    // Conflict dialog
    showConflictDialog,
    setShowConflictDialog,
    pendingConflicts,
    handleConflictResolution,

    // Contact
    selectedContact,
    setSelectedContact,
    oneTimeContactName,
    setOneTimeContactName,
    aiVendorSuggestion,
    setAiVendorSuggestion,

    // Account
    selectedAccount,
    setSelectedAccount,
    accountSuggestion,

    // Reference URLs
    referenceUrls,
    setReferenceUrls,

    // Delete
    showDeleteConfirm,
    setShowDeleteConfirm,

    // WHT
    whtChangeInfo,
    handleWhtToggle,

    // Helpers
    hasExistingData,
  };
}
