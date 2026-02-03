"use client";

import { useState, useEffect, useCallback, ReactNode, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Loader2,
  LucideIcon,
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";

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
import { InputMethodSection, CategorizedFiles, MultiDocAnalysisResult, normalizeOtherDocs } from "./shared/InputMethodSection";
import { MergeOptionsDialog, MergeData, MergeDecision } from "./shared/MergeOptionsDialog";
import { ConflictDialog, ConflictField, ConflictResolution, detectConflicts } from "./shared/ConflictDialog";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionFieldsSection, TransactionFieldsConfig } from "./shared/TransactionFieldsSection";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { PayerSection, PayerInfo } from "./shared/PayerSection";
import { ContactDefaultsSuggestion } from "./shared/ContactDefaultsSuggestion";

// Transaction components
import { DocumentSection, TransactionDetailSkeleton, CombinedHistorySection, WorkflowActions, TimelineStepper, DraftActions, ApprovalBadge, ApprovalActions, TransactionViewHeader } from "@/components/transactions";
import { CommentSection } from "@/components/comments/CommentSection";

// Types & Constants
import type { ContactSummary } from "@/types";
import type { ApprovalStatus } from "@prisma/client";
import { StatusInfo, EXPENSE_WORKFLOW_INFO, INCOME_WORKFLOW_INFO, APPROVAL_STATUS_INFO, getExpenseWorkflowLabel, WHT_LOCKED_STATUSES, WHT_CONFIRM_STATUSES_ALL } from "@/lib/constants/transaction";

// Permissions
import { usePermissions } from "@/components/providers/permission-provider";

