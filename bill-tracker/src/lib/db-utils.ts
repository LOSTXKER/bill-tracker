/**
 * Database Utility Functions
 * Centralized helpers for database operations
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback for logging/monitoring retry attempts */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Default function to check if an error is retryable
 * Handles common database timeout scenarios
 */
export function isTimeoutError(error: Error): boolean {
  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("operation has timed out") ||
    message.includes("connection pool timeout") ||
    // Prisma error codes
    (error as any).code === "P2024" // Timed out fetching connection from pool
  );
}

/**
 * Execute a database operation with retry logic and exponential backoff
 * 
 * Useful for handling:
 * - Supabase cold start timeouts
 * - Connection pool exhaustion
 * - Transient network issues
 * 
 * @example
 * ```ts
 * const user = await withRetry(
 *   async () => prisma.user.findUnique({ where: { id } }),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    exponentialBackoff = true,
    isRetryable = isTimeoutError,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = isRetryable(lastError) && attempt < maxRetries - 1;

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay
      const delay = exponentialBackoff
        ? initialDelay * Math.pow(2, attempt)
        : initialDelay;

      // Log/callback
      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      } else {
        console.warn(
          `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`
        );
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrap a Prisma query with retry logic
 * Convenience wrapper for common use case
 * 
 * @example
 * ```ts
 * const users = await retryableQuery(() => 
 *   prisma.user.findMany({ where: { active: true } })
 * );
 * ```
 */
export function retryableQuery<T>(
  query: () => Promise<T>,
  options?: Omit<RetryOptions, "isRetryable">
): Promise<T> {
  return withRetry(query, {
    ...options,
    isRetryable: isTimeoutError,
  });
}

/**
 * Create a retry wrapper with pre-configured options
 * Useful for creating consistent retry behavior across an application
 * 
 * @example
 * ```ts
 * const dbRetry = createRetryWrapper({ maxRetries: 5 });
 * const user = await dbRetry(() => prisma.user.findUnique({ where: { id } }));
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return function <T>(
    operation: () => Promise<T>,
    overrideOptions?: RetryOptions
  ): Promise<T> {
    return withRetry(operation, { ...defaultOptions, ...overrideOptions });
  };
}
