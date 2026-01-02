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
 * Calculate expense totals
 * Net Paid = Base Amount + VAT - WHT
 */
export function calculateExpenseTotals(
  baseAmount: number,
  vatRate: number,
  whtRate: number = 0
): TaxCalculation {
  const vatAmount = calculateVAT(baseAmount, vatRate);
  const whtAmount = calculateWHT(baseAmount, whtRate);
  const totalWithVat = baseAmount + vatAmount;
  const netAmount = totalWithVat - whtAmount;

  return {
    baseAmount,
    vatAmount,
    whtAmount,
    totalWithVat,
    netAmount,
  };
}

/**
 * Calculate income totals
 * Net Received = Base Amount + VAT - WHT deducted by customer
 */
export function calculateIncomeTotals(
  baseAmount: number,
  vatRate: number,
  whtDeductedRate: number = 0
): TaxCalculation {
  const vatAmount = calculateVAT(baseAmount, vatRate);
  const whtAmount = calculateWHT(baseAmount, whtDeductedRate);
  const totalWithVat = baseAmount + vatAmount;
  const netAmount = totalWithVat - whtAmount;

  return {
    baseAmount,
    vatAmount,
    whtAmount,
    totalWithVat,
    netAmount,
  };
}

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
  const inputVAT = expenses.reduce((sum: number, e) => sum + (Number(e.vatAmount) || 0), 0);
  const outputVAT = incomes.reduce((sum: number, i) => sum + (Number(i.vatAmount) || 0), 0);
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
  const whtPaid = expenses.reduce((sum: number, e) => sum + (Number(e.whtAmount) || 0), 0);
  const whtReceived = incomes.reduce((sum: number, i) => sum + (Number(i.whtAmount) || 0), 0);
  const netWHT = whtPaid - whtReceived;

  return { whtPaid, whtReceived, netWHT };
}
