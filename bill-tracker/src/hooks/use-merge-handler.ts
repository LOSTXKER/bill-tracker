/**
 * Hook for handling AI result merging and conflict resolution
 * Extracted from UnifiedTransactionForm to reduce component complexity
 */

import { useState, useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import type { ContactSummary } from "@/types";
import type { MergeData, MergeDecision } from "@/components/forms/shared/MergeOptionsDialog";
import type { ConflictField, ConflictResolution, detectConflicts } from "@/components/forms/shared/ConflictDialog";
import type { UnifiedTransactionConfig } from "@/components/forms/UnifiedTransactionForm";
import type { MultiDocAnalysisResult } from "@/components/forms/shared/InputMethodSection";

export interface UseMergeHandlerProps {
  config: UnifiedTransactionConfig;
  setValue: UseFormSetValue<any>;
  contacts: ContactSummary[];
  setSelectedContact: (contact: ContactSummary | null) => void;
  setSelectedAccount: (id: string | null) => void;
  setAiResult: (result: MultiDocAnalysisResult | null) => void;
  setAiApplied: (applied: boolean) => void;
}

export function useMergeHandler({
  config,
  setValue,
  contacts,
  setSelectedContact,
  setSelectedAccount,
  setAiResult,
  setAiApplied,
}: UseMergeHandlerProps) {
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictField[]>([]);
  const [pendingMergedData, setPendingMergedData] = useState<MergeData | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Apply merged data to form
  const applyMergedData = useCallback(
    (data: MergeData) => {
      if (data.amount !== null) {
        setValue("amount", data.amount);
      }
      if (data.vatRate !== null) {
        setValue("vatRate", data.vatRate);
      }
      if (data.date) {
        setValue(config.fields.dateField.name, new Date(data.date));
      }
      if (data.invoiceNumber) {
        setValue("invoiceNumber", data.invoiceNumber);
      }
      if (data.description && config.fields.descriptionField) {
        setValue(config.fields.descriptionField.name, data.description);
      }
      if (data.contactId) {
        const contact = contacts.find((c) => c.id === data.contactId);
        if (contact) {
          setSelectedContact(contact);
        }
      }
      if (data.accountId) {
        setSelectedAccount(data.accountId);
      }
    },
    [setValue, config, contacts, setSelectedContact, setSelectedAccount]
  );

  // Handle merge decision
  const handleMergeDecision = useCallback(
    (decision: MergeDecision, detectConflictsFn: typeof detectConflicts) => {
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
        const conflicts = detectConflictsFn(
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
    [existingFormData, newAiData, pendingAiResult, applyMergedData, setAiResult, setAiApplied]
  );

  // Handle conflict resolution
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
    [pendingMergedData, existingFormData, newAiData, pendingAiResult, applyMergedData, setAiResult, setAiApplied]
  );

  return {
    pendingAiResult,
    setPendingAiResult,
    existingFormData,
    setExistingFormData,
    newAiData,
    setNewAiData,
    pendingConflicts,
    setPendingConflicts,
    pendingMergedData,
    setPendingMergedData,
    showConflictDialog,
    setShowConflictDialog,
    handleMergeDecision,
    handleConflictResolution,
    applyMergedData,
  };
}
