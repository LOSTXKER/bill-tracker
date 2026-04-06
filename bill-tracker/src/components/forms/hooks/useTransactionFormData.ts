"use client";

/**
 * useTransactionFormData
 *
 * Encapsulates all data-loading effects for UnifiedTransactionForm:
 *  - Companies fetch (for internalCompanyId selector)
 *  - Payers initialisation from reimbursement defaults (create mode)
 *  - Create-mode file pre-population from config.defaultValues
 *  - Form population from SWR transaction data (view/edit mode)
 *  - Payers fetch from API (view/edit mode)
 *  - refreshAll helper
 *
 * File upload/delete wrappers are intentionally kept in the main component
 * to avoid a circular dependency (they need refreshAll, refreshAll needs mutate).
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { normalizeOtherDocs, type CategorizedFiles } from "../shared/InputMethodSection";
import type { PayerInfo } from "../shared/PayerSection";
import type { UnifiedTransactionConfig } from "../UnifiedTransactionForm";
import type { BaseTransaction } from "./useTransactionForm";
import type { ContactFormState } from "./useTransactionFormState";
import type { CurrencyConversionValue } from "../CreateModeContent";
import { useSafeCompany } from "@/hooks/use-company";

interface AiStatePatch {
  currencyConversion?: CurrencyConversionValue | null;
}

interface UseTransactionFormDataOptions {
  config: UnifiedTransactionConfig;
  companyCode: string;
  mode: "create" | "view" | "edit";
  transactionId?: string;
  swrTransaction: unknown;
  patchContactState: (patch: Partial<ContactFormState>) => void;
  patchAiState: (patch: AiStatePatch) => void;
  setSelectedAccount: (id: string | null) => void;
  setSelectedCategory: (id: string | null) => void;
  setInternalCompanyId: (id: string | null) => void;
  reset: (values: Record<string, unknown>) => void;
  mutateTransaction: () => Promise<unknown>;
}

interface UseTransactionFormDataReturn {
  transaction: BaseTransaction | null;
  setTransaction: Dispatch<SetStateAction<BaseTransaction | null>>;
  payers: PayerInfo[];
  setPayers: Dispatch<SetStateAction<PayerInfo[]>>;
  categorizedFiles: CategorizedFiles;
  setCategorizedFiles: Dispatch<SetStateAction<CategorizedFiles>>;
  filesInitialized: boolean;
  accessibleCompanies: Array<{ id: string; name: string; code: string }>;
  auditRefreshKey: number;
  setAuditRefreshKey: Dispatch<SetStateAction<number>>;
  /** Call this after any mutation to re-fetch transaction data and refresh the page. */
  refreshAll: () => Promise<void>;
}

