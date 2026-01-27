/**
 * Logging Utility
 * 
 * Provides structured logging with log levels for the Bill Tracker application.
 * Can be easily extended to send logs to external services (e.g., Sentry, DataDog).
 */

// =============================================================================
// Types
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Module/component name */
  module?: string;
  /** User ID if available */
  userId?: string;
  /** Company ID if available */
  companyId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context data */
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  data?: unknown;
  error?: Error | unknown;
}

// =============================================================================
// Configuration
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level (can be configured via environment variable)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === "production" ? "info" : "debug");

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp, context, data, error } = entry;
  
  // In development, use colorized output
  if (process.env.NODE_ENV !== "production") {
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(" ")}]` : "";
    return `[${level.toUpperCase()}] ${timestamp}${contextStr} ${message}`;
  }
  
  // In production, use JSON for structured logging
  return JSON.stringify({
    level,
    message,
    timestamp,
    ...context,
    data,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  });
}

// =============================================================================
// Logger Class
// =============================================================================

class Logger {
  private context: LogContext = {};

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  /**
   * Log at info level
   */
  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    this.log("error", message, data, error);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: unknown, error?: Error | unknown): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      data,
      error,
    };

    const formattedMessage = formatLogEntry(entry);

    // Output to console based on level
    switch (level) {
      case "debug":
        console.debug(formattedMessage, data !== undefined ? data : "");
        break;
      case "info":
        console.info(formattedMessage, data !== undefined ? data : "");
        break;
      case "warn":
        console.warn(formattedMessage, data !== undefined ? data : "");
        break;
      case "error":
        console.error(formattedMessage, error || "", data !== undefined ? data : "");
        break;
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific module context
 * 
 * @example
 * ```typescript
 * const log = createLogger("transaction-routes");
 * log.info("Processing transaction", { transactionId: "123" });
 * ```
 */
export function createLogger(module: string, additionalContext?: LogContext): Logger {
  return logger.child({ module, ...additionalContext });
}

/**
 * Create a logger for API routes
 * 
 * @example
 * ```typescript
 * const log = createApiLogger("expenses");
 * log.info("Creating expense", { userId, companyId });
 * ```
 */
export function createApiLogger(
  routeName: string, 
  context?: { userId?: string; companyId?: string; requestId?: string }
): Logger {
  return logger.child({
    module: `api/${routeName}`,
    ...context,
  });
}
