"use client";

import { useState, useEffect, useCallback, ReactNode, useRef, useMemo, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  LucideIcon,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Hooks
import { useContacts } from "@/hooks/use-contacts";
import { useContactDefaults } from "@/hooks/use-contact-defaults";
import { useTransactionFileUpload } from "@/hooks/use-transaction-file-upload";
import { useTransactionActions } from "@/hooks/use-transaction-actions";
import { useTransaction } from "@/hooks/use-transaction";
import { useSafeCompany } from "@/hooks/use-company";
import { useAiResultProcessor } from "@/hooks/use-ai-result-processor";
import { useTransactionSubmission } from "@/hooks/use-transaction-submission";
import { useMergeHandler } from "@/hooks/use-merge-handler";
import { useAutoRecalculation } from "@/hooks/use-transaction-calculation";

// Shared form components
import { CategorizedFiles, MultiDocAnalysisResult, normalizeOtherDocs } from "./shared/InputMethodSection";
import { MergeData, MergeDecision } from "./shared/MergeOptionsDialog";
import { detectConflicts } from "./shared/ConflictDialog";
import { TransactionDialogs } from "./shared/TransactionDialogs";
import { TransactionFormProvider } from "./TransactionFormContext";
import { PayerInfo } from "./shared/PayerSection";
import { TransactionViewToolbar } from "./shared/TransactionViewToolbar";
import { CreateModeContent } from "./CreateModeContent";
import type { CurrencyConversionValue } from "./CreateModeContent";
import { ViewEditModeContent } from "./ViewEditModeContent";

// Transaction components
import { TransactionDetailSkeleton } from "@/components/transactions";

// Types & Constants
import type { ContactSummary } from "@/types";
import { StatusInfo, WHT_LOCKED_STATUSES, WHT_CONFIRM_STATUSES_ALL } from "@/lib/constants/transaction";

// Permissions
import { usePermissions } from "@/components/providers/permission-provider";

// Import and re-export BaseTransaction type from hooks
import type { BaseTransaction } from "./hooks/useTransactionForm";
export type { BaseTransaction };
import { useDocumentTypeEffects } from "./hooks/useDocumentTypeEffects";
import { useFormContextFactory } from "./hooks/useFormContextFactory";
import { useTransactionFormState } from "./hooks/useTransactionFormState";
import type { ContactFormState } from "./hooks/useTransactionFormState";

// =============================================================================
// Types
// =============================================================================

export interface UnifiedTransactionConfig {
  type: "expense" | "income";
  title: string;
  icon: LucideIcon;
  iconColor: string;
  buttonColor: string;
  apiEndpoint: string;
  redirectPath: string;
  listUrl: string;
  entityType: "Expense" | "Income";

  // Status configuration
  statusFlow: readonly string[];
  statusInfo: Record<string, StatusInfo>;
  completedStatus: string;
  defaultStatus: string;

  // Field configurations
  fields: {
    dateField: {
      name: string;
      label: string;
    };
    descriptionField?: {
      name: string;
      label: string;
      placeholder: string;
    };
    whtField: {
      name: string;
      label?: string;
      description?: string;
    };
    netAmountField: string;
    netAmountLabel: string;
  };

  // Default values (for create mode)
  defaultValues: Record<string, unknown>;

  // Status options (for create mode)
  statusOptions: Array<{
    value: string;
    label: string;
    color: string;
    condition?: (formData: Record<string, unknown>) => boolean;
  }>;

  // Calculation function
  calculateTotals: (
    amount: number,
    vatRate: number,
    whtRate: number
  ) => {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  };

  // Document upload configuration
  documentConfig: {
    type: "expense" | "income";
    fields: {
      slip: string;
      invoice: string;
      whtCert: string;
    };
  };

  // File field labels for detail view
  fileFields: {
    slip: { urlsField: string; label: string };
    invoice: { urlsField: string; label: string };
    wht: { urlsField: string; label: string };
  };

  // Additional fields renderer (e.g., due date for expenses)
  renderAdditionalFields?: (props: {
    register: ReturnType<typeof useForm>["register"];
    watch: ReturnType<typeof useForm>["watch"];
    setValue: ReturnType<typeof useForm>["setValue"];
    mode: "create" | "view" | "edit";
  }) => ReactNode;

  // Optional fields
  showDueDate?: boolean;
}

interface UnifiedTransactionFormProps {
  companyCode: string;
  config: UnifiedTransactionConfig;
  mode: "create" | "view" | "edit";
  transactionId?: string;
  onModeChange?: (mode: "view" | "edit") => void;
  currentUserId?: string;
}

function AccountWarningDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            ยังไม่ได้ระบุบัญชี
          </AlertDialogTitle>
          <AlertDialogDescription>
            การระบุบัญชีช่วยให้จำแนกค่าใช้จ่ายและวิเคราะห์ทางการเงินได้ดีขึ้น
            ต้องการบันทึกโดยไม่ระบุบัญชีหรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>กลับไปเลือกบัญชี</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>บันทึกโดยไม่ระบุ</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UnifiedTransactionForm({
  companyCode,
  config,
  mode,
  transactionId,
  onModeChange,
  currentUserId,
}: UnifiedTransactionFormProps) {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------
  const { hasPermission, isOwner } = usePermissions();
  const canCreateDirect = config.type === "expense"
    ? hasPermission("expenses:create-direct")
    : hasPermission("incomes:create-direct");
  const canMarkPaid = config.type === "expense"
    ? hasPermission("expenses:mark-paid")
    : hasPermission("incomes:mark-received");

  // ---------------------------------------------------------------------------
  // SWR transaction fetch (view/edit mode)
  // ---------------------------------------------------------------------------
  const {
    transaction: swrTransaction,
    isLoading: swrLoading,
    error: swrError,
    mutate: mutateTransaction,
  } = useTransaction({
    type: config.type,
    transactionId,
    enabled: mode !== "create",
  });

  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const loading = mode !== "create" && swrLoading && !transaction;
  const error = swrError?.message || null;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // ---------------------------------------------------------------------------
  // Contacts (list)
  // ---------------------------------------------------------------------------
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);

  // ---------------------------------------------------------------------------
  // Grouped state: contact + delivery + AI
  // (replaces ~20 individual useState + 3 cascading contact effects)
  // ---------------------------------------------------------------------------
  const {
    contactState,
    setContactState,
    patchContactState,
    aiState,
    setAiState,
    patchAiState,
  } = useTransactionFormState({
    configType: config.type,
    mode,
    contacts,
  });

  // Convenience wrappers that support SetStateAction (function updaters)
  // so child components keep the same Dispatch<SetStateAction<T>> interface.
  const setCurrencyConversion = useCallback(
    (v: SetStateAction<CurrencyConversionValue | null>) => {
      setAiState(prev => ({
        ...prev,
        currencyConversion: typeof v === "function" ? v(prev.currencyConversion) : v,
      }));
    },
    [setAiState],
  );

  const setAiResult = useCallback(
    (v: SetStateAction<MultiDocAnalysisResult | null>) => {
      setAiState(prev => ({
        ...prev,
        aiResult: typeof v === "function" ? v(prev.aiResult) : v,
      }));
    },
    [setAiState],
  );

  const setAccountSuggestion = useCallback(
    (v: SetStateAction<{
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
    } | null>) => {
      setAiState(prev => ({
        ...prev,
        accountSuggestion: typeof v === "function" ? v(prev.accountSuggestion) : v,
      }));
    },
    [setAiState],
  );

  const setDefaultsSuggestionDismissed = useCallback(
    (v: SetStateAction<boolean>) => {
      setContactState(prev => ({
        ...prev,
        defaultsSuggestionDismissed: typeof v === "function" ? v(prev.defaultsSuggestionDismissed) : v,
      }));
    },
    [setContactState],
  );

  // ---------------------------------------------------------------------------
  // Document files
  // ---------------------------------------------------------------------------
  const [categorizedFiles, setCategorizedFiles] = useState<CategorizedFiles>({
    invoice: [],
    slip: [],
    whtCert: [],
    other: [],
    uncategorized: [],
  });

  // ---------------------------------------------------------------------------
  // Merge dialog
  // ---------------------------------------------------------------------------
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // ---------------------------------------------------------------------------
  // Payers (expense only)
  // ---------------------------------------------------------------------------
  const [payers, setPayers] = useState<PayerInfo[]>([]);
  const [payersInitialized, setPayersInitialized] = useState(false);

  // Internal company tracking (expense only)
  const { companies: contextCompanies } = useSafeCompany();
  const [fetchedCompanies, setFetchedCompanies] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [internalCompanyId, setInternalCompanyId] = useState<string | null>(null);

  const accessibleCompanies = contextCompanies.length > 0
    ? contextCompanies
    : fetchedCompanies;

  useEffect(() => {
    if (config.type === "expense" && contextCompanies.length === 0) {
      fetch("/api/companies")
        .then((res) => res.json())
        .then((result) => {
          const companies = result.data?.companies || [];
          setFetchedCompanies(companies.map((c: { id: string; name: string; code: string }) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          })));
        })
        .catch(() => {});
    }
  }, [config.type, contextCompanies.length]);

  // Initialize payers from reimbursement data (prefill)
  useEffect(() => {
    if (mode === "create" && config.type === "expense" && !payersInitialized) {
      const requesterInfo = config.defaultValues.requesterInfo as {
        id?: string;
        name?: string;
      } | undefined;

      const settlementInfo = config.defaultValues.settlementInfo as {
        settledAt?: string;
        settlementRef?: string;
      } | undefined;

      if (requesterInfo?.id || requesterInfo?.name) {
        setPayers([{
          paidByType: "USER",
          paidByUserId: requesterInfo.id || null,
          paidByName: requesterInfo.name || null,
          amount: Number(config.defaultValues.amount) || 0,
          ...(settlementInfo?.settledAt ? {
            settlementStatus: "SETTLED" as const,
            settledAt: settlementInfo.settledAt,
            settlementRef: settlementInfo.settlementRef || null,
          } : {}),
        }]);
      }
      setPayersInitialized(true);
    }
  }, [mode, config.type, config.defaultValues, payersInitialized]);

  // ---------------------------------------------------------------------------
  // Account
  // ---------------------------------------------------------------------------
  const [selectedAccount, setSelectedAccountRaw] = useState<string | null>(null);
  const [skipAccountWarning, setSkipAccountWarning] = useState(false);
  const [showAccountWarning, setShowAccountWarning] = useState(false);
  const setSelectedAccount = useCallback((id: string | null) => {
    setSelectedAccountRaw(id);
    if (id) setSkipAccountWarning(false);
  }, []);

  // Category
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Reference URLs
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // Contact defaults (SWR-based)
  // ---------------------------------------------------------------------------
  const { defaults: contactDefaults, hasDefaults: hasContactDefaults } = useContactDefaults(
    companyCode,
    contactState.selectedContact?.id || null
  );

  // ---------------------------------------------------------------------------
  // Auto-suggest account from contact history (create mode only)
  // ---------------------------------------------------------------------------
  const contactSuggestFetched = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "create") return;
    const contactId = contactState.selectedContact?.id;
    if (!contactId || selectedAccount || contactSuggestFetched.current === contactId) return;
    contactSuggestFetched.current = contactId;

    fetch(`/api/${companyCode.toLowerCase()}/contacts/${contactId}/suggested-account`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (!json?.success || !json.data?.accountId) return;
        const { accountId, account, alternatives } = json.data;
        patchAiState({
          accountSuggestion: {
            accountId,
            accountCode: account?.code || null,
            accountName: account?.name || null,
            confidence: 70,
            reason: "แนะนำจากประวัติผู้ติดต่อ",
            alternatives: (alternatives || []).map((a: { accountId: string; account: { code: string; name: string } | null; count: number }) => ({
              accountId: a.accountId,
              accountCode: a.account?.code || "",
              accountName: a.account?.name || "",
              confidence: 50,
              reason: "ใช้บ่อย",
            })),
          },
        });
        setSelectedAccount(accountId);
      })
      .catch(() => {});
  }, [mode, contactState.selectedContact?.id, selectedAccount, companyCode, patchAiState, setSelectedAccount]);

  // ---------------------------------------------------------------------------
  // React-Hook-Form
  // ---------------------------------------------------------------------------
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
  const watchDocumentType = watch("documentType") as string | undefined;

  // ---------------------------------------------------------------------------
  // Calculation (auto-recalculates when watched form values change)
  // ---------------------------------------------------------------------------
  const calculation = useAutoRecalculation(config.calculateTotals, {
    amount: watchAmount,
    vatRate: watchVatRate,
    whtRate: watchWhtRate,
    isWhtEnabled: watchIsWht,
  });

  // ---------------------------------------------------------------------------
  // AI Result Processor (uses grouped state)
  // ---------------------------------------------------------------------------
  const { applyAiResult } = useAiResultProcessor({
    config,
    setValue,
    contacts,
    patchContactState,
    patchAiState,
  });

  // ---------------------------------------------------------------------------
  // Merge Handler (uses grouped state)
  // ---------------------------------------------------------------------------
  const {
    pendingAiResult,
    setPendingAiResult,
    existingFormData,
    setExistingFormData,
    newAiData,
    setNewAiData,
    pendingConflicts,
    showConflictDialog,
    setShowConflictDialog,
    handleMergeDecision: handleMergeDecisionRaw,
    handleConflictResolution,
  } = useMergeHandler({
    config,
    setValue,
    contacts,
    patchContactState,
    setSelectedAccount,
    patchAiState,
  });

  const handleMergeDecision = (decision: MergeDecision) => {
    handleMergeDecisionRaw(decision, detectConflicts);
  };

  // ---------------------------------------------------------------------------
  // Transaction Submission (reads from grouped state)
  // ---------------------------------------------------------------------------
  const setSelectedContactForSubmission = useCallback(
    (c: ContactSummary | null) => patchContactState({ selectedContact: c }),
    [patchContactState],
  );
  const setOneTimeContactNameForSubmission = useCallback(
    (name: string) => patchContactState({ oneTimeContactName: name }),
    [patchContactState],
  );

  const {
    onSubmit,
    handleSave,
    handleEditClick,
    handleCancelEdit,
    isLoading,
    saving,
  } = useTransactionSubmission({
    config,
    companyCode,
    transactionId,
    selectedContact: contactState.selectedContact,
    oneTimeContactName: contactState.oneTimeContactName,
    setOneTimeContactName: setOneTimeContactNameForSubmission,
    selectedAccount,
    setSelectedAccount,
    selectedCategory,
    setSelectedCategory,
    calculation,
    categorizedFiles,
    referenceUrls,
    payers,
    internalCompanyId,
    whtDeliveryMethod: contactState.whtDeliveryMethod,
    whtDeliveryEmail: contactState.whtDeliveryEmail,
    whtDeliveryNotes: contactState.whtDeliveryNotes,
    updateContactDelivery: contactState.updateContactDelivery,
    taxInvoiceRequestMethod: contactState.taxInvoiceRequestMethod,
    taxInvoiceRequestEmail: contactState.taxInvoiceRequestEmail,
    taxInvoiceRequestNotes: contactState.taxInvoiceRequestNotes,
    updateContactTaxInvoiceRequest: contactState.updateContactTaxInvoiceRequest,
    hasDocument: contactState.hasDocument,
    currencyConversion: aiState.currencyConversion,
    watch,
    reset,
    transaction,
    setTransaction,
    mutateTransaction,
    setAuditRefreshKey,
    onModeChange,
    setSelectedContact: setSelectedContactForSubmission,
  });

  // ---------------------------------------------------------------------------
  // File initialisation from prefill data
  // ---------------------------------------------------------------------------
  const [filesInitialized, setFilesInitialized] = useState(false);
  const filesInitRef = useRef(false);

  useEffect(() => {
    if (mode === "create" && config.defaultValues && !filesInitRef.current) {
      const slipUrls = config.defaultValues.slipUrls as string[] | undefined;
      const invoiceUrls = config.defaultValues.taxInvoiceUrls as string[] | undefined;

      if (slipUrls?.length || invoiceUrls?.length) {
        filesInitRef.current = true;
        setCategorizedFiles({
          invoice: invoiceUrls || [],
          slip: slipUrls || [],
          whtCert: [],
          other: [],
          uncategorized: [],
        });
        setFilesInitialized(true);
      }
    }
  }, [mode, config.defaultValues]);

  // ---------------------------------------------------------------------------
  // Populate form from SWR data (view/edit)
  // ---------------------------------------------------------------------------
  const [formPopulated, setFormPopulated] = useState(false);

  useEffect(() => {
    setFormPopulated(false);
  }, [transactionId]);

  useEffect(() => {
    if (mode === "create" || !swrTransaction || formPopulated) return;

    const data = swrTransaction;
    setTransaction(data as unknown as BaseTransaction);

    reset({
      amount: Number(data.amount) || 0,
      vatRate: Number(data.vatRate) || 0,
      [config.fields.whtField.name]: data[config.fields.whtField.name],
      whtRate: data.whtRate != null ? Number(data.whtRate) : undefined,
      whtType: data.whtType,
      status: data.status,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      notes: data.notes,
      documentType: data.documentType || "TAX_INVOICE",
      [config.fields.dateField.name]: data[config.fields.dateField.name] ? new Date(data[config.fields.dateField.name] as string) : undefined,
      ...(config.fields.descriptionField ? { [config.fields.descriptionField.name]: data[config.fields.descriptionField.name] } : {}),
      ...(config.showDueDate ? { dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined } : {}),
    });

    // Build a single contact-state patch from all SWR fields
    const contactPatch: Partial<ContactFormState> = {};

    const contactData = (data.Contact || data.contact) as ContactSummary | undefined;
    if (contactData) {
      contactPatch.selectedContact = {
        id: contactData.id,
        name: contactData.name,
        taxId: contactData.taxId,
        preferredDeliveryMethod: contactData.preferredDeliveryMethod,
        deliveryEmail: contactData.deliveryEmail,
        deliveryNotes: contactData.deliveryNotes,
      };
      contactPatch.oneTimeContactName = "";
    } else if (data.contactName) {
      contactPatch.selectedContact = null;
      contactPatch.oneTimeContactName = data.contactName;
    }

    if (data.whtDeliveryMethod) contactPatch.whtDeliveryMethod = String(data.whtDeliveryMethod);
    if (data.whtDeliveryEmail) contactPatch.whtDeliveryEmail = String(data.whtDeliveryEmail);
    if (data.whtDeliveryNotes) contactPatch.whtDeliveryNotes = String(data.whtDeliveryNotes);
    if (data.taxInvoiceRequestMethod) contactPatch.taxInvoiceRequestMethod = String(data.taxInvoiceRequestMethod);
    if (data.taxInvoiceRequestEmail) contactPatch.taxInvoiceRequestEmail = String(data.taxInvoiceRequestEmail);
    if (data.taxInvoiceRequestNotes) contactPatch.taxInvoiceRequestNotes = String(data.taxInvoiceRequestNotes);
    if (data.hasTaxInvoice) contactPatch.hasDocument = true;

    if (Object.keys(contactPatch).length > 0) {
      patchContactState(contactPatch);
    }

    if (data.accountId) setSelectedAccount(data.accountId);
    if (data.categoryId) setSelectedCategory(data.categoryId as string);
    if (data.internalCompanyId) setInternalCompanyId(data.internalCompanyId as string);

    setCategorizedFiles({
      invoice: (data[config.fileFields.invoice.urlsField] as string[]) || [],
      slip: (data[config.fileFields.slip.urlsField] as string[]) || [],
      whtCert: (data[config.fileFields.wht.urlsField] as string[]) || [],
      other: normalizeOtherDocs(data.otherDocUrls),
      uncategorized: [],
    });

    if (data.referenceUrls && Array.isArray(data.referenceUrls)) {
      setReferenceUrls(data.referenceUrls as string[]);
    }

    if (data.originalCurrency && data.originalCurrency !== "THB") {
      patchAiState({
        currencyConversion: {
          detected: true,
          currency: data.originalCurrency as string,
          originalAmount: Number(data.originalAmount) || 0,
          convertedAmount: Number(data.amount) || 0,
          exchangeRate: Number(data.exchangeRate) || 0,
          conversionNote: null,
        },
      });
    }

    setFormPopulated(true);
  }, [mode, swrTransaction, formPopulated, config, reset, patchContactState, patchAiState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------
  const refreshAll = useCallback(async () => {
    const result = await mutateTransaction();
    if (result) {
      const data = result.data?.[config.type] || result[config.type];
      if (data) setTransaction(data as unknown as BaseTransaction);
    }
    setAuditRefreshKey((prev) => prev + 1);
    router.refresh();
  }, [mutateTransaction, config.type, router]);

  // File upload hooks for view/edit mode
  const { uploadingType, handleFileUpload, handleDeleteFile } = useTransactionFileUpload({
    transactionType: config.type,
    transactionId: transactionId || "",
    companyCode,
    onSuccess: refreshAll,
  });

  const {
    deleting,
    handleDelete,
  } = useTransactionActions({
    transactionType: config.type,
    transactionId: transactionId || "",
    companyCode,
    statusFlow: config.statusFlow,
    statusInfo: config.statusInfo,
    onSuccess: refreshAll,
  });

  // Fetch payers for expense (view/edit mode)
  useEffect(() => {
    const fetchPayers = async () => {
      if (config.type !== "expense" || mode === "create" || !transactionId) return;

      try {
        const res = await fetch(`/api/expenses/${transactionId}/payments`);
        if (res.ok) {
          const result = await res.json();
          const payments = result.data?.payments || [];
          if (payments.length > 0) {
            const mapped = payments.map((p: Record<string, unknown>) => ({
              paidByType: p.paidByType as PayerInfo["paidByType"],
              paidByUserId: p.paidByUserId as string | null,
              paidByName: p.paidByName as string | null,
              paidByBankName: p.paidByBankName as string | null,
              paidByBankAccount: p.paidByBankAccount as string | null,
              amount: Number(p.amount),
            }));
            const seen = new Set<string>();
            const unique = mapped.filter((p: PayerInfo) => {
              const key = p.paidByType === "USER"
                ? `USER:${p.paidByUserId}`
                : p.paidByType === "PETTY_CASH"
                ? `PETTY_CASH:${p.paidByPettyCashFundId || ""}`
                : `${p.paidByType}:${p.amount}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setPayers(unique);
          }
        }
      } catch (err) {
        console.error("Error fetching expense payers:", err);
      }
    };

    if (transaction && transactionId) fetchPayers();
  }, [config.type, mode, transactionId, transaction]);


  // ---------------------------------------------------------------------------
  // AI helpers
  // ---------------------------------------------------------------------------
  const hasExistingData = useCallback(() => {
    const hasAmount = watchAmount !== null && watchAmount !== undefined && watchAmount !== 0;
    const hasContact = contactState.selectedContact !== null;
    return hasAmount || hasContact;
  }, [watchAmount, contactState.selectedContact]);

  const applyContactDefaults = useCallback(() => {
    if (!contactDefaults) return;

    if (contactDefaults.defaultVatRate !== null) {
      setValue("vatRate", contactDefaults.defaultVatRate);
    }

    if (contactDefaults.defaultWhtEnabled !== null) {
      const whtField = config.type === "expense" ? "isWht" : "isWhtDeducted";
      setValue(whtField, contactDefaults.defaultWhtEnabled);

      if (contactDefaults.defaultWhtEnabled) {
        if (contactDefaults.defaultWhtRate !== null) setValue("whtRate", Number(contactDefaults.defaultWhtRate));
        if (contactDefaults.defaultWhtType) setValue("whtType", contactDefaults.defaultWhtType);
      }
    }

    if (contactDefaults.descriptionTemplate && config.fields.descriptionField) {
      setValue(config.fields.descriptionField.name, contactDefaults.descriptionTemplate);
    }

    if (contactDefaults.defaultAccountId && !selectedAccount) {
      setSelectedAccount(contactDefaults.defaultAccountId);
    }

    const deliveryPatch: Partial<ContactFormState> = { defaultsSuggestionDismissed: true };

    if (config.type === "expense") {
      if (contactDefaults.preferredDeliveryMethod) {
        deliveryPatch.whtDeliveryMethod = contactDefaults.preferredDeliveryMethod;
        if (contactDefaults.deliveryEmail) deliveryPatch.whtDeliveryEmail = contactDefaults.deliveryEmail;
        if (contactDefaults.deliveryNotes) deliveryPatch.whtDeliveryNotes = contactDefaults.deliveryNotes;
      }
      if (contactDefaults.taxInvoiceRequestMethod) {
        deliveryPatch.taxInvoiceRequestMethod = contactDefaults.taxInvoiceRequestMethod;
        if (contactDefaults.taxInvoiceRequestEmail) deliveryPatch.taxInvoiceRequestEmail = contactDefaults.taxInvoiceRequestEmail;
        if (contactDefaults.taxInvoiceRequestNotes) deliveryPatch.taxInvoiceRequestNotes = contactDefaults.taxInvoiceRequestNotes;
      }
    }

    patchContactState(deliveryPatch);
    toast.success("ใช้ค่าแนะนำจากผู้ติดต่อแล้ว");
  }, [contactDefaults, setValue, config.type, config.fields.descriptionField, patchContactState]);

  const extractFormData = useCallback((): MergeData => {
    return {
      amount: watchAmount ? Number(watchAmount) : null,
      vatAmount: calculation.vatAmount || null,
      vatRate: watchVatRate || null,
      whtAmount: calculation.whtAmount || null,
      whtRate: watchWhtRate || null,
      vendorName: contactState.selectedContact?.name || null,
      vendorTaxId: contactState.selectedContact?.taxId || null,
      contactId: contactState.selectedContact?.id || null,
      date: watchDate ? new Date(watchDate as string).toISOString() : null,
      invoiceNumber: (watch("invoiceNumber") as string) || null,
      description: config.fields.descriptionField
        ? (watch(config.fields.descriptionField.name) as string) || null
        : null,
      accountId: selectedAccount || null,
      accountName: aiState.accountSuggestion?.accountName || null,
    };
  }, [watchAmount, calculation.vatAmount, calculation.whtAmount, watchVatRate, watchWhtRate, contactState.selectedContact, watchDate, watch, config, selectedAccount, aiState.accountSuggestion]);

  const extractAiData = useCallback(
    (result: MultiDocAnalysisResult): MergeData => {
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
    },
    [config]
  );

  // Handle AI analysis result — single patchAiState call keeps depth low
  const handleAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      patchAiState({
        aiResult: result,
        aiApplied: false,
        ...(result.currencyConversion && result.currencyConversion.currency !== "THB"
          ? { currencyConversion: result.currencyConversion }
          : {}),
      });

      if (hasExistingData()) {
        setPendingAiResult(result);
        setExistingFormData(extractFormData());
        setNewAiData(extractAiData(result));
        setShowMergeDialog(true);
      } else {
        applyAiResult(result);
      }
    },
    [hasExistingData, extractFormData, extractAiData, applyAiResult, patchAiState, setPendingAiResult, setExistingFormData, setNewAiData]
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const navigateToList = () => {
    router.push(`/${companyCode}/${config.listUrl}`);
    router.refresh();
  };

  // ---------------------------------------------------------------------------
  // File upload wrappers (view/edit)
  // ---------------------------------------------------------------------------
  const handleFileUploadWrapper = async (file: File, type: "slip" | "invoice" | "wht" | "other") => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    if (type === "other") {
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as (string | { url: string })[]) || [])
        .map((item: string | { url: string }) => typeof item === "string" ? item : item.url)
        .filter(Boolean);
    }
    await handleFileUpload(file, type, currentUrls, transaction);
  };

  const handleDeleteFileWrapper = async (type: "slip" | "invoice" | "wht" | "other", urlToDelete: string) => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    if (type === "other") {
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as (string | { url: string })[]) || [])
        .map((item: string | { url: string }) => typeof item === "string" ? item : item.url)
        .filter(Boolean);
    }
    await handleDeleteFile(type, urlToDelete, currentUrls, transaction);
  };

  // ---------------------------------------------------------------------------
  // WHT change rules
  // ---------------------------------------------------------------------------
  const whtChangeInfo = useMemo(() => {
    if (!transaction || mode !== "edit") return undefined;

    const currentStatus = transaction.workflowStatus || "";
    const hasWhtCert = transaction.hasWhtCert || false;
    const currentWht = config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted;

    if (WHT_LOCKED_STATUSES.includes(currentStatus as typeof WHT_LOCKED_STATUSES[number])) {
      return { isLocked: true, requiresConfirmation: false, message: "ไม่สามารถเปลี่ยนได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว" };
    }

    if (WHT_CONFIRM_STATUSES_ALL.includes(currentStatus as typeof WHT_CONFIRM_STATUSES_ALL[number]) || hasWhtCert) {
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

  const handleWhtToggle = useCallback((enabled: boolean, confirmed?: boolean, reason?: string) => {
    setValue(config.fields.whtField.name, enabled);
    if (!enabled) {
      setValue("whtRate", undefined);
      setValue("whtType", undefined);
    }
    if (confirmed) {
      setValue("_whtChangeConfirmed" as Parameters<typeof setValue>[0], true);
      if (reason) setValue("_whtChangeReason" as Parameters<typeof setValue>[0], reason);
    }
  }, [setValue, config.fields.whtField.name]);

  const handleDocumentTypeChange = useCallback((docType: string) => {
    setValue("documentType", docType);
  }, [setValue]);

  // Batch-clear tax invoice fields (used by useDocumentTypeEffects)
  const clearTaxInvoiceRequest = useCallback(() => {
    patchContactState({
      taxInvoiceRequestMethod: null,
      taxInvoiceRequestEmail: null,
      taxInvoiceRequestNotes: null,
    });
  }, [patchContactState]);

  useDocumentTypeEffects({
    configType: config.type,
    watchVatRate,
    watchDocumentType,
    setValue,
    taxInvoiceRequestMethod: contactState.taxInvoiceRequestMethod,
    clearTaxInvoiceRequest,
  });

  // ---------------------------------------------------------------------------
  // Form context
  // ---------------------------------------------------------------------------
  const stableAccessibleCompanies = useMemo(
    () => accessibleCompanies.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    [accessibleCompanies],
  );

  const transactionFormContextValue = useFormContextFactory({
    configType: config.type,
    mode,
    contactState,
    patchContactState,
    aiState,
    patchAiState,
    contacts,
    contactsLoading,
    refetchContacts,
    selectedAccount,
    setSelectedAccount,
    selectedCategory,
    setSelectedCategory,
    internalCompanyId,
    setInternalCompanyId,
    accessibleCompanies: stableAccessibleCompanies,
    referenceUrls,
    setReferenceUrls,
  });

  // ---------------------------------------------------------------------------
  // Early returns (loading / error)
  // ---------------------------------------------------------------------------
  if (mode !== "create" && loading) {
    return <TransactionDetailSkeleton />;
  }

  if (mode !== "create" && (error || !transaction)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive font-medium">{error || "ไม่พบรายการ"}</p>
        <Button variant="outline" onClick={navigateToList}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้า{config.title}
          </Button>
      </div>
    );
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <TransactionFormProvider value={transactionFormContextValue}>
      {mode !== "create" && transaction && (
        <TransactionViewToolbar
          config={config}
          transaction={transaction}
          mode={mode}
          saving={saving}
          companyCode={companyCode}
          currentUserId={currentUserId}
          isOwner={isOwner}
          hasPermission={hasPermission}
          canCreateDirect={canCreateDirect}
          canMarkPaid={canMarkPaid}
          onNavigateToList={navigateToList}
          onEditClick={handleEditClick}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          onRefreshAll={refreshAll}
        />
      )}

      <form onSubmit={mode === "create" ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
        {mode === "create" && (
          <CreateModeContent
            config={config}
            companyCode={companyCode}
            mode={mode}
            register={register}
            watch={watch}
            setValue={setValue}
            isLoading={isLoading}
            calculation={calculation}
            watchAmount={watchAmount || 0}
            watchVatRate={watchVatRate || 0}
            watchIsWht={watchIsWht || false}
            watchWhtRate={watchWhtRate}
            watchWhtType={watchWhtType}
            watchDocumentType={watchDocumentType}
            categorizedFiles={categorizedFiles}
            setCategorizedFiles={setCategorizedFiles}
            currencyConversion={aiState.currencyConversion}
            setCurrencyConversion={setCurrencyConversion}
            aiResult={aiState.aiResult}
            setAiResult={setAiResult}
            payers={payers}
            setPayers={setPayers}
            filesInitialized={filesInitialized}
            selectedContact={contactState.selectedContact}
            contactDefaults={contactDefaults}
            hasContactDefaults={hasContactDefaults}
            defaultsSuggestionDismissed={contactState.defaultsSuggestionDismissed}
            setDefaultsSuggestionDismissed={setDefaultsSuggestionDismissed}
            applyContactDefaults={applyContactDefaults}
            setAccountSuggestion={setAccountSuggestion}
            whtChangeInfo={whtChangeInfo}
            handleWhtToggle={handleWhtToggle}
            handleDocumentTypeChange={handleDocumentTypeChange}
            handleAiResult={handleAiResult}
            router={router}
          />
        )}

        {mode !== "create" && transaction && (
          <ViewEditModeContent
            config={config}
            companyCode={companyCode}
            mode={mode}
            register={register}
            watch={watch}
            setValue={setValue}
            calculation={calculation}
            watchAmount={watchAmount || 0}
            watchVatRate={watchVatRate || 0}
            watchIsWht={watchIsWht || false}
            watchWhtRate={watchWhtRate}
            watchWhtType={watchWhtType}
            watchDocumentType={watchDocumentType}
            transaction={transaction}
            currencyConversion={aiState.currencyConversion}
            setCurrencyConversion={setCurrencyConversion}
            payers={payers}
            setPayers={setPayers}
            whtChangeInfo={whtChangeInfo}
            handleWhtToggle={handleWhtToggle}
            handleDocumentTypeChange={handleDocumentTypeChange}
            setAccountSuggestion={setAccountSuggestion}
            uploadingType={uploadingType}
            handleFileUploadWrapper={handleFileUploadWrapper}
            handleDeleteFileWrapper={handleDeleteFileWrapper}
            auditRefreshKey={auditRefreshKey}
            currentUserId={currentUserId}
          />
        )}
      </form>

      <TransactionDialogs
        showDeleteConfirm={showDeleteConfirm}
        onDeleteOpenChange={setShowDeleteConfirm}
        onDeleteConfirm={handleDelete}
        isDeleting={deleting}
        deleteTitle={config.title}
        deleteDescription={transaction ? (transaction[config.fields.descriptionField?.name || ""] as string) || config.title : undefined}
        deleteAmount={transaction ? (transaction[config.fields.netAmountField] as number) : undefined}
        showMergeDialog={showMergeDialog}
        onMergeOpenChange={setShowMergeDialog}
        existingData={existingFormData}
        newData={newAiData}
        onMergeDecision={handleMergeDecision}
        showConflictDialog={showConflictDialog}
        onConflictOpenChange={setShowConflictDialog}
        conflicts={pendingConflicts}
        onConflictResolve={handleConflictResolution}
      />

    </TransactionFormProvider>
  );
}