export function useTransactionFormData({
  config,
  mode,
  transactionId,
  swrTransaction,
  patchContactState,
  patchAiState,
  setSelectedAccount,
  setSelectedCategory,
  setInternalCompanyId,
  reset,
  mutateTransaction,
}: UseTransactionFormDataOptions): UseTransactionFormDataReturn {
  const router = useRouter();
  const { companies: contextCompanies } = useSafeCompany();

  const [transaction, setTransaction] = useState<BaseTransaction | null>(null);
  const [payers, setPayers] = useState<PayerInfo[]>([]);
  const [payersInitialized, setPayersInitialized] = useState(false);
  const [categorizedFiles, setCategorizedFiles] = useState<CategorizedFiles>({
    invoice: [],
    slip: [],
    whtCert: [],
    other: [],
    uncategorized: [],
  });
  const [filesInitialized, setFilesInitialized] = useState(false);
  const filesInitRef = useRef(false);
  const [formPopulated, setFormPopulated] = useState(false);
  const [fetchedCompanies, setFetchedCompanies] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const accessibleCompanies =
    contextCompanies.length > 0 ? contextCompanies : fetchedCompanies;

  // ---------------------------------------------------------------------------
  // Companies fetch (expense only, when context is empty)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (config.type === "expense" && contextCompanies.length === 0) {
      fetch("/api/companies")
        .then((res) => res.json())
        .then((result) => {
          const companies = result.data?.companies || [];
          setFetchedCompanies(
            companies.map((c: { id: string; name: string; code: string }) => ({
              id: c.id,
              name: c.name,
              code: c.code,
            }))
          );
        })
        .catch(() => {});
    }
  }, [config.type, contextCompanies.length]);

  // ---------------------------------------------------------------------------
  // Payers initialisation from reimbursement prefill (create mode)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === "create" && config.type === "expense" && !payersInitialized) {
      const requesterInfo = config.defaultValues.requesterInfo as
        | { id?: string; name?: string }
        | undefined;
      const settlementInfo = config.defaultValues.settlementInfo as
        | { settledAt?: string; settlementRef?: string }
        | undefined;

      if (requesterInfo?.id || requesterInfo?.name) {
        setPayers([
          {
            paidByType: "USER",
            paidByUserId: requesterInfo.id || null,
            paidByName: requesterInfo.name || null,
            amount: Number(config.defaultValues.amount) || 0,
            ...(settlementInfo?.settledAt
              ? {
                  settlementStatus: "SETTLED" as const,
                  settledAt: settlementInfo.settledAt,
                  settlementRef: settlementInfo.settlementRef || null,
                }
              : {}),
          },
        ]);
      }
      setPayersInitialized(true);
    }
  }, [mode, config.type, config.defaultValues, payersInitialized]);

  // ---------------------------------------------------------------------------
  // Create mode: pre-populate files from defaultValues
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === "create" && !filesInitRef.current) {
      const invoiceUrls = config.defaultValues[config.fileFields.invoice.urlsField] as
        | string[]
        | undefined;
      const slipUrls = config.defaultValues[config.fileFields.slip.urlsField] as
        | string[]
        | undefined;

      if (invoiceUrls || slipUrls) {
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
  }, [mode, config.defaultValues, config.fileFields]);

  // ---------------------------------------------------------------------------
  // Reset formPopulated when navigating to a different transaction
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setFormPopulated(false);
  }, [transactionId]);

  // ---------------------------------------------------------------------------
  // Populate form from SWR data (view/edit)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === "create" || !swrTransaction || formPopulated) return;

    const data = swrTransaction as BaseTransaction & Record<string, unknown>;
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
      [config.fields.dateField.name]: data[config.fields.dateField.name]
        ? new Date(data[config.fields.dateField.name] as string)
        : undefined,
      ...(config.fields.descriptionField
        ? { [config.fields.descriptionField.name]: data[config.fields.descriptionField.name] }
        : {}),
      ...(config.showDueDate
        ? { dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined }
        : {}),
    });

    const contactPatch: Partial<ContactFormState> = {};
    const contactData = (data.Contact || data.contact) as
      | {
          id: string;
          name: string;
          taxId?: string | null;
          preferredDeliveryMethod?: string | null;
          deliveryEmail?: string | null;
          deliveryNotes?: string | null;
        }
      | undefined;

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
      contactPatch.oneTimeContactName = String(data.contactName);
    }

    if (data.whtDeliveryMethod) contactPatch.whtDeliveryMethod = String(data.whtDeliveryMethod);
    if (data.whtDeliveryEmail) contactPatch.whtDeliveryEmail = String(data.whtDeliveryEmail);
    if (data.whtDeliveryNotes) contactPatch.whtDeliveryNotes = String(data.whtDeliveryNotes);
    if (data.taxInvoiceRequestMethod)
      contactPatch.taxInvoiceRequestMethod = String(data.taxInvoiceRequestMethod);
    if (data.taxInvoiceRequestEmail)
      contactPatch.taxInvoiceRequestEmail = String(data.taxInvoiceRequestEmail);
    if (data.taxInvoiceRequestNotes)
      contactPatch.taxInvoiceRequestNotes = String(data.taxInvoiceRequestNotes);
    if (data.hasTaxInvoice) contactPatch.hasDocument = true;

    if (Object.keys(contactPatch).length > 0) patchContactState(contactPatch);

    if (data.accountId) setSelectedAccount(String(data.accountId));
    if (data.categoryId) setSelectedCategory(String(data.categoryId));
    if (data.internalCompanyId) setInternalCompanyId(String(data.internalCompanyId));

    setCategorizedFiles({
      invoice: (data[config.fileFields.invoice.urlsField] as string[]) || [],
      slip: (data[config.fileFields.slip.urlsField] as string[]) || [],
      whtCert: (data[config.fileFields.wht.urlsField] as string[]) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      other: normalizeOtherDocs(data.otherDocUrls as any),
      uncategorized: [],
    });

    if (data.originalCurrency && data.originalCurrency !== "THB") {
      patchAiState({
        currencyConversion: {
          detected: true,
          currency: String(data.originalCurrency),
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
  // Payers fetch from API (view/edit, expense only)
  // ---------------------------------------------------------------------------
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
              paidByPettyCashFundId: p.paidByPettyCashFundId as string | null,
              paidByName: p.paidByName as string | null,
              paidByBankName: p.paidByBankName as string | null,
              paidByBankAccount: p.paidByBankAccount as string | null,
              amount: Number(p.amount),
            }));
            const seen = new Set<string>();
            const unique = mapped.filter((p: PayerInfo) => {
              const key =
                p.paidByType === "USER"
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
  // refreshAll: re-fetch SWR + router.refresh
  // ---------------------------------------------------------------------------
  const refreshAll = useCallback(async () => {
    const result = await mutateTransaction();
    if (result) {
      const r = result as Record<string, unknown>;
      const data =
        (r.data as Record<string, unknown> | undefined)?.[config.type] ?? r[config.type];
      if (data) setTransaction(data as unknown as BaseTransaction);
    }
    setAuditRefreshKey((prev) => prev + 1);
    router.refresh();
  }, [mutateTransaction, config.type, router]);

  return {
    transaction,
    setTransaction,
    payers,
    setPayers,
    categorizedFiles,
    setCategorizedFiles,
    filesInitialized,
    accessibleCompanies,
    auditRefreshKey,
    setAuditRefreshKey,
    refreshAll,
  };
}
