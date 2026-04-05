import { createLogger } from "@/lib/utils/logger";
import type { ReceiptAnalysisResult, AnalyzedWHT } from "./types";
import { parseAIJsonResponse } from "./utils/parse-ai-json";
import {
  type AccountRecord,
  type ContactRecord,
  resolveAccountWithAutoCreate,
  resolveAccountAlternatives,
  matchContact,
  validateVendorTaxId,
} from "./receipt-matcher";

interface AIReceiptResponse {
  vendor?: {
    name?: string;
    taxId?: string;
    address?: string;
    phone?: string;
    branchNumber?: string;
  };
  date?: string;
  currency?: string;
  amount?: number;
  vatAmount?: number;
  vatRate?: number;
  wht?: { rate?: number | null; amount?: number | null; type?: string | null };
  netAmount?: number;
  account?: { id?: string; code?: string; name?: string } | null;
  newAccount?: { code?: string; name?: string; class?: string; reason?: string } | null;
  accountAlternatives?: Array<{ id?: string; code?: string; name?: string }>;
  documentType?: string;
  invoiceNumber?: string;
  items?: Array<{ name?: string; amount?: number; quantity?: number }>;
  confidence?: { overall?: number; vendor?: number; amount?: number; date?: number; account?: number };
  description?: string;
}

const log = createLogger("ai-receipt");

export function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  let normalized = dateStr;
  const yearMatch = normalized.match(/^(\d{4})/);
  if (!yearMatch) return normalized;

  let year = parseInt(yearMatch[1]);

  if (year > 2500) {
    year = year - 543;
    normalized = normalized.replace(/^\d{4}/, String(year));
  }

  const currentYear = new Date().getFullYear();
  const minReasonableYear = currentYear - 2;

  if (year < minReasonableYear) {
    const correctedYear = year + 10;
    if (correctedYear >= minReasonableYear && correctedYear <= currentYear + 1) {
      log.debug("Date fix: corrected year", { from: year, to: correctedYear });
      normalized = normalized.replace(/^\d{4}/, String(correctedYear));
    } else {
      log.debug("Date fix: year too old", { year, defaultTo: currentYear });
      normalized = normalized.replace(/^\d{4}/, String(currentYear));
    }
  } else if (year > currentYear + 1) {
    log.debug("Date fix: year in future", { year, defaultTo: currentYear });
    normalized = normalized.replace(/^\d{4}/, String(currentYear));
  }

  return normalized;
}

export function normalizeVatRate(vatRate: number | undefined, vatAmount: number | undefined): number {
  if (vatRate === 0 || vatRate === 7) return vatRate;
  return (vatAmount && vatAmount > 0) ? 7 : 0;
}

const VALID_WHT_RATES = [1, 2, 3, 5, 10, 15];

export function normalizeWht(
  whtInput: { rate?: number | null; amount?: number | null; type?: string | null } | null | undefined,
  amount: number | null | undefined,
  rawResponse: string | null
): AnalyzedWHT {
  let whtRate: number | null = whtInput?.rate ?? null;
  let whtAmount: number | null = whtInput?.amount ?? null;
  let whtType: string | null = whtInput?.type ?? null;

  log.debug("WHT raw data", { rawRate: whtRate, rawAmount: whtAmount, rawType: whtType });

  if (!whtRate && !whtAmount && rawResponse) {
    const whtAmountMatch = rawResponse.match(/หัก\s*(?:ณ\s*)?(?:ที่จ่าย|ภาษี)[^0-9]*([0-9,]+\.?[0-9]*)/i);
    const whtRateMatch = rawResponse.match(/หัก[^%]*(\d+(?:\.\d+)?)\s*%/i) ||
                         rawResponse.match(/WHT[^%]*(\d+(?:\.\d+)?)\s*%/i);

    if (whtAmountMatch) {
      const extractedAmount = parseFloat(whtAmountMatch[1].replace(/,/g, ''));
      if (extractedAmount > 0) {
        whtAmount = extractedAmount;
        log.debug("WHT fallback: extracted amount", { amount: extractedAmount });

        if (amount && amount > 0) {
          const calculatedRate = (extractedAmount / amount) * 100;
          if (calculatedRate <= 1.5) whtRate = 1;
          else if (calculatedRate <= 2.5) whtRate = 2;
          else if (calculatedRate <= 4) whtRate = 3;
          else if (calculatedRate <= 7.5) whtRate = 5;
          else if (calculatedRate <= 12.5) whtRate = 10;
          else whtRate = 15;
          log.debug("WHT fallback: calculated rate", { calculatedRate, whtRate });
        }
      }
    }

    if (whtRateMatch && !whtRate) {
      whtRate = parseFloat(whtRateMatch[1]);
      log.debug("WHT fallback: extracted rate", { whtRate });
    }

    if (whtRate && !whtType) {
      if (whtRate === 1) whtType = "ค่าขนส่ง";
      else if (whtRate === 2) whtType = "ค่าโฆษณา";
      else if (whtRate === 3) whtType = "ค่าบริการ";
      else if (whtRate === 5) whtType = "ค่าเช่า";
      else whtType = "ค่าบริการ";
    }
  }

  if (whtRate && !VALID_WHT_RATES.includes(whtRate)) {
    if (whtRate < 2) whtRate = 1;
    else if (whtRate < 4) whtRate = 3;
    else if (whtRate < 7) whtRate = 5;
    else whtRate = null;
  }

  log.debug("WHT final", { whtRate, whtAmount, whtType });

  return {
    rate: whtRate || null,
    amount: typeof whtAmount === "number" ? whtAmount : null,
    type: whtType || null,
  };
}

