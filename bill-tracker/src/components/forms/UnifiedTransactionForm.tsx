"use client";

import { useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  LucideIcon,
  GraduationCap,
  Sparkles,
  Brain,
  ArrowLeft,
  Edit,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Receipt,
  FileText,
  CreditCard,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";

// Hooks
import { useContacts } from "@/hooks/use-contacts";
import { useTransactionFileUpload } from "@/hooks/use-transaction-file-upload";
import { useTransactionActions } from "@/hooks/use-transaction-actions";

// Shared form components
import { DocumentUploadSection, CategorizedFiles, MultiDocAnalysisResult } from "./shared/DocumentUploadSection";
import { MergeOptionsDialog, MergeData, MergeDecision } from "./shared/MergeOptionsDialog";
import { ConflictDialog, ConflictField, ConflictResolution, detectConflicts } from "./shared/ConflictDialog";
import { CurrencyConversionNote } from "./shared/CurrencyConversionNote";
import { TransactionFieldsSection, TransactionFieldsConfig } from "./shared/TransactionFieldsSection";
import { TransactionAmountCard } from "./shared/TransactionAmountCard";
import { DatePicker } from "./shared/DatePicker";

// Transaction components
import { StatusProgressBar, WorkflowProgressBar, WorkflowCard, DocumentSection, TransactionDetailSkeleton, CombinedHistorySection, WorkflowActions } from "@/components/transactions";
// AuditHistorySection is now part of CombinedHistorySection

// Types & Constants
import type { ContactSummary } from "@/types";
import { StatusInfo, EXPENSE_WORKFLOW_INFO, INCOME_WORKFLOW_INFO } from "@/lib/constants/transaction";

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
}

interface BaseTransaction {
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
  // Workflow fields
  workflowStatus?: string;
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  hasInvoice?: boolean;
  isWht?: boolean;
  isWhtDeducted?: boolean;
  [key: string]: unknown;
}

// =============================================================================
// Auto-Learn Types & Logic
// =============================================================================

const AUTO_LEARN_THRESHOLD = 80;
const MIN_LEARN_THRESHOLD = 50;

