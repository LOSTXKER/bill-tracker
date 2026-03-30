"use client";

import { useEffect, useRef } from "react";
import type { UseFormSetValue } from "react-hook-form";

interface UseDocumentTypeEffectsParams {
  configType: string;
  watchVatRate: number;
  watchDocumentType: string | undefined;
  setValue: UseFormSetValue<Record<string, unknown>>;
  taxInvoiceRequestMethod: string | null;
  setTaxInvoiceRequestMethod: (v: string | null) => void;
  setTaxInvoiceRequestEmail: (v: string | null) => void;
  setTaxInvoiceRequestNotes: (v: string | null) => void;
}

/**
 * Handles VAT-to-documentType auto-switching and
 * clearing tax invoice fields when documentType changes to NO_DOCUMENT.
 */
export function useDocumentTypeEffects({
  configType,
  watchVatRate,
  watchDocumentType,
  setValue,
  taxInvoiceRequestMethod,
  setTaxInvoiceRequestMethod,
  setTaxInvoiceRequestEmail,
  setTaxInvoiceRequestNotes,
}: UseDocumentTypeEffectsParams) {
  const prevVatRateRef = useRef(watchVatRate);

  useEffect(() => {
    if (configType === "expense" && prevVatRateRef.current !== watchVatRate) {
      if (watchVatRate === 0) {
        if (!watchDocumentType || watchDocumentType === "TAX_INVOICE") {
          setValue("documentType", "CASH_RECEIPT");
        }
      } else {
        setValue("documentType", "TAX_INVOICE");
      }
      prevVatRateRef.current = watchVatRate;
    }
  }, [watchVatRate, watchDocumentType, configType, setValue]);

  useEffect(() => {
    if (configType === "expense" && watchDocumentType === "NO_DOCUMENT") {
      if (taxInvoiceRequestMethod) {
        setTaxInvoiceRequestMethod(null);
        setTaxInvoiceRequestEmail(null);
        setTaxInvoiceRequestNotes(null);
      }
    }
  }, [watchDocumentType, configType]); // eslint-disable-line react-hooks/exhaustive-deps
}
