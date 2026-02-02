/**
 * LINE Messaging Utilities
 * 
 * Helper functions for LINE message formatting.
 */

import { createLogger } from "@/lib/utils/logger";

const log = createLogger("line-utils");

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format currency for notifications (Thai Baht)
 */
export function formatCurrencyThai(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with commas and 2 decimal places
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for Thai locale
 */
export function formatDateThai(date: Date): string {
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format time for Thai locale
 */
export function formatTimeThai(date: Date): string {
  return date.toLocaleTimeString("th-TH", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

/**
 * Format date for short display
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("th-TH", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate LINE configuration
 */
export function validateLineConfig(config: {
  channelAccessToken?: string | null;
  groupId?: string | null;
}): { valid: boolean; error?: string } {
  if (!config.channelAccessToken) {
    return { valid: false, error: "Missing Channel Access Token" };
  }
  if (!config.groupId) {
    return { valid: false, error: "Missing Group ID" };
  }
  return { valid: true };
}

/**
 * Mask sensitive token for logging
 */
export function maskToken(token: string, visibleChars: number = 10): string {
  if (token.length <= visibleChars) {
    return "***";
  }
  return token.substring(0, visibleChars) + "...";
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Get error message from LINE API response
 */
export function getLineErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("details" in error && Array.isArray(error.details)) {
      return error.details.map((d: { message?: string }) => d.message).join(", ");
    }
  }
  return "Unknown LINE API error";
}

/**
 * Log LINE API error with context
 */
export function logLineError(
  context: string, 
  error: unknown, 
  additionalData?: Record<string, unknown>
): void {
  log.error(`[LINE] ${context}`, error, additionalData);
}
