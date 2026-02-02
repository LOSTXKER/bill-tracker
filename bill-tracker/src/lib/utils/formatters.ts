/**
 * Centralized formatting utilities
 * Re-exports from tax-calculator.ts and adds additional formatters
 */

// Re-export existing formatters from tax-calculator
export {
  formatCurrency,
  formatThaiDate,
  formatThaiDateLong,
  formatNumber,
  parseCurrency,
} from "./tax-calculator";

/**
 * Format amount without currency symbol (just number with thousand separators)
 * Used for notifications and messages
 */
export function formatAmount(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format currency in Thai style for messages (e.g., "1,234.56 บาท")
 */
export function formatCurrencyThai(amount: number): string {
  return `${formatAmount(amount)} บาท`;
}

/**
 * Format date in local format for form inputs (yyyy-MM-dd)
 */
export function formatDateLocal(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Format date and time in Thai format
 */
export function formatThaiDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date for folder names (safe characters)
 */
export function formatDateForFolder(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, "");
  
  // Format Thai mobile (0x-xxx-xxxx)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return as-is if doesn't match expected format
  return phone;
}

/**
 * Format tax ID for display (x-xxxx-xxxxx-xx-x)
 */
export function formatTaxId(taxId: string | null | undefined): string {
  if (!taxId) return "";
  
  // Remove non-digits
  const digits = taxId.replace(/\D/g, "");
  
  // Format 13-digit tax ID
  if (digits.length === 13) {
    return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
  }
  
  return taxId;
}

/**
 * Convert Buddhist year to Gregorian year
 */
export function buddhistToGregorian(buddhistYear: number): number {
  return buddhistYear - 543;
}

/**
 * Convert Gregorian year to Buddhist year
 */
export function gregorianToBuddhist(gregorianYear: number): number {
  return gregorianYear + 543;
}