// Import and re-export BaseTransaction type from hooks
import type { BaseTransaction } from "./hooks/useTransactionForm";
export type { BaseTransaction };

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


  // Account
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  // AI Account Suggestion
  const [accountSuggestion, setAccountSuggestion] = useState<{
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
  } | null>(null);
  
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
      
      console.log("UnifiedTransactionForm initializing files:", { slipUrls, invoiceUrls });
      
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
        console.log("UnifiedTransactionForm files set to:", initialFiles);
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
      [config.fields.dateField.name]: data[config.fields.dateField.name] ? new Date(data[config.fields.dateField.name]) : undefined,
      ...(config.fields.descriptionField ? { [config.fields.descriptionField.name]: data[config.fields.descriptionField.name] } : {}),
      ...(config.showDueDate ? { dueDate: data.dueDate ? new Date(data.dueDate) : undefined } : {}),
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
      setInternalCompanyId(data.internalCompanyId);
    }

    // Set categorized files (normalize other docs for backward compatibility)
    setCategorizedFiles({
      invoice: data[config.fileFields.invoice.urlsField] || [],
      slip: data[config.fileFields.slip.urlsField] || [],
      whtCert: data[config.fileFields.wht.urlsField] || [],
      other: normalizeOtherDocs(data.otherDocUrls),
      uncategorized: [],
    });
    
    // Set reference URLs
    if (data.referenceUrls && Array.isArray(data.referenceUrls)) {
      setReferenceUrls(data.referenceUrls);
    }
    
    setFormPopulated(true);
  }, [mode, swrTransaction, formPopulated, config, reset]);

  // Refresh all data (using SWR mutate)
  const refreshAll = useCallback(async () => {
    // Force SWR to refetch and update local state
    const result = await mutateTransaction();
    if (result) {
      const data = result.data?.[config.type] || result[config.type];
      if (data) {
        setTransaction(data as unknown as BaseTransaction);
      }
    }
    setAuditRefreshKey((prev) => prev + 1);
  }, [mutateTransaction, config.type]);

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
            setPayers(
              payments.map((p: Record<string, unknown>) => ({
                paidByType: p.paidByType as PayerInfo["paidByType"],
                paidByUserId: p.paidByUserId as string | null,
                paidByName: p.paidByName as string | null,
                paidByBankName: p.paidByBankName as string | null,
                paidByBankAccount: p.paidByBankAccount as string | null,
                amount: Number(p.amount),
              }))
            );
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

  // Recalculate when values change
  useEffect(() => {
    const calc = config.calculateTotals(
      watchAmount || 0,
      watchVatRate || 0,
      watchIsWht ? watchWhtRate || 0 : 0
    );
    setCalculation(calc);
  }, [watchAmount, watchVatRate, watchIsWht, watchWhtRate, config]);

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
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as any[]) || []).map((item: any) => 
        typeof item === 'string' ? item : item.url
      ).filter(Boolean);
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
      currentUrls["otherDocUrls"] = ((transaction.otherDocUrls as any[]) || []).map((item: any) => 
        typeof item === 'string' ? item : item.url
      ).filter(Boolean);
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
      setValue("_whtChangeConfirmed" as any, true);
      if (reason) {
        setValue("_whtChangeReason" as any, reason);
      }
    }
  }, [setValue, config.fields.whtField.name]);

  // Handle document type change (for VAT 0% expenses)
  const handleDocumentTypeChange = useCallback((docType: string) => {
    setValue("documentType", docType);
  }, [setValue]);

  // Auto-set default document type based on VAT (WHT is independent of VAT)
  const prevVatRateRef = useRef(watchVatRate);
  useEffect(() => {
    if (config.type === "expense" && prevVatRateRef.current !== watchVatRate) {
      if (watchVatRate === 0) {
        // VAT changed to 0% - set default document type to CASH_RECEIPT
        // NOTE: WHT is NOT disabled - can still withhold tax from non-VAT registered vendors (e.g., freelancers)
        if (!watchDocumentType || watchDocumentType === "TAX_INVOICE") {
          setValue("documentType", "CASH_RECEIPT");
        }
      } else {
        // VAT changed to 7% - set document type to TAX_INVOICE
        setValue("documentType", "TAX_INVOICE");
      }
      prevVatRateRef.current = watchVatRate;
    }
  }, [watchVatRate, watchDocumentType, config.type, setValue]);

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

  // Use workflowStatus for badge if available, fallback to legacy status
  const workflowInfo = config.type === "expense" ? EXPENSE_WORKFLOW_INFO : INCOME_WORKFLOW_INFO;
  const statusInfo = transaction
    ? (transaction.workflowStatus 
        ? workflowInfo[transaction.workflowStatus] 
        : config.statusInfo[transaction.status]) || config.statusInfo[config.defaultStatus]
    : null;
  const isDeleted = transaction?.deletedAt ? true : false;

  // Build fields config for TransactionFieldsSection
  const fieldsConfig: TransactionFieldsConfig = {
    type: config.type,
    dateField: config.fields.dateField,
    descriptionField: config.fields.descriptionField,
    statusOptions: config.statusOptions,
    showDueDate: config.showDueDate,
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <>
      {/* View/Edit Mode Header */}
      {mode !== "create" && transaction && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          {/* Deleted Warning Banner */}
          {isDeleted && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3 flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive text-sm">รายการนี้ถูกลบแล้ว</p>
                <p className="text-xs text-muted-foreground">
                  ลบเมื่อ {new Date(transaction.deletedAt as string).toLocaleString("th-TH")}
                  {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
                </p>
              </div>
            </div>
          )}

          {/* Compact Header */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                  variant="ghost"
                  size="icon"
                  className={cn("shrink-0 rounded-full h-9 w-9", config.iconColor)}
                  onClick={navigateToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-foreground">{config.title}</h1>
                  {/* Show single badge: ApprovalBadge for PENDING/REJECTED, otherwise StatusBadge */}
                  {transaction.workflowStatus === "DRAFT" && transaction.approvalStatus === "PENDING" ? (
                    <ApprovalBadge status="PENDING" size="sm" />
                  ) : transaction.workflowStatus === "DRAFT" && transaction.approvalStatus === "REJECTED" ? (
                    <ApprovalBadge status="REJECTED" size="sm" />
                  ) : statusInfo && (
                    <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.color)}>
                      {config.type === "expense" && transaction.workflowStatus
                        ? getExpenseWorkflowLabel(transaction.workflowStatus, (transaction.documentType as string) || "TAX_INVOICE")
                        : statusInfo.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(transaction[config.fields.dateField.name] as string).toLocaleDateString(
                    "th-TH",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isDeleted ? (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <Trash2 className="h-3 w-3" />
                  ถูกลบแล้ว
                </Badge>
              ) : mode === "edit" ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                    <X className="h-4 w-4 mr-1" />
                    ยกเลิก
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    บันทึก
                  </Button>
                </div>
              ) : (
                <>
                  {/* Show actions based on role for DRAFT status */}
                  {transaction?.workflowStatus === "DRAFT" && transaction.approvalStatus && (
                    <>
                      {/* PENDING: Show actions based on user role */}
                      {transaction.approvalStatus === "PENDING" && (
                        <>
                          {/* Requester: Show only withdraw button */}
                          {transaction.submittedBy === currentUserId && (
                            <DraftActions
                              companyCode={companyCode}
                              transactionId={transaction.id}
                              transactionType={config.type}
                              workflowStatus={transaction.workflowStatus}
                              approvalStatus={transaction.approvalStatus as ApprovalStatus}
                              rejectedReason={transaction.rejectedReason as string | null}
                              submittedAt={transaction.submittedAt as string | null}
                              submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
                              canCreateDirect={canCreateDirect}
                              canMarkPaid={canMarkPaid}
                              onSuccess={() => {
                                refreshAll();
                              }}
                            />
                          )}
                          
                          {/* Approver (not requester): Show only approve/reject buttons */}
                          {transaction.submittedBy !== currentUserId && currentUserId && hasPermission(`${config.type}s:approve`) && (
                            <ApprovalActions
                              transactionId={transaction.id}
                              transactionType={config.type}
                              approvalStatus={transaction.approvalStatus as ApprovalStatus}
                              submittedBy={transaction.submittedBy as string | null}
                              currentUserId={currentUserId}
                              canApprove={true}
                              onSuccess={refreshAll}
                            />
                          )}
                          
                          {/* Others (not requester, not approver): Show status only */}
                          {transaction.submittedBy !== currentUserId && !hasPermission(`${config.type}s:approve`) && (
                            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                              รอการอนุมัติ
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* NOT_REQUIRED or REJECTED: Show DraftActions for owner */}
                      {transaction.approvalStatus !== "PENDING" && (
                        <DraftActions
                          companyCode={companyCode}
                          transactionId={transaction.id}
                          transactionType={config.type}
                          workflowStatus={transaction.workflowStatus}
                          approvalStatus={transaction.approvalStatus as ApprovalStatus}
                          rejectedReason={transaction.rejectedReason as string | null}
                          submittedAt={transaction.submittedAt as string | null}
                          submittedByName={(transaction.submittedByUser as { name?: string } | null)?.name}
                          canCreateDirect={canCreateDirect}
                          canMarkPaid={canMarkPaid}
                          onSuccess={() => {
                            refreshAll();
                          }}
                        />
                      )}
                    </>
                  )}
                  {/* Show WorkflowActions for non-DRAFT status */}
                  {transaction?.workflowStatus && transaction.workflowStatus !== "DRAFT" && (
                    <WorkflowActions
                      companyCode={companyCode}
                      type={config.type}
                      transactionId={transaction.id}
                      currentStatus={transaction.workflowStatus}
                      isWht={config.type === "expense" ? transaction.isWht : undefined}
                      isWhtDeducted={config.type === "income" ? transaction.isWhtDeducted : undefined}
                      documentType={config.type === "expense" ? (transaction.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") : undefined}
                      onActionComplete={() => {
                        refreshAll();
                      }}
                      variant="compact"
                      isOwner={isOwner}
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={handleEditClick}>
                    <Edit className="h-4 w-4 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    ลบ
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Timeline Stepper - Compact */}
          {transaction?.workflowStatus && (
            <div className="pb-2">
              <TimelineStepper
                type={config.type}
                currentStatus={transaction.workflowStatus}
                isWht={config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted}
                approvalStatus={transaction.approvalStatus as ApprovalStatus | undefined}
                documentType={config.type === "expense" ? (transaction.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT" | undefined) : undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={mode === "create" ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
        {/* CREATE MODE */}
        {mode === "create" && (
          <Card className="border-border/50 shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className={`p-2 rounded-xl ${config.iconColor}`}>
                  <config.icon className="h-5 w-5" />
                </div>
                {config.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-6">
                  {/* Fields Section */}
                  <TransactionFieldsSection
                    config={fieldsConfig}
                    companyCode={companyCode}
                    mode={mode}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    contacts={contacts}
                    contactsLoading={contactsLoading}
                    selectedContact={selectedContact}
                    onContactSelect={(contact) => {
                      setSelectedContact(contact);
                      if (contact) {
                        setAiVendorSuggestion(null);
                      }
                    }}
                    onContactCreated={(contact) => {
                      refetchContacts();
                      setSelectedContact(contact);
                      setAiVendorSuggestion(null);
                    }}
                    oneTimeContactName={oneTimeContactName}
                    onOneTimeContactNameChange={setOneTimeContactName}
                    selectedAccount={selectedAccount}
                    onAccountChange={setSelectedAccount}
                    suggestedAccountId={
                      accountSuggestion?.accountId ||
                      aiResult?.aiAccountSuggestion?.accountId ||
                      undefined
                    }
                    suggestedAccountAlternatives={accountSuggestion?.alternatives}
                    aiVendorSuggestion={aiVendorSuggestion}
                    referenceUrls={referenceUrls}
                    onReferenceUrlsChange={setReferenceUrls}
                    vatRate={watchVatRate || 0}
                    renderAdditionalFields={() =>
                      config.renderAdditionalFields?.({ register, watch, setValue, mode })
                    }
                    internalCompanyId={internalCompanyId}
                    onInternalCompanyChange={config.type === "expense" ? setInternalCompanyId : undefined}
                    accessibleCompanies={accessibleCompanies.map(c => ({ id: c.id, name: c.name, code: c.code }))}
                    onAiSuggestAccount={(suggestion) => {
                      setAccountSuggestion({
                        accountId: suggestion.accountId,
                        accountCode: null,
                        accountName: null,
                        confidence: 80,
                        reason: "AI จำแนกจากรายละเอียด",
                        alternatives: suggestion.alternatives,
                      });
                    }}
                    isWht={watchIsWht || false}
                  />

                  {/* Contact Defaults Suggestion */}
                  {selectedContact && hasContactDefaults && contactDefaults && !defaultsSuggestionDismissed && (
                    <ContactDefaultsSuggestion
                      contactName={selectedContact.name}
                      defaults={contactDefaults}
                      onApply={applyContactDefaults}
                      onDismiss={() => setDefaultsSuggestionDismissed(true)}
                    />
                  )}

                  {/* Currency Conversion Note */}
                  {aiResult?.currencyConversion && (
                    <CurrencyConversionNote 
                      currencyConversion={aiResult.currencyConversion}
                      onRateChange={(newRate, newConvertedAmount) => {
                        // Update the amount field with new converted amount
                        setValue("amount", newConvertedAmount);
                        // Update the AI result with new rate
                        setAiResult((prev) => prev ? {
                          ...prev,
                          currencyConversion: {
                            ...prev.currencyConversion!,
                            exchangeRate: newRate,
                            convertedAmount: newConvertedAmount,
                            conversionNote: `แปลงจาก ${prev.currencyConversion?.currency} ${prev.currencyConversion?.originalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} @ ฿${newRate.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                          },
                        } : null);
                      }}
                    />
                  )}

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Tax & Amount Section */}
                  <TransactionAmountCard
                    mode={mode}
                    type={config.type}
                    amount={watchAmount || 0}
                    onAmountChange={(value) => setValue("amount", value)}
                    vatRate={watchVatRate || 0}
                    onVatRateChange={(value) => setValue("vatRate", value)}
                    vatAmount={calculation.vatAmount}
                    whtEnabled={watchIsWht || false}
                    onWhtToggle={handleWhtToggle}
                    whtRate={watchWhtRate}
                    whtType={watchWhtType}
                    onWhtRateSelect={(rate, type) => {
                      setValue("whtRate", rate);
                      setValue("whtType", type);
                    }}
                    whtAmount={calculation.whtAmount}
                    whtLabel={config.fields.whtField.label}
                    whtDescription={config.fields.whtField.description}
                    whtChangeInfo={whtChangeInfo}
                    documentType={(watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || "TAX_INVOICE"}
                    onDocumentTypeChange={config.type === "expense" ? handleDocumentTypeChange : undefined}
                    totalWithVat={calculation.totalWithVat}
                    netAmount={calculation.netAmount}
                    netAmountLabel={config.fields.netAmountLabel}
                  />

                  {/* Payer Section (expense only, create mode) */}
                  {config.type === "expense" && mode === "create" && (
                    <PayerSection
                      companyCode={companyCode}
                      totalAmount={calculation.netAmount}
                      mode={mode}
                      payers={payers}
                      onPayersChange={setPayers}
                    />
                  )}

                  {/* Notes (view/edit mode only) */}
                  {mode !== "create" && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                      {mode === "edit" ? (
                        <Textarea
                          {...register("notes")}
                          placeholder="เพิ่มหมายเหตุ..."
                          rows={2}
                          className="bg-muted/30 resize-none"
                        />
                      ) : (
                        <p className="text-base text-muted-foreground">
                          {(watch("notes") as string) || <span className="italic">ไม่มีหมายเหตุ</span>}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Right Column for CREATE mode */}
              <div className="lg:col-span-2">
                <InputMethodSection
                  key={filesInitialized ? "with-prefill" : "fresh"}
                  companyCode={companyCode}
                  transactionType={config.type}
                  onFilesChange={setCategorizedFiles}
                  onAiResult={handleAiResult}
                  showWhtCert={watchIsWht}
                  initialFiles={filesInitialized ? categorizedFiles : undefined}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={() => router.back()}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className={`flex-1 h-11 ${config.buttonColor}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  `บันทึก${config.title}`
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* VIEW/EDIT MODE - Separate Cards */}
        {mode !== "create" && transaction && (
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left Column: Main Info - PROMINENT */}
              <Card className="lg:col-span-3 shadow-lg border-border">
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <TransactionFieldsSection
                    config={fieldsConfig}
                    companyCode={companyCode}
                    mode={mode}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    contacts={contacts}
                    contactsLoading={contactsLoading}
                    selectedContact={selectedContact}
                    onContactSelect={(contact) => {
                      setSelectedContact(contact);
                      if (contact) setAiVendorSuggestion(null);
                    }}
                    onContactCreated={(contact) => {
                      refetchContacts();
                      setSelectedContact(contact);
                      setAiVendorSuggestion(null);
                    }}
                    oneTimeContactName={oneTimeContactName}
                    onOneTimeContactNameChange={setOneTimeContactName}
                    selectedAccount={selectedAccount}
                    onAccountChange={setSelectedAccount}
                    suggestedAccountId={
                      accountSuggestion?.accountId ||
                      aiResult?.aiAccountSuggestion?.accountId ||
                      undefined
                    }
                    suggestedAccountAlternatives={accountSuggestion?.alternatives}
                    aiVendorSuggestion={aiVendorSuggestion}
                    referenceUrls={referenceUrls}
                    onReferenceUrlsChange={mode === "edit" ? setReferenceUrls : undefined}
                    vatRate={watchVatRate || 0}
                    renderAdditionalFields={() =>
                      config.renderAdditionalFields?.({ register, watch, setValue, mode })
                    }
                    internalCompanyId={internalCompanyId}
                    onInternalCompanyChange={config.type === "expense" && mode === "edit" ? setInternalCompanyId : undefined}
                    accessibleCompanies={accessibleCompanies.map(c => ({ id: c.id, name: c.name, code: c.code }))}
                    onAiSuggestAccount={mode === "edit" ? (suggestion) => {
                      setAccountSuggestion({
                        accountId: suggestion.accountId,
                        accountCode: null,
                        accountName: null,
                        confidence: 80,
                        reason: "AI จำแนกจากรายละเอียด",
                        alternatives: suggestion.alternatives,
                      });
                    } : undefined}
                    isWht={watchIsWht || false}
                  />

                  <div className="border-t border-border" />

                  <TransactionAmountCard
                    mode={mode}
                    type={config.type}
                    amount={watchAmount || 0}
                    onAmountChange={(value) => setValue("amount", value)}
                    vatRate={watchVatRate || 0}
                    onVatRateChange={(value) => setValue("vatRate", value)}
                    vatAmount={calculation.vatAmount}
                    whtEnabled={watchIsWht || false}
                    onWhtToggle={handleWhtToggle}
                    whtRate={watchWhtRate}
                    whtType={watchWhtType}
                    onWhtRateSelect={(rate, type) => {
                      setValue("whtRate", rate);
                      setValue("whtType", type);
                    }}
                    whtAmount={calculation.whtAmount}
                    whtLabel={config.fields.whtField.label}
                    whtDescription={config.fields.whtField.description}
                    whtChangeInfo={whtChangeInfo}
                    documentType={(transaction?.documentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || (watchDocumentType as "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT") || "TAX_INVOICE"}
                    onDocumentTypeChange={config.type === "expense" && mode === "edit" ? handleDocumentTypeChange : undefined}
                    totalWithVat={calculation.totalWithVat}
                    netAmount={calculation.netAmount}
                    netAmountLabel={config.fields.netAmountLabel}
                  />

                  {/* Payer Section (expense only, view/edit mode) */}
                  {config.type === "expense" && (
                    <PayerSection
                      companyCode={companyCode}
                      totalAmount={calculation.netAmount}
                      mode={mode}
                      payers={payers}
                      onPayersChange={setPayers}
                    />
                  )}

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                    {mode === "edit" ? (
                      <Textarea
                        {...register("notes")}
                        placeholder="เพิ่มหมายเหตุ..."
                        rows={2}
                        className="bg-muted/30 resize-none"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {(watch("notes") as string) || <span className="italic">ไม่มีหมายเหตุ</span>}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Documents - SUBTLE */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-sm border-border bg-card">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      {config.type === "expense" ? "หลักฐานการจ่าย" : "หลักฐานการรับเงิน"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <DocumentSection
                      label={config.fileFields.slip.label}
                      urls={(transaction[config.fileFields.slip.urlsField] as string[]) || []}
                      onUpload={(file) => handleFileUploadWrapper(file, "slip")}
                      onDelete={(url) => handleDeleteFileWrapper("slip", url)}
                      isUploading={uploadingType === "slip"}
                      icon={<CreditCard className="h-4 w-4" />}
                    />
                    <DocumentSection
                      label={config.fileFields.invoice.label}
                      urls={(transaction[config.fileFields.invoice.urlsField] as string[]) || []}
                      onUpload={(file) => handleFileUploadWrapper(file, "invoice")}
                      onDelete={(url) => handleDeleteFileWrapper("invoice", url)}
                      isUploading={uploadingType === "invoice"}
                      icon={<FileText className="h-4 w-4" />}
                    />

                          {(transaction[config.fields.whtField.name] as boolean) && (
                            <DocumentSection
                              label={config.fileFields.wht.label}
                              urls={(transaction[config.fileFields.wht.urlsField] as string[]) || []}
                              onUpload={(file) => handleFileUploadWrapper(file, "wht")}
                              onDelete={(url) => handleDeleteFileWrapper("wht", url)}
                              isUploading={uploadingType === "wht"}
                              icon={<FileText className="h-4 w-4" />}
                            />
                          )}

                          <DocumentSection
                            label="เอกสารอื่นๆ"
                            urls={
                              ((transaction.otherDocUrls as any[]) || []).map((item: any) => 
                                typeof item === 'string' ? item : item.url
                              ).filter(Boolean)
                            }
                            onUpload={(file) => handleFileUploadWrapper(file, "other")}
                            onDelete={(url) => handleDeleteFileWrapper("other", url)}
                            isUploading={uploadingType === "other"}
                            icon={<FileText className="h-4 w-4" />}
                          />
                  </CardContent>

                  {/* Meta Info */}
                  <div className="px-6 py-4 border-t bg-muted/40 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        สร้างโดย
                      </span>
                      <span className="font-medium text-foreground">
                        {transaction.creator?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        วันที่สร้าง
                      </span>
                      <span>{new Date(transaction.createdAt).toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>
                </Card>

                {/* History */}
                <CombinedHistorySection
                  companyCode={companyCode}
                  companyId={transaction.companyId}
                  entityType={config.entityType}
                  entityId={transaction.id}
                  expenseId={config.type === "expense" ? transaction.id : undefined}
                  incomeId={config.type === "income" ? transaction.id : undefined}
                  refreshKey={auditRefreshKey}
                />

                {/* Comments */}
                {currentUserId && (
                  <Card className="shadow-sm border-border bg-card">
                    <CardContent className="pt-6">
                      <CommentSection
                        companyCode={companyCode}
                        entityType={config.type}
                        entityId={transaction.id}
                        currentUserId={currentUserId}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Merge Options Dialog */}
      {existingFormData && newAiData && (
        <MergeOptionsDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          existingData={existingFormData}
          newData={newAiData}
          onDecision={handleMergeDecision}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {pendingConflicts.length > 0 && (
        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflicts={pendingConflicts}
          onResolve={handleConflictResolution}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายการนี้ใช่หรือไม่? การลบสามารถกู้คืนได้โดยผู้ดูแลระบบ
              <br />
              {transaction && (
                <span className="font-medium text-foreground">
                  {(transaction[config.fields.descriptionField?.name || ""] as string) || config.title} -{" "}
                  {formatCurrency(transaction[config.fields.netAmountField] as number)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบรายการ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

