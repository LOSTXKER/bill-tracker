/**
 * Utility functions index
 * Central export point for all utility functions
 */

// Base URL utilities
export { getBaseUrl, buildUrl } from "./get-base-url";

// Error handling utilities
export {
  getErrorMessage,
  isNetworkError,
  getNetworkErrorMessage,
  logError,
} from "./error-helpers";

// Formatting utilities
export {
  formatCurrency,
  formatThaiDate,
  formatThaiDateLong,
  formatNumber,
  parseCurrency,
  formatAmount,
  formatCurrencyThai,
  formatDateLocal,
  formatThaiDateTime,
  formatDateForFolder,
  formatPhoneNumber,
  formatTaxId,
  buddhistToGregorian,
  gregorianToBuddhist,
} from "./formatters";

// Serialization utilities
export {
  serializeDecimal,
  serializeTransaction,
  serializeContact,
  serializeExpense,
  serializeIncome,
  serializeExpenses,
  serializeIncomes,
  serializeTransactions,
  toNumber,
  type SerializedExpense,
  type SerializedIncome,
} from "./serializers";

// Tax calculation utilities
export {
  calculateVAT,
  calculateWHT,
  calculateTransactionTotals,
  reverseVAT,
} from "./tax-calculator";

// Transaction field mapping utilities
export {
  getFieldMapping,
  getTransactionField,
  getNetAmount,
  getTransactionDate,
  isWhtEnabled,
  getDescription,
  getContactName,
  normalizeExpense,
  normalizeIncome,
  normalizeTransaction,
  getTransactionTypeLabel,
  getNetAmountLabel,
  getDateLabel,
  getDescriptionLabel,
  getContactLabel,
  getWhtLabel,
  getPermissionPrefix,
  getPermission,
  EXPENSE_FIELD_MAPPING,
  INCOME_FIELD_MAPPING,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS_EN,
  type TransactionType,
  type TransactionFieldMapping,
  type CommonTransaction,
} from "./transaction-fields";

// Transaction data extraction utilities (Phase 5 Refactoring)
// TODO: Implement transaction-data-extraction.ts
// export {
//   extractFormData,
//   extractAiData,
//   normalizeAiWhtType,
//   calculateMergedTotals,
// } from "./transaction-data-extraction";