const VALID_CURRENCIES = ["THB", "USD", "AED", "EUR", "GBP", "JPY", "CNY", "SGD", "HKD", "MYR"];

export function normalizeCurrency(currency: string | undefined): string {
  const upper = currency?.toUpperCase() || "THB";
  return VALID_CURRENCIES.includes(upper) ? upper : "THB";
}

export function createEmptyResult(rawText?: string): ReceiptAnalysisResult {
  return {
    vendor: {
      name: null,
      taxId: null,
      address: null,
      phone: null,
      branchNumber: null,
      matchedContactId: null,
      matchedContactName: null,
    },
    date: null,
    currency: "THB",
    amount: null,
    vatAmount: null,
    vatRate: null,
    wht: { rate: null, amount: null, type: null },
    netAmount: null,
    account: { id: null, code: null, name: null },
    accountAlternatives: [],
    documentType: null,
    invoiceNumber: null,
    items: [],
    confidence: { overall: 0, vendor: 0, amount: 0, date: 0, account: 0 },
    description: null,
    warnings: [],
    rawText,
  };
}

export async function parseAIResponse(
  rawResponse: string,
  accounts: AccountRecord[],
  contacts: ContactRecord[],
  companyTaxId: string | null = null,
  companyId: string | null = null
): Promise<ReceiptAnalysisResult> {
  try {
    const parsed = parseAIJsonResponse<AIReceiptResponse>(rawResponse);

    const account = await resolveAccountWithAutoCreate(
      parsed.account, parsed.newAccount, parsed.confidence, accounts, companyId
    );
    const accountAlternatives = resolveAccountAlternatives(
      parsed.accountAlternatives, accounts, account.id
    );
    log.debug("Account result", {
      account: account.code || "NONE",
      alternatives: accountAlternatives.map(a => a.code),
    });

    const { matchedContactId, matchedContactName } = matchContact(parsed.vendor ?? null, contacts);
    const vendorTaxId = validateVendorTaxId(parsed.vendor?.taxId || null, companyTaxId);

    return {
      vendor: {
        name: parsed.vendor?.name || null,
        taxId: vendorTaxId,
        address: parsed.vendor?.address || null,
        phone: parsed.vendor?.phone || null,
        branchNumber: parsed.vendor?.branchNumber || null,
        matchedContactId,
        matchedContactName,
      },
      date: normalizeDate(parsed.date ?? null),
      currency: normalizeCurrency(parsed.currency),
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      vatAmount: typeof parsed.vatAmount === "number" ? parsed.vatAmount : null,
      vatRate: normalizeVatRate(parsed.vatRate, parsed.vatAmount),
      wht: normalizeWht(parsed.wht, parsed.amount, rawResponse),
      netAmount: typeof parsed.netAmount === "number" ? parsed.netAmount : null,
      account,
      accountAlternatives: accountAlternatives.slice(0, 2),
      documentType: parsed.documentType || null,
      invoiceNumber: parsed.invoiceNumber || null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) =>
            typeof item === "string" ? item : item.name ?? ""
          )
        : [],
      confidence: {
        overall: parsed.confidence?.overall || 0,
        vendor: parsed.confidence?.vendor || 0,
        amount: parsed.confidence?.amount || 0,
        date: parsed.confidence?.date || 0,
        account: parsed.confidence?.account || 0,
      },
      description: parsed.description || null,
      warnings: [],
      rawText: rawResponse,
    };
  } catch (error) {
    log.error("parseAIResponse error", error, { rawPreview: rawResponse?.substring(0, 200) });
    return createEmptyResult(rawResponse);
  }
}
