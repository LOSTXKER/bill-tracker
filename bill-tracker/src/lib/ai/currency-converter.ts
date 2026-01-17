/**
 * Currency Detection and Conversion
 * Detect foreign currency from OCR text and convert to THB
 */

// Supported currencies
export type SupportedCurrency = "THB" | "USD" | "AED" | "EUR" | "GBP" | "JPY" | "CNY" | "SGD" | "HKD" | "MYR";

export interface CurrencyDetectionResult {
  detected: boolean;
  currency: string | null;
  originalAmount: number | null;
  convertedAmount: number | null;
  exchangeRate: number | null;
  conversionNote: string | null;
}

// Currency patterns for detection
const CURRENCY_PATTERNS = {
  USD: {
    symbols: ["$", "USD", "US", "DOLLAR"],
    regex: /(\$|USD|US\$|DOLLAR)\s*[\d,]+\.?\d*/gi,
  },
  AED: {
    symbols: ["AED", "د\.إ", "DH", "DIRHAM"],
    regex: /(AED|د\.إ|DH|DIRHAM)\s*[\d,]+\.?\d*/gi,
  },
  THB: {
    symbols: ["฿", "THB", "BAHT", "บาท"],
    regex: /(฿|THB|BAHT|บาท)\s*[\d,]+\.?\d*/gi,
  },
};

/**
 * Detect currency from OCR text
 */
export function detectCurrency(ocrText: string): "USD" | "AED" | "THB" {
  const text = ocrText.toUpperCase();

  // Check for USD
  if (
    CURRENCY_PATTERNS.USD.symbols.some((sym) => text.includes(sym.toUpperCase())) ||
    CURRENCY_PATTERNS.USD.regex.test(ocrText)
  ) {
    return "USD";
  }

  // Check for AED
  if (
    CURRENCY_PATTERNS.AED.symbols.some((sym) => text.includes(sym.toUpperCase())) ||
    CURRENCY_PATTERNS.AED.regex.test(ocrText)
  ) {
    return "AED";
  }

  // Default to THB
  return "THB";
}

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  AED: "د.إ",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  SGD: "S$",
  HKD: "HK$",
  MYR: "RM",
  THB: "฿",
};

/**
 * Convert foreign currency to THB
 */
export function convertCurrency(
  amount: number,
  currency: string,
  exchangeRates: Record<string, number>
): CurrencyDetectionResult {
  // Normalize currency to uppercase
  const normalizedCurrency = currency.toUpperCase();

  // If already THB, no conversion needed
  if (normalizedCurrency === "THB") {
    return {
      detected: true,
      currency: "THB",
      originalAmount: amount,
      convertedAmount: amount,
      exchangeRate: null,
      conversionNote: null,
    };
  }

  // Get exchange rate
  const rate = exchangeRates[normalizedCurrency];

  if (!rate || rate <= 0) {
    // No rate configured, return original
    return {
      detected: true,
      currency: normalizedCurrency,
      originalAmount: amount,
      convertedAmount: null, // Cannot convert
      exchangeRate: null,
      conversionNote: `⚠️ ไม่พบอัตราแลกเปลี่ยน ${normalizedCurrency} - กรุณาตั้งค่าในหน้า Settings`,
    };
  }

  // Convert
  const convertedAmount = amount * rate;
  const currencySymbol = CURRENCY_SYMBOLS[normalizedCurrency] || normalizedCurrency;

  return {
    detected: true,
    currency: normalizedCurrency,
    originalAmount: amount,
    convertedAmount,
    exchangeRate: rate,
    conversionNote: `แปลงจาก ${currencySymbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${normalizedCurrency} @ ฿${rate.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  };
}

/**
 * Detect and convert amount from OCR result
 */
export function detectAndConvertAmount(
  ocrText: string,
  amount: number | null,
  exchangeRates: Record<string, number>
): CurrencyDetectionResult {
  if (!amount || amount <= 0) {
    return {
      detected: false,
      currency: null,
      originalAmount: null,
      convertedAmount: null,
      exchangeRate: null,
      conversionNote: null,
    };
  }

  // Detect currency from OCR text
  const detectedCurrency = detectCurrency(ocrText);

  // Convert if needed
  return convertCurrency(amount, detectedCurrency, exchangeRates);
}
