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
  const safeVatRate = typeof watchVatRate === "number" && !Number.isNaN(watchVatRate)
    ? watchVatRate
    : 0;
  const prevVatRateRef = useRef(safeVatRate);
  const docTypeRef = useRef(watchDocumentType);
  docTypeRef.current = watchDocumentType;

  useEffect(() => {
    if (configType !== "expense" || prevVatRateRef.current === safeVatRate) return;

    if (safeVatRate === 0) {
      const current = docTypeRef.current;
      if (!current || current === "TAX_INVOICE") {
        setValue("documentType", "CASH_RECEIPT");
      }
    } else {
      setValue("documentType", "TAX_INVOICE");
    }
    prevVatRateRef.current = safeVatRate;
  }, [safeVatRate, configType, setValue]);

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
