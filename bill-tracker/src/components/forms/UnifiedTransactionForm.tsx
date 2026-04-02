"use client";

import { useState, useEffect, useCallback, ReactNode, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  LucideIcon,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";


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

// Shared form components
import { CategorizedFiles, MultiDocAnalysisResult, normalizeOtherDocs } from "./shared/InputMethodSection";
import { MergeData, MergeDecision } from "./shared/MergeOptionsDialog";
import { detectConflicts } from "./shared/ConflictDialog";
import { TransactionDialogs } from "./shared/TransactionDialogs";
import { TransactionFormProvider } from "./TransactionFormContext";
import { PayerInfo } from "./shared/PayerSection";
import { TransactionViewToolbar } from "./shared/TransactionViewToolbar";
import { CreateModeContent } from "./CreateModeContent";
import type { AccountSuggestion, CurrencyConversionValue } from "./CreateModeContent";
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
  currentUserId?: string; // For comment section
}

// BaseTransaction is now imported from hooks/useTransactionForm

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
  
  // Permissions for draft/approval workflow
  const { hasPermission, isOwner } = usePermissions();
  const canCreateDirect = config.type === "expense" 
    ? hasPermission("expenses:create-direct") 
    : hasPermission("incomes:create-direct");
  const canMarkPaid = config.type === "expense"
    ? hasPermission("expenses:mark-paid")
    : hasPermission("incomes:mark-received");
  
  // Use mode from props directly (controlled by parent)
  // Note: isLoading and saving are now managed by useTransactionSubmission hook
  
  // Use SWR for transaction fetching (provides caching across navigations)
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
  
  // Local state for transaction (populated from SWR)
  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const loading = mode !== "create" && swrLoading && !transaction;
  const error = swrError?.message || null;
  // Note: saving is now managed by useTransactionSubmission hook
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const [calculation, setCalculation] = useState({
    baseAmount: 0,
    vatAmount: 0,
    whtAmount: 0,
    totalWithVat: 0,
    netAmount: 0,
  });

  // Document files state
  const [categorizedFiles, setCategorizedFiles] = useState<CategorizedFiles>({
    invoice: [],
    slip: [],
    whtCert: [],
    other: [],
    uncategorized: [],
  });

  // AI Analysis State
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Currency conversion state (persists across view/edit modes, populated from AI result or DB)
  const [currencyConversion, setCurrencyConversion] = useState<CurrencyConversionValue | null>(null);

  // Merge Dialog State
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  // Note: pendingAiResult, existingFormData, newAiData, pendingConflicts, pendingMergedData, 
  // showConflictDialog are now managed by useMergeHandler hook

  // Contacts
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [oneTimeContactName, setOneTimeContactName] = useState("");
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  
  // Payers (for expense only)
  const [payers, setPayers] = useState<PayerInfo[]>([]);
  const [payersInitialized, setPayersInitialized] = useState(false);
  
  // Internal company tracking (expense only)
  const { companies: contextCompanies } = useSafeCompany();
  const [fetchedCompanies, setFetchedCompanies] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [internalCompanyId, setInternalCompanyId] = useState<string | null>(null);
  
  // WHT delivery method (expense only)
  const [whtDeliveryMethod, setWhtDeliveryMethod] = useState<string | null>(null);
  const [whtDeliveryEmail, setWhtDeliveryEmail] = useState<string | null>(null);
  const [whtDeliveryNotes, setWhtDeliveryNotes] = useState<string | null>(null);
  const [updateContactDelivery, setUpdateContactDelivery] = useState(false);
  
  // Tax invoice request method (expense only)
  const [taxInvoiceRequestMethod, setTaxInvoiceRequestMethod] = useState<string | null>(null);
  const [taxInvoiceRequestEmail, setTaxInvoiceRequestEmail] = useState<string | null>(null);
  const [taxInvoiceRequestNotes, setTaxInvoiceRequestNotes] = useState<string | null>(null);
  const [updateContactTaxInvoiceRequest, setUpdateContactTaxInvoiceRequest] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  
  // Use context companies if available, otherwise fetch from API
  const accessibleCompanies = contextCompanies.length > 0 
    ? contextCompanies 
    : fetchedCompanies;

  // Fetch companies from API if context is not available (for internal company selector)
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
        .catch(() => {
          // Ignore errors - internal company is optional
        });
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
        // From reimbursement - pre-fill with USER payer (already settled)
        setPayers([{
          paidByType: "USER",
          paidByUserId: requesterInfo.id || null,
          paidByName: requesterInfo.name || null,
          amount: Number(config.defaultValues.amount) || 0,
          // Include settlement info for the API
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

  // AI Vendor Suggestion (for auto-creating contact)
  const [aiVendorSuggestion, setAiVendorSuggestion] = useState<{
    name: string;
    taxId?: string | null;
    branchNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);

  // Contact Defaults Suggestion
  const [defaultsSuggestionDismissed, setDefaultsSuggestionDismissed] = useState(false);
  const { defaults: contactDefaults, hasDefaults: hasContactDefaults } = useContactDefaults(
    companyCode,
    selectedContact?.id || null
  );

  // Reset defaults suggestion dismissed state when contact changes
  useEffect(() => {
    setDefaultsSuggestionDismissed(false);
  }, [selectedContact?.id]);

  // Auto-fill WHT delivery method from contact when contact is selected (expense only, create mode)
  useEffect(() => {
    if (config.type !== "expense" || mode !== "create") return;
    if (!selectedContact) return;
    
    // Auto-fill delivery method from contact's preference
    if (selectedContact.preferredDeliveryMethod && !whtDeliveryMethod) {
      setWhtDeliveryMethod(selectedContact.preferredDeliveryMethod);
      if (selectedContact.deliveryEmail) {
        setWhtDeliveryEmail(selectedContact.deliveryEmail);
      }
      if (selectedContact.deliveryNotes) {
        setWhtDeliveryNotes(selectedContact.deliveryNotes);
      }
    }
  }, [selectedContact, config.type, mode, whtDeliveryMethod]);

  // Auto-fill tax invoice request method from contact when contact is selected (expense only, create mode)
  useEffect(() => {
    if (config.type !== "expense" || mode !== "create") return;
    if (!selectedContact) return;
    
    // Auto-fill tax invoice request method from contact's preference
    if (selectedContact.taxInvoiceRequestMethod && !taxInvoiceRequestMethod) {
      setTaxInvoiceRequestMethod(selectedContact.taxInvoiceRequestMethod);
      if (selectedContact.taxInvoiceRequestEmail) {
        setTaxInvoiceRequestEmail(selectedContact.taxInvoiceRequestEmail);
      }
      if (selectedContact.taxInvoiceRequestNotes) {
        setTaxInvoiceRequestNotes(selectedContact.taxInvoiceRequestNotes);
      }
    }
  }, [selectedContact, config.type, mode, taxInvoiceRequestMethod]);

  // Account
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  // AI Account Suggestion
  const [accountSuggestion, setAccountSuggestion] = useState<AccountSuggestion>(null);
  
  // Reference URLs (for external links to products, orders, etc.)
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

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
  const watchDocumentType = watch("documentType") as string | undefined;

  // AI Result Processor Hook (Phase 5 Integration)
  const { applyAiResult } = useAiResultProcessor({
    config,
    setValue,
    contacts,
    setSelectedContact,
    setAiVendorSuggestion,
    setAccountSuggestion,
    setPendingContactId,
    setAiApplied,
  });

  // Merge Handler Hook (Phase 5 Integration)
  const {
    pendingAiResult,
    setPendingAiResult,
    existingFormData,
    setExistingFormData,
    newAiData,
    setNewAiData,
    pendingConflicts,
    pendingMergedData,
    showConflictDialog,
    setShowConflictDialog,
    handleMergeDecision: handleMergeDecisionRaw,
    handleConflictResolution,
    applyMergedData,
  } = useMergeHandler({
    config,
    setValue,
    contacts,
    setSelectedContact,
    setSelectedAccount,
    setAiResult,
    setAiApplied,
  });

  // Wrap handleMergeDecision to pass detectConflicts
  const handleMergeDecision = (decision: MergeDecision) => {
    handleMergeDecisionRaw(decision, detectConflicts);
  };

  // Transaction Submission Hook (Phase 5 Integration)
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
    selectedContact,
    oneTimeContactName,
    setOneTimeContactName,
    selectedAccount,
    setSelectedAccount,
    calculation,
    categorizedFiles,
    referenceUrls,
    payers,
    internalCompanyId,
    whtDeliveryMethod,
    whtDeliveryEmail,
    whtDeliveryNotes,
    updateContactDelivery,
    taxInvoiceRequestMethod,
    taxInvoiceRequestEmail,
    taxInvoiceRequestNotes,
    updateContactTaxInvoiceRequest,
    hasDocument,
    currencyConversion,
    watch,
    reset,
    transaction,
    setTransaction,
    mutateTransaction,
    setAuditRefreshKey,
    onModeChange,
    setSelectedContact,
  });

  // Initialize files from prefill data (e.g., from reimbursement)
  const [filesInitialized, setFilesInitialized] = useState(false);
  const filesInitRef = useRef(false); // Prevent double-init in StrictMode
  
  useEffect(() => {
    if (mode === "create" && config.defaultValues && !filesInitRef.current) {
      const slipUrls = config.defaultValues.slipUrls as string[] | undefined;
      const invoiceUrls = config.defaultValues.taxInvoiceUrls as string[] | undefined;
      
      if (slipUrls?.length || invoiceUrls?.length) {
        filesInitRef.current = true;
        const initialFiles = {
          invoice: invoiceUrls || [],
          slip: slipUrls || [],
          whtCert: [],
          other: [],
          uncategorized: [],
        };
        setCategorizedFiles(initialFiles);
        setFilesInitialized(true);
      }
    }
  }, [mode, config.defaultValues]);

  // Track if we've already populated the form from SWR data
  const [formPopulated, setFormPopulated] = useState(false);
  
  // Reset formPopulated when transactionId changes (e.g., navigation or refresh)
  useEffect(() => {
    setFormPopulated(false);
  }, [transactionId]);
  
  // Populate form when SWR data arrives (only once per transaction)
  useEffect(() => {
    if (mode === "create" || !swrTransaction || formPopulated) return;
    
    const data = swrTransaction;
    setTransaction(data as unknown as BaseTransaction);
    
    // Populate form with transaction data
    reset({
      amount: data.amount,
      vatRate: data.vatRate,
      [config.fields.whtField.name]: data[config.fields.whtField.name],
      whtRate: data.whtRate,
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

    // Set contact (Prisma returns Contact with capital C)
    // Cast to any to access all fields from the API response
    const contactData = (data.Contact || data.contact) as ContactSummary | undefined;
    if (contactData) {
      setSelectedContact({
        id: contactData.id,
        name: contactData.name,
        taxId: contactData.taxId,
        // Delivery preferences
        preferredDeliveryMethod: contactData.preferredDeliveryMethod,
        deliveryEmail: contactData.deliveryEmail,
        deliveryNotes: contactData.deliveryNotes,
      });
      setOneTimeContactName("");
    } else if (data.contactName) {
      // One-time contact name (typed manually, not saved as Contact)
      setSelectedContact(null);
      setOneTimeContactName(data.contactName);
    }

    // Set account
    if (data.accountId) {
      setSelectedAccount(data.accountId);
    }

    // Set internal company (expense only)
    if (data.internalCompanyId) {
      setInternalCompanyId(data.internalCompanyId as string);
    }

    // Set WHT delivery method (expense only)
    if (data.whtDeliveryMethod) {
      setWhtDeliveryMethod(String(data.whtDeliveryMethod));
    }
    if (data.whtDeliveryEmail) {
      setWhtDeliveryEmail(String(data.whtDeliveryEmail));
    }
    if (data.whtDeliveryNotes) {
      setWhtDeliveryNotes(String(data.whtDeliveryNotes));
    }

    // Set tax invoice request method (expense only)
    if (data.taxInvoiceRequestMethod) {
      setTaxInvoiceRequestMethod(String(data.taxInvoiceRequestMethod));
    }
    if (data.taxInvoiceRequestEmail) {
      setTaxInvoiceRequestEmail(String(data.taxInvoiceRequestEmail));
    }
    if (data.taxInvoiceRequestNotes) {
      setTaxInvoiceRequestNotes(String(data.taxInvoiceRequestNotes));
    }
    if (data.hasTaxInvoice) {
      setHasDocument(true);
    }

    // Set categorized files (normalize other docs for backward compatibility)
    setCategorizedFiles({
      invoice: (data[config.fileFields.invoice.urlsField] as string[]) || [],
      slip: (data[config.fileFields.slip.urlsField] as string[]) || [],
      whtCert: (data[config.fileFields.wht.urlsField] as string[]) || [],
      other: normalizeOtherDocs(data.otherDocUrls),
      uncategorized: [],
    });
    
    // Set reference URLs
    if (data.referenceUrls && Array.isArray(data.referenceUrls)) {
      setReferenceUrls(data.referenceUrls as string[]);
    }

    // Set currency conversion info from DB (if transaction was in foreign currency)
    if (data.originalCurrency && data.originalCurrency !== "THB") {
      setCurrencyConversion({
        detected: true,
        currency: data.originalCurrency as string,
        originalAmount: Number(data.originalAmount) || 0,
        convertedAmount: Number(data.amount) || 0,
        exchangeRate: Number(data.exchangeRate) || 0,
        conversionNote: null,
      });
    }
    
    setFormPopulated(true);
  }, [mode, swrTransaction, formPopulated, config, reset]);

  // Refresh all data (SWR mutate + router refresh for full page tree)
  const refreshAll = useCallback(async () => {
    const result = await mutateTransaction();
    if (result) {
      const data = result.data?.[config.type] || result[config.type];
      if (data) {
        setTransaction(data as unknown as BaseTransaction);
      }
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

  // Transaction actions for view/edit mode
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
            // Deduplicate: keep only unique payers by type+userId
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

    if (transaction && transactionId) {
      fetchPayers();
    }
  }, [config.type, mode, transactionId, transaction]);

  // Recalculate when values change (use safe numeric values to prevent NaN propagation)
  const safeAmount = typeof watchAmount === "number" && Number.isFinite(watchAmount) ? watchAmount : 0;
  const safeVatRate = typeof watchVatRate === "number" && Number.isFinite(watchVatRate) ? watchVatRate : 0;
  const safeWhtRate = typeof watchWhtRate === "number" && Number.isFinite(watchWhtRate) ? watchWhtRate : 0;

  useEffect(() => {
    const calc = config.calculateTotals(
      safeAmount,
      safeVatRate,
      watchIsWht ? safeWhtRate : 0
    );
    setCalculation(calc);
  }, [safeAmount, safeVatRate, watchIsWht, safeWhtRate, config]);

  // Check if form has existing data
  const hasExistingData = useCallback(() => {
    const hasAmount = watchAmount !== null && watchAmount !== undefined && watchAmount !== 0;
    const hasContact = selectedContact !== null;
    return hasAmount || hasContact;
  }, [watchAmount, selectedContact]);

  // Apply contact defaults to form
  const applyContactDefaults = useCallback(() => {
    if (!contactDefaults) return;

    // Apply VAT rate
    if (contactDefaults.defaultVatRate !== null) {
      setValue("vatRate", contactDefaults.defaultVatRate);
    }

    // Apply WHT settings
    if (contactDefaults.defaultWhtEnabled !== null) {
      const whtField = config.type === "expense" ? "isWht" : "isWhtDeducted";
      setValue(whtField, contactDefaults.defaultWhtEnabled);
      
      if (contactDefaults.defaultWhtEnabled) {
        if (contactDefaults.defaultWhtRate !== null) {
          setValue("whtRate", Number(contactDefaults.defaultWhtRate));
        }
        if (contactDefaults.defaultWhtType) {
          setValue("whtType", contactDefaults.defaultWhtType);
        }
      }
    }

    // Apply description template
    if (contactDefaults.descriptionTemplate && config.fields.descriptionField) {
      setValue(config.fields.descriptionField.name, contactDefaults.descriptionTemplate);
    }

    // Dismiss the suggestion after applying
    setDefaultsSuggestionDismissed(true);
    toast.success("ใช้ค่าแนะนำจากผู้ติดต่อแล้ว");
  }, [contactDefaults, setValue, config.type, config.fields.descriptionField]);

  // Extract current form data as MergeData
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
  }, [watchAmount, calculation.vatAmount, calculation.whtAmount, watchVatRate, watchWhtRate, selectedContact, watchDate, watch, config, selectedAccount, accountSuggestion]);

  // Extract AI result as MergeData
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

  // Handle AI analysis result
  const handleAiResult = useCallback(
    (result: MultiDocAnalysisResult) => {
      setAiResult(result);
      setAiApplied(false);

      // Sync currency conversion state from AI result
      if (result.currencyConversion && result.currencyConversion.currency !== "THB") {
        setCurrencyConversion(result.currencyConversion);
      }

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

  // Note: handleMergeDecision, handleConflictResolution, applyMergedData are now from useMergeHandler hook
  // Note: onSubmit, handleSave, handleEditClick, handleCancelEdit are now from useTransactionSubmission hook

  // Navigate to list page with refresh
  const navigateToList = () => {
    router.push(`/${companyCode}/${config.listUrl}`);
    router.refresh();
  };

  // File upload wrappers for view/edit mode
  const handleFileUploadWrapper = async (file: File, type: "slip" | "invoice" | "wht" | "other") => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    // Handle otherDocUrls separately (not in config.fileFields)
    if (type === "other") {
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as (string | { url: string })[]) || [])
        .map((item: string | { url: string }) =>
          typeof item === "string" ? item : item.url
        )
        .filter(Boolean);
    }
    await handleFileUpload(file, type, currentUrls, transaction);
  };

  const handleDeleteFileWrapper = async (type: "slip" | "invoice" | "wht" | "other", urlToDelete: string) => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    // Handle otherDocUrls separately (not in config.fileFields)
    if (type === "other") {
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as (string | { url: string })[]) || [])
        .map((item: string | { url: string }) =>
          typeof item === "string" ? item : item.url
        )
        .filter(Boolean);
    }
    await handleDeleteFile(type, urlToDelete, currentUrls, transaction);
  };
  
  // ==========================================================================
  // WHT Change Rules (must be before early returns to maintain hooks order)
  // ==========================================================================
  
  const whtChangeInfo = useMemo(() => {
    if (!transaction || mode !== "edit") {
      return undefined;
    }
    
    const currentStatus = transaction.workflowStatus || "";
    const hasWhtCert = transaction.hasWhtCert || false;
    const currentWht = config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted;
    
    // Check if locked
    if (WHT_LOCKED_STATUSES.includes(currentStatus as typeof WHT_LOCKED_STATUSES[number])) {
      return {
        isLocked: true,
        requiresConfirmation: false,
        message: "ไม่สามารถเปลี่ยนได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
      };
    }
    
    // Check if requires confirmation
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
  
  // Handle WHT toggle with confirmation
  const handleWhtToggle = useCallback((enabled: boolean, confirmed?: boolean, reason?: string) => {
    setValue(config.fields.whtField.name, enabled);
    
    if (!enabled) {
      setValue("whtRate", undefined);
      setValue("whtType", undefined);
    }
    
    // Store confirmation flag for API
    if (confirmed) {
      setValue("_whtChangeConfirmed" as Parameters<typeof setValue>[0], true);
      if (reason) {
        setValue("_whtChangeReason" as Parameters<typeof setValue>[0], reason);
      }
    }
  }, [setValue, config.fields.whtField.name]);

  // Handle document type change (for VAT 0% expenses)
  const handleDocumentTypeChange = useCallback((docType: string) => {
    setValue("documentType", docType);
  }, [setValue]);

  useDocumentTypeEffects({
    configType: config.type,
    watchVatRate,
    watchDocumentType,
    setValue,
    taxInvoiceRequestMethod,
    setTaxInvoiceRequestMethod,
    setTaxInvoiceRequestEmail,
    setTaxInvoiceRequestNotes,
  });

  const stableAccessibleCompanies = useMemo(
    () => accessibleCompanies.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    [accessibleCompanies],
  );

  const transactionFormContextValue = useFormContextFactory({
    configType: config.type,
    mode,
    contacts,
    contactsLoading,
    selectedContact,
    setSelectedContact,
    refetchContacts,
    oneTimeContactName,
    setOneTimeContactName,
    aiVendorSuggestion,
    setAiVendorSuggestion,
    selectedAccount,
    setSelectedAccount,
    accountSuggestion,
    aiResult,
    whtDeliveryMethod,
    setWhtDeliveryMethod,
    whtDeliveryEmail,
    setWhtDeliveryEmail,
    whtDeliveryNotes,
    setWhtDeliveryNotes,
    updateContactDelivery,
    setUpdateContactDelivery,
    taxInvoiceRequestMethod,
    setTaxInvoiceRequestMethod,
    taxInvoiceRequestEmail,
    setTaxInvoiceRequestEmail,
    taxInvoiceRequestNotes,
    setTaxInvoiceRequestNotes,
    updateContactTaxInvoiceRequest,
    setUpdateContactTaxInvoiceRequest,
    hasDocument,
    setHasDocument,
    internalCompanyId,
    setInternalCompanyId,
    accessibleCompanies: stableAccessibleCompanies,
    referenceUrls,
    setReferenceUrls,
  });

  // Loading state for view/edit mode
  if (mode !== "create" && loading) {
    return <TransactionDetailSkeleton />;
  }

  // Error state
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
      {/* View/Edit Mode Header */}
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

      {/* Form Content */}
      <form onSubmit={mode === "create" ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
        {/* CREATE MODE */}
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
            currencyConversion={currencyConversion}
            setCurrencyConversion={setCurrencyConversion}
            aiResult={aiResult}
            setAiResult={setAiResult}
            payers={payers}
            setPayers={setPayers}
            filesInitialized={filesInitialized}
            selectedContact={selectedContact}
            contactDefaults={contactDefaults}
            hasContactDefaults={hasContactDefaults}
            defaultsSuggestionDismissed={defaultsSuggestionDismissed}
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

        {/* VIEW/EDIT MODE */}
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
            currencyConversion={currencyConversion}
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