function decideToLearn(
  confidence: number,
  hasVendorIdentifier: boolean,
  existingMappingId: string | null
) {
  if (existingMappingId) {
    return { shouldLearn: false, confidence, reason: "มี mapping อยู่แล้ว", suggestAsk: false };
  }
  if (!hasVendorIdentifier) {
    return { shouldLearn: false, confidence: 0, reason: "ไม่มีข้อมูลร้านค้า", suggestAsk: false };
  }
  if (confidence < MIN_LEARN_THRESHOLD) {
    return { shouldLearn: false, confidence, reason: "ความมั่นใจต่ำเกินไป", suggestAsk: false };
  }
  if (confidence >= AUTO_LEARN_THRESHOLD) {
    return { shouldLearn: true, confidence, reason: "ความมั่นใจสูง - เรียนรู้อัตโนมัติ", suggestAsk: false };
  }
  return { shouldLearn: true, confidence, reason: "ความมั่นใจปานกลาง - ควรถามผู้ใช้ก่อน", suggestAsk: true };
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
}: UnifiedTransactionFormProps) {
  const router = useRouter();
  // Use mode from props directly (controlled by parent)
  const [isLoading, setIsLoading] = useState(false);
  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const [loading, setLoading] = useState(mode !== "create");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    uncategorized: [],
  });

  // AI Analysis State
  const [aiResult, setAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  // Merge Dialog State
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState<MultiDocAnalysisResult | null>(null);
  const [existingFormData, setExistingFormData] = useState<MergeData | null>(null);
  const [newAiData, setNewAiData] = useState<MergeData | null>(null);

  // Conflict Dialog State
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictField[]>([]);
  const [pendingMergedData, setPendingMergedData] = useState<MergeData | null>(null);

  // Contacts
  const { contacts, isLoading: contactsLoading, refetch: refetchContacts } = useContacts(companyCode);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [oneTimeContactName, setOneTimeContactName] = useState("");
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);

  // AI Vendor Suggestion (for auto-creating contact)
  const [aiVendorSuggestion, setAiVendorSuggestion] = useState<{
    name: string;
    taxId?: string | null;
    branchNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);

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
    source: "learned" | "ai" | "none";
    useCount?: number;
    suggestNewAccount?: {
      code: string;
      name: string;
      class: string;
      description: string;
      keywords: string[];
      reason: string;
    };
  } | null>(null);
  const [isSuggestingAccount, setIsSuggestingAccount] = useState(false);

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
          uncategorized: [],
        };
        setCategorizedFiles(initialFiles);
        setFilesInitialized(true);
        console.log("UnifiedTransactionForm files set to:", initialFiles);
      }
    }
  }, [mode, config.defaultValues]);

  // Fetch transaction for view/edit mode
  const fetchTransaction = useCallback(async () => {
    if (mode === "create" || !transactionId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${config.apiEndpoint}/${transactionId}`);
      if (!res.ok) throw new Error(`Failed to fetch ${config.type}`);
      const result = await res.json();
      const data = result.data?.[config.type] || result[config.type];
      setTransaction(data);
      
      // Populate form with transaction data
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
          [config.fields.dateField.name]: data[config.fields.dateField.name] ? new Date(data[config.fields.dateField.name]) : undefined,
          ...(config.fields.descriptionField ? { [config.fields.descriptionField.name]: data[config.fields.descriptionField.name] } : {}),
          ...(config.showDueDate ? { dueDate: data.dueDate ? new Date(data.dueDate) : undefined } : {}),
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

        // Set categorized files
        setCategorizedFiles({
          invoice: data[config.fileFields.invoice.urlsField] || [],
          slip: data[config.fileFields.slip.urlsField] || [],
          whtCert: data[config.fileFields.wht.urlsField] || [],
          uncategorized: [],
        });
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
    handleNextStatus: nextStatus,
    handlePreviousStatus: prevStatus,
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

  // Fetch transaction on mount for view/edit mode
  useEffect(() => {
    if (mode !== "create") {
      fetchTransaction();
    }
  }, [fetchTransaction, mode]);

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

  // Extract current form data as MergeData
  const extractFormData = useCallback((): MergeData => {
    return {
      amount: watchAmount ? Number(watchAmount) : null,
      vatAmount: calculation.vatAmount || null,
      vatRate: watchVatRate || null,
      vendorName: selectedContact?.name || null,
      vendorTaxId: selectedContact?.taxId || null,
      contactId: selectedContact?.id || null,
      date: watchDate ? new Date(watchDate as string).toISOString() : null,
      invoiceNumber: (watch("invoiceNumber") as string) || null,
      description: config.fields.descriptionField
        ? (watch(config.fields.descriptionField.name) as string) || null
        : null,
      accountId: selectedAccount || null,
      paymentMethod: (watch("paymentMethod") as string) || null,
    };
  }, [watchAmount, calculation.vatAmount, watchVatRate, selectedContact, watchDate, watch, config, selectedAccount]);

  // Extract AI result as MergeData
  const extractAiData = useCallback(
    (result: MultiDocAnalysisResult): MergeData => {
      if (!result) {
        return {
          amount: null,
          vatAmount: null,
          vatRate: null,
          vendorName: null,
          vendorTaxId: null,
          contactId: null,
          date: null,
          invoiceNumber: null,
          description: null,
          accountId: null,
          paymentMethod: null,
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
        paymentMethod?: string | null;
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
        vendorName,
        vendorTaxId: combined.vendorTaxId || (suggested.vendorTaxId as string) || null,
        contactId: (suggested.contactId as string) || null,
        date: combined.date || (suggested.date as string) || null,
        invoiceNumber: combined.invoiceNumbers?.[0] || null,
        description,
        accountId: (suggested.accountId as string) || null,
        paymentMethod: (suggested.paymentMethod as string) || extendedCombined.paymentMethod || null,
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
    [hasExistingData, extractFormData, extractAiData]
  );

  // Apply AI data to form
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
        paymentMethod?: string | null;
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

      // Apply payment method
      const paymentMethod = suggested.paymentMethod || extendedCombined.paymentMethod;
      if (paymentMethod) {
        setValue("paymentMethod", paymentMethod);
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
        // AI detected a new vendor - show suggestion to create contact
        setAiVendorSuggestion({
          name: combined.vendorName || "",
          taxId: combined.vendorTaxId,
          branchNumber: extendedCombined.vendorBranchNumber ?? null,
          address: null, // Could be extracted from vendorAddress if available
          phone: null,
          email: extendedCombined.vendorEmail ?? null,
        });
      }

      // Apply account
      if (suggested.accountId) {
        setSelectedAccount(suggested.accountId as string);
      } else if (
        result.smart?.aiAccountSuggestion?.accountId &&
        result.smart.aiAccountSuggestion.confidence >= 70
      ) {
        setSelectedAccount(result.smart.aiAccountSuggestion.accountId);
        setPendingAccountId(result.smart.aiAccountSuggestion.accountId);
      }

      // Apply WHT (Withholding Tax) from AI
      const whtRate = (suggested.whtRate as number | null | undefined) ?? extendedCombined.whtRate;
      const whtType = (suggested.whtType as string | null | undefined) ?? extendedCombined.whtType;
      if (whtRate !== null && whtRate !== undefined && whtRate > 0) {
        // Enable WHT toggle
        setValue(config.fields.whtField.name, true);
        setValue("whtRate", whtRate);
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
    [setValue, config, contacts]
  );

  // AI Account Suggestion
  const suggestAccount = useCallback(async () => {
    const vendorName = selectedContact?.name || null;
    const descFieldName = config.fields.descriptionField?.name || "description";
    const description = (watch(descFieldName) as string) || null;

    const allFileUrls = [
      ...categorizedFiles.invoice,
      ...categorizedFiles.slip,
      ...categorizedFiles.whtCert,
      ...categorizedFiles.uncategorized,
    ].filter(Boolean);

    if (!vendorName && !description && allFileUrls.length === 0) {
      toast.error("กรุณาเลือกผู้ติดต่อ กรอกรายละเอียด หรือแนบไฟล์ก่อน");
      return;
    }

    setIsSuggestingAccount(true);
    setAccountSuggestion(null);

    try {
      const response = await fetch(`/api/${companyCode.toLowerCase()}/ai/suggest-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: config.type.toUpperCase(),
          vendorName,
          description,
          imageUrls: allFileUrls.slice(0, 1),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถแนะนำบัญชีได้");
      }

      const suggestion = result.data;
      setAccountSuggestion(suggestion);

      if (suggestion.accountId && suggestion.confidence >= 70) {
        setSelectedAccount(suggestion.accountId);

        if (suggestion.source === "learned") {
          toast.success(`🤖 AI จำได้! "${suggestion.accountCode} ${suggestion.accountName}"`, {
            description: `เคยใช้งาน ${suggestion.useCount || 0} ครั้ง`,
          });
        } else {
          toast.success(`✨ AI วิเคราะห์: "${suggestion.accountCode} ${suggestion.accountName}"`, {
            description: suggestion.reason,
          });
        }
      } else if (suggestion.accountId) {
        toast.info("AI แนะนำบัญชี", {
          description: `${suggestion.accountCode} ${suggestion.accountName} (${suggestion.confidence}%) - ${suggestion.reason}`,
        });
      } else if (suggestion.suggestNewAccount) {
        toast.info("💡 AI แนะนำสร้างบัญชีใหม่", {
          description: `${suggestion.suggestNewAccount.code} ${suggestion.suggestNewAccount.name}`,
        });
      } else {
        toast.warning("AI ไม่พบบัญชีที่เหมาะสม", {
          description: suggestion.reason || "กรุณาเลือกบัญชีเอง หรือสร้างบัญชีใหม่",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSuggestingAccount(false);
    }
  }, [selectedContact, config, companyCode, watch, categorizedFiles]);

  // Handle merge decision
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
    [existingFormData, newAiData, pendingAiResult]
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
    [pendingMergedData, existingFormData, newAiData, pendingAiResult]
  );

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
      if (data.paymentMethod) {
        setValue("paymentMethod", data.paymentMethod);
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
    [setValue, config, contacts]
  );

  // Handle form submit (create mode)
  const onSubmit = async (data: Record<string, unknown>) => {
    // Validation
    const validationErrors: string[] = [];
    const hasValidContact = selectedContact?.id || oneTimeContactName.trim();
    if (!hasValidContact) validationErrors.push("กรุณาระบุผู้ติดต่อ");
    if (!selectedAccount) validationErrors.push("กรุณาเลือกบัญชี");
    if (!data.status) validationErrors.push("กรุณาเลือกสถานะเอกสาร");

    const descriptionValue = config.fields.descriptionField
      ? data[config.fields.descriptionField.name]
      : null;
    if (config.fields.descriptionField && (!descriptionValue || (descriptionValue as string).trim() === "")) {
      validationErrors.push("กรุณาระบุรายละเอียด");
    }
    if (!data.amount || (data.amount as number) <= 0) {
      validationErrors.push("กรุณาระบุจำนวนเงิน");
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "));
      return;
    }

    setIsLoading(true);
    try {
      const fileData = {
        [config.documentConfig.fields.slip]: categorizedFiles.slip,
        [config.documentConfig.fields.invoice]: categorizedFiles.invoice,
        [config.documentConfig.fields.whtCert]: categorizedFiles.whtCert,
      };

      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyCode: companyCode.toUpperCase(),
          contactId: selectedContact?.id || null,
          contactName: !selectedContact?.id && oneTimeContactName.trim() ? oneTimeContactName.trim() : null,
          accountId: selectedAccount,
          category: undefined,
          vatAmount: calculation.vatAmount,
          whtAmount: calculation.whtAmount,
          [config.fields.netAmountField]: calculation.netAmount,
          ...fileData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      // Auto-learn vendor mapping
      const vendorName = aiResult?.combined?.vendorName || selectedContact?.name || null;
      const vendorTaxId = aiResult?.combined?.vendorTaxId || selectedContact?.taxId || null;
      const hasVendorIdentifier = !!(vendorName || vendorTaxId);
      const existingMappingId = aiResult?.smart?.mapping?.id || null;
      const shouldAutoLearn = hasVendorIdentifier && selectedContact?.id;

      if (shouldAutoLearn && !existingMappingId) {
        try {
          const learnResponse = await fetch("/api/vendor-mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyCode: companyCode.toUpperCase(),
              transactionType: config.type.toUpperCase(),
              vendorName,
              vendorTaxId,
              contactId: selectedContact.id,
              accountId: selectedAccount,
              defaultVatRate: watchVatRate,
              paymentMethod: watch("paymentMethod"),
              learnSource: "AUTO",
            }),
          });

          if (learnResponse.ok) {
            toast.success(`บันทึก${config.title}สำเร็จ`, {
              description: `AI จดจำ "${vendorName}" แล้ว`,
            });
          } else {
            toast.success(`บันทึก${config.title}สำเร็จ`);
          }
        } catch {
          toast.success(`บันทึก${config.title}สำเร็จ`);
        }

        router.push(config.redirectPath);
        router.refresh();
        return;
      }

      toast.success(`บันทึก${config.title}สำเร็จ`);
      router.push(config.redirectPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save (edit mode)
  const handleSave = async () => {
    if (!transaction) return;

    try {
      setSaving(true);
      const formData = watch();
      const whtEnabled = formData[config.fields.whtField.name] as boolean;
      const calc = config.calculateTotals(
        Number(formData.amount) || 0,
        Number(formData.vatRate) || 0,
        whtEnabled ? Number(formData.whtRate) || 0 : 0
      );

      const res = await fetch(`${config.apiEndpoint}/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contactId: selectedContact?.id || null,
          accountId: selectedAccount || null,
          amount: Number(formData.amount),
          vatRate: Number(formData.vatRate),
          vatAmount: calc.vatAmount,
          whtRate: whtEnabled ? Number(formData.whtRate) : null,
          whtAmount: whtEnabled ? calc.whtAmount : null,
          [config.fields.netAmountField]: calc.netAmount,
        }),
      });

      if (!res.ok) throw new Error(`Failed to update ${config.type}`);

      const result = await res.json();
      const updatedData = result.data?.[config.type] || result[config.type];
      setTransaction(updatedData);
      onModeChange?.("view");
      setAuditRefreshKey((prev) => prev + 1);
      toast.success("บันทึกการแก้ไขสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  // Mode change handlers
  const handleEditClick = () => {
    onModeChange?.("edit");
  };

  const handleCancelEdit = () => {
    onModeChange?.("view");
    if (transaction) {
      reset({
        amount: transaction.amount,
        vatRate: transaction.vatRate,
        [config.fields.whtField.name]: transaction[config.fields.whtField.name],
        whtRate: transaction.whtRate,
        whtType: transaction.whtType,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        invoiceNumber: transaction.invoiceNumber,
        referenceNo: transaction.referenceNo,
        notes: transaction.notes,
        [config.fields.dateField.name]: transaction[config.fields.dateField.name]
          ? new Date(transaction[config.fields.dateField.name] as string)
          : undefined,
        ...(config.fields.descriptionField
          ? { [config.fields.descriptionField.name]: transaction[config.fields.descriptionField.name] }
          : {}),
      });
    }
  };

  // Status navigation wrappers
  const handleNextStatus = () => {
    if (!transaction) return;
    nextStatus(transaction.status, transaction);
  };

  const handlePreviousStatus = () => {
    if (!transaction) return;
    prevStatus(transaction.status, transaction);
  };

  // File upload wrappers for view/edit mode
  const handleFileUploadWrapper = async (file: File, type: "slip" | "invoice" | "wht") => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    await handleFileUpload(file, type, currentUrls, transaction);
  };

  const handleDeleteFileWrapper = async (type: "slip" | "invoice" | "wht", urlToDelete: string) => {
    if (!transaction) return;
    const currentUrls: Record<string, string[]> = {};
    Object.entries(config.fileFields).forEach(([key, field]) => {
      currentUrls[field.urlsField] = (transaction[field.urlsField] as string[]) || [];
    });
    await handleDeleteFile(type, urlToDelete, currentUrls, transaction);
  };

  // Status helpers
  const getCurrentStatusIndex = () =>
    transaction ? config.statusFlow.indexOf(transaction.status) : -1;

  const getNextStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx === -1 || idx >= config.statusFlow.length - 1) return null;
    return config.statusInfo[config.statusFlow[idx + 1]];
  };

  const getPreviousStatusInfo = () => {
    const idx = getCurrentStatusIndex();
    if (idx <= 0) return null;
    return config.statusInfo[config.statusFlow[idx - 1]];
  };

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
        <Link href={`/${companyCode}/${config.listUrl}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้า{config.title}
          </Button>
        </Link>
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
  const nextStatusInfo = getNextStatusInfo();
  const previousStatusInfo = getPreviousStatusInfo();

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
        <div className="max-w-6xl mx-auto pb-24">
          {/* Deleted Warning Banner */}
          {isDeleted && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">รายการนี้ถูกลบแล้ว</p>
                <p className="text-sm text-muted-foreground">
                  ลบเมื่อ {new Date(transaction.deletedAt as string).toLocaleString("th-TH")}
                  {transaction.deletedByUser && ` โดย ${transaction.deletedByUser.name}`}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-3 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link href={`/${companyCode}/${config.listUrl}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("shrink-0 -ml-2 rounded-full", config.iconColor)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                    {config.title}
                    {statusInfo && (
                      <Badge className={cn("text-xs shrink-0", statusInfo.bgColor, statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    )}
                  </h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(transaction[config.fields.dateField.name] as string).toLocaleDateString(
                      "th-TH",
                      { day: "numeric", month: "long", year: "numeric" }
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isDeleted ? (
                  <Badge variant="destructive" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    ถูกลบแล้ว
                  </Badge>
                ) : mode === "edit" ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                      <X className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">ยกเลิก</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                      ) : (
                        <Save className="h-4 w-4 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">บันทึก</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    {previousStatusInfo && (
                      <Button variant="outline" size="sm" onClick={handlePreviousStatus} disabled={saving}>
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">ย้อนสถานะ</span>
                      </Button>
                    )}
                    {nextStatusInfo && (
                      <Button
                        size="sm"
                        onClick={handleNextStatus}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {saving && <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />}
                        <span className="hidden sm:inline">{nextStatusInfo.label}</span>
                        <span className="sm:hidden">ถัดไป</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleEditClick}>
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">ลบ</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Progress - Show only for legacy status (no workflowStatus) */}
          {!transaction.workflowStatus && transaction.status && (
            <StatusProgressBar
              statusFlow={config.statusFlow}
              statusInfo={config.statusInfo}
              currentStatus={transaction.status}
              className="mb-6"
            />
          )}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={mode === "create" ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
        <div className={mode !== "create" ? "max-w-6xl mx-auto" : ""}>
          <Card className="border-border/50 shadow-card">
            {mode === "create" && (
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className={`p-2 rounded-xl ${config.iconColor}`}>
                    <config.icon className="h-5 w-5" />
                  </div>
                  {config.title}
                </CardTitle>
              </CardHeader>
            )}

            <CardContent className={mode === "create" ? "p-0" : ""}>
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Left Column (3/5): Main Info + Amount */}
                <div className="lg:col-span-3 space-y-6 p-6">
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
                        setAiVendorSuggestion(null); // Clear suggestion when contact is selected
                      }
                    }}
                    onContactCreated={(contact) => {
                      refetchContacts();
                      setSelectedContact(contact);
                      setAiVendorSuggestion(null); // Clear suggestion when contact is created
                    }}
                    oneTimeContactName={oneTimeContactName}
                    onOneTimeContactNameChange={setOneTimeContactName}
                    selectedAccount={selectedAccount}
                    onAccountChange={setSelectedAccount}
                    suggestedAccountId={
                      accountSuggestion?.accountId ||
                      aiResult?.smart?.aiAccountSuggestion?.accountId ||
                      undefined
                    }
                    suggestNewAccount={aiResult?.smart?.suggestNewAccount || undefined}
                    onSuggestAccount={suggestAccount}
                    isSuggestingAccount={isSuggestingAccount}
                    accountSuggestionSource={accountSuggestion?.source}
                    aiVendorSuggestion={aiVendorSuggestion}
                    renderAdditionalFields={() =>
                      config.renderAdditionalFields?.({ register, watch, setValue, mode })
                    }
                  />

                  {/* Currency Conversion Note */}
                  {aiResult?.currencyConversion && (
                    <CurrencyConversionNote currencyConversion={aiResult.currencyConversion} />
                  )}

                  <Separator />

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
                    onWhtToggle={(enabled) => {
                      setValue(config.fields.whtField.name, enabled);
                      if (!enabled) {
                        setValue("whtRate", undefined);
                        setValue("whtType", undefined);
                      }
                    }}
                    whtRate={watchWhtRate}
                    whtType={watchWhtType}
                    onWhtRateSelect={(rate, type) => {
                      setValue("whtRate", rate);
                      setValue("whtType", type);
                    }}
                    whtAmount={calculation.whtAmount}
                    whtLabel={config.fields.whtField.label}
                    whtDescription={config.fields.whtField.description}
                    totalWithVat={calculation.totalWithVat}
                    netAmount={calculation.netAmount}
                    netAmountLabel={config.fields.netAmountLabel}
                  />

                  {/* Notes (view/edit mode only) */}
                  {mode !== "create" && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">หมายเหตุ</Label>
                      {mode === "edit" ? (
                        <Textarea
                          {...register("notes")}
                          placeholder="เพิ่มหมายเหตุ..."
                          rows={3}
                          className="bg-muted/30 resize-none"
                        />
                      ) : (
                        <p className="text-sm p-3 rounded-lg bg-muted/30 min-h-[60px] whitespace-pre-wrap">
                          {(watch("notes") as string) || (
                            <span className="text-muted-foreground italic">ไม่มีหมายเหตุ</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column (2/5): Documents */}
                <div className="lg:col-span-2 bg-muted/20 lg:border-l p-6 space-y-4">
                  {/* Create mode: Full AI OCR upload */}
                  {mode === "create" && (
                    <DocumentUploadSection
                      key={filesInitialized ? "with-prefill" : "fresh"}
                      companyCode={companyCode}
                      transactionType={config.type}
                      onFilesChange={setCategorizedFiles}
                      onAiResult={handleAiResult}
                      showWhtCert={watchIsWht}
                      initialFiles={filesInitialized ? categorizedFiles : undefined}
                    />
                  )}

                  {/* View/Edit mode: Document display with upload capability */}
                  {(mode === "view" || mode === "edit") && transaction && (
                    <>
                      {/* Workflow Status & Actions - New UI */}
                      {transaction.workflowStatus && (
                        <WorkflowCard
                          companyCode={companyCode}
                          type={config.type}
                          transactionId={transaction.id}
                          currentStatus={transaction.workflowStatus}
                          isWht={config.type === "expense" ? transaction.isWht : transaction.isWhtDeducted}
                          onActionComplete={() => {
                            fetchTransaction();
                            setAuditRefreshKey((k) => k + 1);
                          }}
                        />
                      )}

                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            {config.type === "expense" ? "หลักฐานการจ่าย" : "หลักฐานการรับเงิน"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                        </CardContent>

                        {/* Meta Info */}
                        <div className="px-6 py-4 border-t bg-muted/30 text-xs text-muted-foreground space-y-2">
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

                      {/* Combined History (Document Events + Audit Logs) */}
                      <CombinedHistorySection
                        companyCode={companyCode}
                        companyId={transaction.companyId}
                        entityType={config.entityType}
                        entityId={transaction.id}
                        expenseId={config.type === "expense" ? transaction.id : undefined}
                        incomeId={config.type === "income" ? transaction.id : undefined}
                        refreshKey={auditRefreshKey}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardContent>

            {/* Footer (create mode only) */}
            {mode === "create" && (
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
            )}
          </Card>
        </div>
      </form>

      {/* Train AI Dialog */}
      <Dialog open={showTrainDialog} onOpenChange={setShowTrainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              สอน AI ให้จดจำร้านค้านี้?
            </DialogTitle>
            <DialogDescription>
              {aiResult?.combined?.vendorName && (
                <span className="block mt-2">
                  AI จะจดจำ <strong>&ldquo;{aiResult.combined.vendorName}&rdquo;</strong> เพื่อกรอกข้อมูลอัตโนมัติ
                  <br />
                  <span className="text-xs text-muted-foreground">(ผู้ติดต่อ, บัญชี, VAT, วิธีชำระเงิน)</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium">ข้อมูลที่ AI จะจดจำ:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {aiResult?.combined?.vendorName && (
                  <li>• ชื่อร้าน: {aiResult.combined.vendorName}</li>
                )}
                {aiResult?.combined?.vendorTaxId && (
                  <li>• เลขผู้เสียภาษี: {aiResult.combined.vendorTaxId}</li>
                )}
                {selectedContact && <li>• ผู้ติดต่อ: {selectedContact.name}</li>}
                {selectedAccount && <li>• บัญชี: {selectedAccount}</li>}
                {watchVatRate !== undefined && <li>• VAT: {watchVatRate}%</li>}
                {(watch("paymentMethod") as string) && <li>• วิธีชำระเงิน: {watch("paymentMethod") as string}</li>}
              </ul>
              <p className="text-xs text-green-600 mt-2">
                ✅ ครั้งหน้าจะกรอกข้อมูลนี้ให้อัตโนมัติ
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTrainDialog(false);
                toast.success(`บันทึก${config.title}สำเร็จ`);
                router.push(config.redirectPath);
                router.refresh();
              }}
              disabled={isTraining}
            >
              ข้าม
            </Button>
            <Button
              onClick={async () => {
                if (!aiResult) return;
                setIsTraining(true);
                try {
                  const { combined } = aiResult;
                  let descriptionTemplate: string | undefined;
                  if (config.fields.descriptionField) {
                    const currentDescription = watch(config.fields.descriptionField.name) as string;
                    if (currentDescription?.trim()) {
                      descriptionTemplate = currentDescription.trim();
                    } else {
                      const prefix = config.type === "expense" ? "ค่าใช้จ่ายจาก" : "รายรับจาก";
                      descriptionTemplate = `${prefix} {vendorName}`;
                    }
                  }

                  const response = await fetch("/api/vendor-mappings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      companyCode: companyCode.toUpperCase(),
                      transactionType: config.type.toUpperCase(),
                      vendorName: combined.vendorName,
                      vendorTaxId: combined.vendorTaxId,
                      contactId: selectedContact?.id,
                      accountId: selectedAccount,
                      defaultVatRate: watchVatRate,
                      paymentMethod: watch("paymentMethod"),
                      descriptionTemplate,
                      learnSource: "FEEDBACK",
                    }),
                  });

                  const result = await response.json();
                  if (!response.ok) {
                    throw new Error(result.error || "การสอน AI ล้มเหลว");
                  }

                  toast.success("สอน AI สำเร็จ!", {
                    description: `AI จะจดจำผู้ติดต่อ บัญชี VAT และวิธีชำระเงิน`,
                  });

                  setShowTrainDialog(false);
                  toast.success(`บันทึก${config.title}สำเร็จ`);
                  router.push(config.redirectPath);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
                } finally {
                  setIsTraining(false);
                }
              }}
              disabled={isTraining}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  สอน AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// =============================================================================
// Workflow Status Display Component
// =============================================================================

const EXPENSE_WORKFLOW_LABELS: Record<string, { label: string; color: string; step: number }> = {
  PAID: { label: "จ่ายเงินแล้ว", color: "bg-blue-500", step: 1 },
  WAITING_TAX_INVOICE: { label: "รอใบกำกับ", color: "bg-orange-500", step: 1 },
  TAX_INVOICE_RECEIVED: { label: "ได้ใบกำกับแล้ว", color: "bg-green-500", step: 2 },
  WHT_PENDING_ISSUE: { label: "รอออกใบ 50 ทวิ", color: "bg-amber-500", step: 3 },
  WHT_ISSUED: { label: "ออกใบ 50 ทวิแล้ว", color: "bg-green-500", step: 3 },
  WHT_SENT_TO_VENDOR: { label: "ส่ง 50 ทวิแล้ว", color: "bg-green-500", step: 3 },
  READY_FOR_ACCOUNTING: { label: "รอส่งบัญชี", color: "bg-purple-500", step: 4 },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชีแล้ว", color: "bg-green-500", step: 5 },
  COMPLETED: { label: "เสร็จสิ้น", color: "bg-green-600", step: 5 },
};

const INCOME_WORKFLOW_LABELS: Record<string, { label: string; color: string; step: number }> = {
  RECEIVED: { label: "รับเงินแล้ว", color: "bg-blue-500", step: 1 },
  NO_INVOICE_NEEDED: { label: "ไม่ต้องออกบิล", color: "bg-gray-500", step: 2 },
  WAITING_INVOICE_ISSUE: { label: "รอออกบิล", color: "bg-orange-500", step: 2 },
  INVOICE_ISSUED: { label: "ออกบิลแล้ว", color: "bg-green-500", step: 2 },
  INVOICE_SENT: { label: "ส่งบิลแล้ว", color: "bg-green-500", step: 2 },
  WHT_PENDING_CERT: { label: "รอใบ 50 ทวิ", color: "bg-amber-500", step: 3 },
  WHT_CERT_RECEIVED: { label: "ได้ใบ 50 ทวิแล้ว", color: "bg-green-500", step: 3 },
  READY_FOR_ACCOUNTING: { label: "รอส่งบัญชี", color: "bg-purple-500", step: 4 },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชีแล้ว", color: "bg-green-500", step: 5 },
  COMPLETED: { label: "เสร็จสิ้น", color: "bg-green-600", step: 5 },
};

interface WorkflowStatusDisplayProps {
  type: "expense" | "income";
  status: string;
  hasTaxInvoice?: boolean;
  hasWhtCert?: boolean;
  hasInvoice?: boolean;
  isWht?: boolean;
}

function WorkflowStatusDisplay({
  type,
  status,
  hasTaxInvoice,
  hasWhtCert,
  hasInvoice,
  isWht,
}: WorkflowStatusDisplayProps) {
  const labels = type === "expense" ? EXPENSE_WORKFLOW_LABELS : INCOME_WORKFLOW_LABELS;
  const current = labels[status] || { label: status, color: "bg-gray-500", step: 0 };

  // Build checklist based on type
  const checklist = type === "expense" ? [
    { label: "ใบกำกับภาษี", checked: hasTaxInvoice },
    ...(isWht ? [{ label: "ใบ 50 ทวิ (ออกให้ vendor)", checked: hasWhtCert }] : []),
  ] : [
    { label: "ใบกำกับภาษี (ออกให้ลูกค้า)", checked: hasInvoice },
    ...(isWht ? [{ label: "ใบ 50 ทวิ (จากลูกค้า)", checked: hasWhtCert }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Current Status Badge */}
      <div className="flex items-center gap-3">
        <Badge className={`${current.color} text-white`}>
          {current.label}
        </Badge>
        {current.step < 5 && (
          <span className="text-sm text-muted-foreground">
            ขั้นตอนที่ {current.step} / 5
          </span>
        )}
      </div>

      {/* Document Checklist */}
      {checklist.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">เอกสาร:</p>
          <div className="flex flex-wrap gap-2">
            {checklist.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                  item.checked 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                )}
              >
                {item.checked ? "✓" : "○"}
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
