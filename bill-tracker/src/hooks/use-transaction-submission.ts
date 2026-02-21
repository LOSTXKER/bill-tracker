/**
 * Hook for handling transaction form submission (create and edit modes)
 * Extracted from UnifiedTransactionForm to reduce component complexity
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UseFormWatch, UseFormReset } from "react-hook-form";
import { toast } from "sonner";
import type { ContactSummary } from "@/types";
import type { UnifiedTransactionConfig } from "@/components/forms/UnifiedTransactionForm";
import type { PayerInfo } from "@/components/forms/shared/PayerSection";
import type { CategorizedFiles } from "@/components/forms/shared/InputMethodSection";

export interface UseTransactionSubmissionProps {
  config: UnifiedTransactionConfig;
  companyCode: string;
  transactionId?: string;
  selectedContact: ContactSummary | null;
  oneTimeContactName: string;
  setOneTimeContactName: (name: string) => void;
  selectedAccount: string | null;
  setSelectedAccount: (id: string | null) => void;
  calculation: {
    baseAmount: number;
    vatAmount: number;
    whtAmount: number;
    totalWithVat: number;
    netAmount: number;
  };
  categorizedFiles: CategorizedFiles;
  referenceUrls: string[];
  payers: PayerInfo[];
  internalCompanyId: string | null;
  // WHT delivery method fields (expense only)
  whtDeliveryMethod?: string | null;
  whtDeliveryEmail?: string | null;
  whtDeliveryNotes?: string | null;
  updateContactDelivery?: boolean;
  // Tax invoice request method fields (expense only)
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
  updateContactTaxInvoiceRequest?: boolean;
  // Currency conversion info
  currencyConversion?: {
    detected: boolean;
    currency: string | null;
    originalAmount: number | null;
    convertedAmount: number | null;
    exchangeRate: number | null;
    conversionNote: string | null;
  } | null;
  watch: UseFormWatch<any>;
  reset: UseFormReset<any>;
  transaction: any | null;
  setTransaction: (data: any) => void;
  mutateTransaction: (data: any, options?: any) => Promise<any>;
  setAuditRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  onModeChange?: (mode: "view" | "edit") => void;
  setSelectedContact: (contact: ContactSummary | null) => void;
}

export function useTransactionSubmission({
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
  currencyConversion,
  watch,
  reset,
  transaction,
  setTransaction,
  mutateTransaction,
  setAuditRefreshKey,
  onModeChange,
  setSelectedContact,
}: UseTransactionSubmissionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Handle form submit (create mode)
  const onSubmit = async (data: Record<string, unknown>) => {
    // Validation
    const validationErrors: string[] = [];
    const hasValidContact = selectedContact?.id || oneTimeContactName.trim();
    if (!hasValidContact) validationErrors.push("กรุณาระบุผู้ติดต่อ");

    const descriptionValue = config.fields.descriptionField
      ? data[config.fields.descriptionField.name]
      : null;
    if (config.fields.descriptionField && (!descriptionValue || (descriptionValue as string).trim() === "")) {
      validationErrors.push("กรุณาระบุรายละเอียด");
    }
    if (!data.amount || (data.amount as number) <= 0) {
      validationErrors.push("กรุณาระบุจำนวนเงิน");
    }

    // Validate payers for expense (บังคับระบุผู้จ่าย)
    if (config.type === "expense") {
      if (payers.length === 0) {
        validationErrors.push("กรุณาระบุผู้จ่ายเงิน");
      } else {
        // Check if USER type has user selected
        const invalidUserPayers = payers.filter(
          (p) => p.paidByType === "USER" && !p.paidByUserId
        );
        if (invalidUserPayers.length > 0) {
          validationErrors.push("กรุณาเลือกพนักงานสำหรับผู้จ่ายแต่ละราย");
        }
        // Check if PETTY_CASH type has fund selected
        const invalidPettyCashPayers = payers.filter(
          (p) => p.paidByType === "PETTY_CASH" && !p.paidByPettyCashFundId
        );
        if (invalidPettyCashPayers.length > 0) {
          validationErrors.push("กรุณาเลือกกองทุนเงินสดย่อย");
        }
      }
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
        otherDocUrls: categorizedFiles.other,
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
          referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
          // Include payers and internal company for expense type
          ...(config.type === "expense" && payers.length > 0 ? { payers } : {}),
          ...(config.type === "expense" && internalCompanyId ? { internalCompanyId } : {}),
          // Include WHT delivery method for expense type
          ...(config.type === "expense" ? { 
            whtDeliveryMethod: whtDeliveryMethod || null,
            whtDeliveryEmail: whtDeliveryEmail || null,
            whtDeliveryNotes: whtDeliveryNotes || null,
            updateContactDelivery: updateContactDelivery || false,
          } : {}),
          // Include tax invoice request method for expense type
          ...(config.type === "expense" ? {
            taxInvoiceRequestMethod: taxInvoiceRequestMethod || null,
            taxInvoiceRequestEmail: taxInvoiceRequestEmail || null,
            taxInvoiceRequestNotes: taxInvoiceRequestNotes || null,
            updateContactTaxInvoiceRequest: updateContactTaxInvoiceRequest || false,
          } : {}),
          // Include currency conversion info (if foreign currency)
          ...(currencyConversion && currencyConversion.currency && currencyConversion.currency !== "THB" ? {
            originalCurrency: currencyConversion.currency,
            originalAmount: currencyConversion.originalAmount,
            exchangeRate: currencyConversion.exchangeRate,
          } : {}),
          ...fileData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      toast.success(`บันทึก${config.title}สำเร็จ`);
      
      // Redirect to the created item's detail page
      const createdItem = result.data?.expense || result.data?.income;
      if (createdItem?.id) {
        router.push(`/${companyCode.toLowerCase()}/${config.listUrl}/${createdItem.id}`);
      } else {
        // Fallback to list page if ID not available
        router.push(`/${companyCode.toLowerCase()}/${config.listUrl}`);
      }
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
          contactName: !selectedContact?.id && oneTimeContactName.trim() ? oneTimeContactName.trim() : null,
          accountId: selectedAccount || null,
          amount: Number(formData.amount),
          vatRate: Number(formData.vatRate),
          vatAmount: calc.vatAmount,
          whtRate: whtEnabled ? Number(formData.whtRate) : null,
          whtAmount: whtEnabled ? calc.whtAmount : null,
          [config.fields.netAmountField]: calc.netAmount,
          referenceUrls: referenceUrls.length > 0 ? referenceUrls : [],
          // Include payers and internal company for expense type
          ...(config.type === "expense" ? { payers, internalCompanyId: internalCompanyId || null } : {}),
          // Include WHT delivery method for expense type
          ...(config.type === "expense" ? {
            whtDeliveryMethod: whtDeliveryMethod || null,
            whtDeliveryEmail: whtDeliveryEmail || null,
            whtDeliveryNotes: whtDeliveryNotes || null,
            updateContactDelivery: updateContactDelivery || false,
          } : {}),
          // Include tax invoice request method for expense type
          ...(config.type === "expense" ? {
            taxInvoiceRequestMethod: taxInvoiceRequestMethod || null,
            taxInvoiceRequestEmail: taxInvoiceRequestEmail || null,
            taxInvoiceRequestNotes: taxInvoiceRequestNotes || null,
            updateContactTaxInvoiceRequest: updateContactTaxInvoiceRequest || false,
          } : {}),
          // Include currency conversion info (if foreign currency)
          ...(currencyConversion && currencyConversion.currency && currencyConversion.currency !== "THB" ? {
            originalCurrency: currencyConversion.currency,
            originalAmount: currencyConversion.originalAmount,
            exchangeRate: currencyConversion.exchangeRate,
          } : {}),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `ไม่สามารถบันทึกการแก้ไขได้`);
      }
      const updatedData = result.data?.[config.type] || result[config.type];
      
      // Update local state
      setTransaction(updatedData);
      
      // Update SWR cache with the response data to ensure it persists after refresh
      // This directly updates the cache without refetching
      await mutateTransaction({ data: { [config.type]: updatedData } }, { revalidate: false });
      
      // Update selectedContact and oneTimeContactName from the response to ensure UI consistency
      const contactData = updatedData.Contact || updatedData.contact;
      if (contactData) {
        // Saved contact from database
        setSelectedContact({
          id: contactData.id,
          name: contactData.name,
          taxId: contactData.taxId,
        });
        setOneTimeContactName("");
      } else if (updatedData.contactName) {
        // One-time contact name (typed manually, not saved as Contact)
        setSelectedContact(null);
        setOneTimeContactName(updatedData.contactName);
      } else {
        // No contact at all
        setSelectedContact(null);
        setOneTimeContactName("");
      }
      
      // Update selectedAccount from the response
      if (updatedData.accountId !== undefined) {
        setSelectedAccount(updatedData.accountId);
      }
      
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
        status: transaction.status,
        invoiceNumber: transaction.invoiceNumber,
        referenceNo: transaction.referenceNo,
        notes: transaction.notes,
        documentType: transaction.documentType || "TAX_INVOICE",
        [config.fields.dateField.name]: transaction[config.fields.dateField.name]
          ? new Date(transaction[config.fields.dateField.name] as string)
          : undefined,
        ...(config.fields.descriptionField
          ? { [config.fields.descriptionField.name]: transaction[config.fields.descriptionField.name] }
          : {}),
      });
    }
  };

  return {
    onSubmit,
    handleSave,
    handleEditClick,
    handleCancelEdit,
    isLoading,
    saving,
  };
}
