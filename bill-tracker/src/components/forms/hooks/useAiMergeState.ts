"use client";

import { useState, useCallback } from "react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { MultiDocAnalysisResult } from "@/lib/ai/types";
import type { ContactSummary } from "@/types";
import type { MergeData, MergeDecision } from "../shared/MergeOptionsDialog";
import { type ConflictField, type ConflictResolution, detectConflicts } from "../shared/ConflictDialog";
import type { AccountSuggestion, AiVendorSuggestion } from "./transaction-form-types";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";
import { extractAiData, applyAiResultToForm } from "./apply-ai-result";
import { toast } from "sonner";

interface Calculation {
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
  totalWithVat: number;
  netAmount: number;
}

interface UseAiMergeStateProps {
  watchAmount: number;
  watchVatRate: number;
  watchWhtRate: number;
  watchDate: unknown;
  watch: UseFormWatch<Record<string, unknown>>;
  calculation: Calculation;
  setValue: UseFormSetValue<Record<string, unknown>>;
  config: UnifiedTransactionConfig;
  contacts: ContactSummary[];
  selectedContact: ContactSummary | null;
  selectedAccount: string | null;
  accountSuggestion: AccountSuggestion | null;
  setSelectedContact: (contact: ContactSummary | null) => void;
  setSelectedAccount: (account: string | null) => void;
  setPendingContactId: (id: string | null) => void;
  setAiVendorSuggestion: (suggestion: AiVendorSuggestion | null) => void;
  setAccountSuggestion: (suggestion: AccountSuggestion | null) => void;
}

export function useAiMergeState({
  watchAmount, watchVatRate, watchWhtRate, watchDate, watch, calculation,
  setValue, config, contacts, selectedContact, selectedAccount, accountSuggestion,
  setSelectedContact, setSelectedAccount, setPendingContactId, setAiVendorSuggestion, setAccountSuggestion,
}: UseAiMergeStateProps) {
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictField[]>([]);
  const [pendingMergedData, setPendingMergedData] = useState<MergeData | null>(null);

  const hasExistingData = useCallback(() => {
    return (watchAmount !== null && watchAmount !== undefined && watchAmount !== 0) ||
      selectedContact !== null;
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
    watchAmount, calculation.vatAmount, calculation.whtAmount, watchVatRate, watchWhtRate,
    selectedContact, watchDate, watch, config, selectedAccount, accountSuggestion,
  ]);

  const applyAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      applyAiResultToForm(result, {
        setValue: setValue as (name: string, value: unknown) => void,
        config,
        contacts,
        setSelectedContact,
        setPendingContactId,
        setAiVendorSuggestion,
        setAccountSuggestion,
        setAiApplied,
      });
    },
    [setValue, config, contacts, setSelectedContact, setPendingContactId, setAiVendorSuggestion, setAccountSuggestion]
  );

  const handleAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      setAiResult(result);
      setAiApplied(false);
      if (hasExistingData()) {
        setPendingAiResult(result);
        setExistingFormData(extractFormData());
        setNewAiData(extractAiData(result, config));
        setShowMergeDialog(true);
      } else {
        applyAiResult(result);
      }
    },
    [hasExistingData, extractFormData, config, applyAiResult]
  );

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
    [setValue, config, contacts, setSelectedContact, setSelectedAccount]
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

  return {
    aiResult,
    aiApplied,
    handleAiResult,
    showMergeDialog,
    setShowMergeDialog,
    existingFormData,
    newAiData,
    handleMergeDecision,
    showConflictDialog,
    setShowConflictDialog,
    pendingConflicts,
    handleConflictResolution,
    hasExistingData,
  };
}
