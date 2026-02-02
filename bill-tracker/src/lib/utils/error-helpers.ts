/**
 * Error handling utilities
 * Centralized error message extraction and formatting
 */

/**
 * Extract a user-friendly error message from any error type
 * @param error - The error to extract message from (unknown type)
 * @param fallback - Fallback message if error message cannot be extracted
 */
export function getErrorMessage(
  error: unknown,
  fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  
  return fallback;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout")
    );
  }
  
  return false;
}

/**
 * Get a user-friendly message for network errors
 */
export function getNetworkErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
  }
  return getErrorMessage(error);
}

/**
 * Log error with context for debugging (only in development)
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, {
      message: getErrorMessage(error),
      error,
      ...additionalInfo,
    });
  }
}
