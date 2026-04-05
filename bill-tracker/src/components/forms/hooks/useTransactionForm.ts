"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { ContactSummary } from "@/types";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";
import type { BaseTransaction } from "./transaction-form-types";
import { useWhtChangeState } from "./useWhtChangeState";
import { useContactAccountState } from "./useContactAccountState";
import { useAiMergeState } from "./useAiMergeState";
import { useAutoRecalculation } from "@/hooks/use-transaction-calculation";

export type { BaseTransaction, AccountSuggestion, AiVendorSuggestion } from "./transaction-form-types";

export interface UseTransactionFormProps {
  companyCode: string;
  config: UnifiedTransactionConfig;
  mode: "create" | "view" | "edit";
  transactionId?: string;
  contacts: ContactSummary[];
  onModeChange?: (mode: "view" | "edit") => void;
}

export function useTransactionForm({
  companyCode: _companyCode,
  config,
  mode,
  transactionId,
  contacts,
}: UseTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(mode !== "create");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register, handleSubmit, watch, setValue, reset,
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

  const calculation = useAutoRecalculation(config.calculateTotals, {
    amount: watchAmount,
    vatRate: watchVatRate,
    whtRate: watchWhtRate,
    isWhtEnabled: watchIsWht,
  });

  const contactAccount = useContactAccountState({ contacts });
  const {
    setSelectedContact,
    setSelectedAccount,
    setPendingContactId,
    setAiVendorSuggestion,
    setAccountSuggestion,
  } = contactAccount;

  const aiMerge = useAiMergeState({
    watchAmount, watchVatRate, watchWhtRate, watchDate, watch, calculation,
    setValue, config, contacts,
    selectedContact: contactAccount.selectedContact,
    selectedAccount: contactAccount.selectedAccount,
    accountSuggestion: contactAccount.accountSuggestion,
    setSelectedContact,
    setSelectedAccount,
    setPendingContactId,
    setAiVendorSuggestion,
    setAccountSuggestion,
  });

  const whtChange = useWhtChangeState({ transaction, mode, config, setValue });

  const fetchTransaction = useCallback(async () => {
    if (mode === "create" || !transactionId) return;
    try {
      setLoading(true);
      const res = await fetch(`${config.apiEndpoint}/${transactionId}`);
      if (!res.ok) throw new Error(`Failed to fetch ${config.type}`);
      const result = await res.json();
      const data = result.data?.[config.type] || result[config.type];
      setTransaction(data);

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
        if (data.contact) {
          setSelectedContact({
            id: data.contact.id,
            name: data.contact.name,
            taxId: data.contact.taxId,
          });
        }
        if (data.accountId) setSelectedAccount(data.accountId);
        if (data.referenceUrls && Array.isArray(data.referenceUrls)) {
          setReferenceUrls(data.referenceUrls);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [config, mode, transactionId, reset, setSelectedContact, setSelectedAccount]);

  const refreshAll = useCallback(async () => {
    await fetchTransaction();
    setAuditRefreshKey((prev) => prev + 1);
  }, [fetchTransaction]);

  useEffect(() => {
    if (mode !== "create") fetchTransaction();
  }, [fetchTransaction, mode]);


  return {
    register, handleSubmit, watch, setValue, reset, errors,
    watchAmount, watchVatRate, watchIsWht, watchWhtRate, watchWhtType, watchDate,
    isLoading, setIsLoading, loading, saving, setSaving, error,
    transaction, setTransaction, fetchTransaction, refreshAll, auditRefreshKey, setAuditRefreshKey,
    calculation,
    aiResult: aiMerge.aiResult,
    aiApplied: aiMerge.aiApplied,
    handleAiResult: aiMerge.handleAiResult,
    showMergeDialog: aiMerge.showMergeDialog,
    setShowMergeDialog: aiMerge.setShowMergeDialog,
    existingFormData: aiMerge.existingFormData,
    newAiData: aiMerge.newAiData,
    handleMergeDecision: aiMerge.handleMergeDecision,
    showConflictDialog: aiMerge.showConflictDialog,
    setShowConflictDialog: aiMerge.setShowConflictDialog,
    pendingConflicts: aiMerge.pendingConflicts,
    handleConflictResolution: aiMerge.handleConflictResolution,
    selectedContact: contactAccount.selectedContact,
    setSelectedContact,
    oneTimeContactName: contactAccount.oneTimeContactName,
    setOneTimeContactName: contactAccount.setOneTimeContactName,
    aiVendorSuggestion: contactAccount.aiVendorSuggestion,
    setAiVendorSuggestion,
    selectedAccount: contactAccount.selectedAccount,
    setSelectedAccount,
    accountSuggestion: contactAccount.accountSuggestion,
    referenceUrls, setReferenceUrls,
    showDeleteConfirm, setShowDeleteConfirm,
    whtChangeInfo: whtChange.whtChangeInfo,
    handleWhtToggle: whtChange.handleWhtToggle,
    hasExistingData: aiMerge.hasExistingData,
  };
}
