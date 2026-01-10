import type { TaxCalculation } from "@/types";

/**
 * Calculate VAT amount from base amount
 */
export function calculateVAT(baseAmount: number, vatRate: number): number {
  return Math.round((baseAmount * vatRate) / 100 * 100) / 100;
}

/**
 * Calculate WHT amount from base amount (หักจากยอดก่อน VAT)
 */
export function calculateWHT(baseAmount: number, whtRate: number): number {
  return Math.round((baseAmount * whtRate) / 100 * 100) / 100;
}

/**
 * Calculate transaction totals (unified for both expense and income)
 * Net Amount = Base Amount + VAT - WHT
 */
export function calculateTransactionTotals(
  baseAmount: number,
  vatRate: number,
  whtRate: number = 0
): TaxCalculation {
  // Ensure all values are numbers (handles string inputs from form fields)
  const base = Number(baseAmount) || 0;
  const vat = Number(vatRate) || 0;
  const wht = Number(whtRate) || 0;
  
  const vatAmount = calculateVAT(base, vat);
  const whtAmount = calculateWHT(base, wht);
  const totalWithVat = base + vatAmount;
  const netAmount = totalWithVat - whtAmount;

  return {
    baseAmount: base,
    vatAmount,
    whtAmount,
    totalWithVat,
    netAmount,
  };
}

/**
 * Calculate expense totals (wrapper for backward compatibility)
 * @deprecated Use calculateTransactionTotals instead
 */
export const calculateExpenseTotals = calculateTransactionTotals;

/**
 * Calculate income totals (wrapper for backward compatibility)
 * @deprecated Use calculateTransactionTotals instead
 */
export const calculateIncomeTotals = calculateTransactionTotals;

/**
 * Reverse calculate base amount from total with VAT
 */
export function reverseVAT(totalWithVat: number, vatRate: number): number {
  const baseAmount = totalWithVat / (1 + vatRate / 100);
  return Math.round(baseAmount * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format date in Thai short format (e.g., "5 ม.ค. 68")
 */
export function formatThaiDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

/**
 * Format date in Thai long format (e.g., "5 มกราคม 2568")
 */
export function formatThaiDateLong(date: Date | string): string {
  return new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format number with thousand separators
 */
export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Parse formatted currency string back to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol, thousand separators, and spaces
  const cleaned = value.replace(/[฿,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * WHT rates and their descriptions
 */
export const WHT_RATES = {
  SERVICE_3: { rate: 3, description: "ค่าบริการ" },
  PROFESSIONAL_5: { rate: 5, description: "ค่าวิชาชีพ" },
  TRANSPORT_1: { rate: 1, description: "ค่าขนส่ง" },
  RENT_5: { rate: 5, description: "ค่าเช่า" },
  ADVERTISING_2: { rate: 2, description: "ค่าโฆษณา" },
  OTHER: { rate: 3, description: "อื่นๆ" },
} as const;

/**
 * Get WHT rate by type
 */
export function getWHTRate(whtType: keyof typeof WHT_RATES): number {
  return WHT_RATES[whtType]?.rate ?? 3;
}

/**
 * Calculate monthly VAT summary
 */
export interface VATSummary {
  inputVAT: number;    // ภาษีซื้อ (from expenses)
  outputVAT: number;   // ภาษีขาย (from incomes)
  netVAT: number;      // ภาษีที่ต้องชำระ/ได้รับคืน
}

export function calculateVATSummary(
  expenses: { vatAmount: number | null }[],
  incomes: { vatAmount: number | null }[]
): VATSummary {
  let inputVAT = 0;
  for (const e of expenses) {
    inputVAT += Number(e.vatAmount) || 0;
  }
  let outputVAT = 0;
  for (const i of incomes) {
    outputVAT += Number(i.vatAmount) || 0;
  }
  const netVAT = outputVAT - inputVAT;

  return { inputVAT, outputVAT, netVAT };
}

/**
 * Calculate monthly WHT summary
 */
export interface WHTSummary {
  whtPaid: number;      // WHT we withheld from vendors (must remit)
  whtReceived: number;  // WHT customers withheld from us (tax credit)
  netWHT: number;
}

export function calculateWHTSummary(
  expenses: { whtAmount: number | null }[],
  incomes: { whtAmount: number | null }[]
): WHTSummary {
  let whtPaid = 0;
  for (const e of expenses) {
    whtPaid += Number(e.whtAmount) || 0;
  }
  let whtReceived = 0;
  for (const i of incomes) {
    whtReceived += Number(i.whtAmount) || 0;
  }
  const netWHT = whtPaid - whtReceived;

  return { whtPaid, whtReceived, netWHT };
}
