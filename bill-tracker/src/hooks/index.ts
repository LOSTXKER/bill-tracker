/**
 * Hooks Index
 * Central export point for all custom hooks
 */

// AI Analysis
export { useAiAnalysis } from "./use-ai-analysis";
export type {
  UseAiAnalysisReturn,
  MultiDocAnalysisResult,
  AccountSuggestion,
  VendorSuggestion,
  MergeData,
} from "./use-ai-analysis";

// Company
export { useCompany, useSafeCompany } from "./use-company";

// Contacts
export { useContacts } from "./use-contacts";
export { useContactDefaults } from "./use-contact-defaults";

// LINE Notification
export { useLineNotification } from "./use-line-notification";

// Payers (for expenses)
export { usePayers } from "./use-payers";
export type { UsePayersReturn, PayerInfo, PaidByType } from "./use-payers";

// Sidebar
export { useSidebarBadges } from "./use-sidebar-badges";

// Transaction
export { useTransaction } from "./use-transaction";
export { useTransactionActions } from "./use-transaction-actions";
export { useTransactionFileUpload } from "./use-transaction-file-upload";
export {
  useTransactionFilters,
  usePagination,
  useSorting,
} from "./use-transaction-filters";
export { useTransactionRow } from "./use-transaction-row";

// Transaction Calculation
export {
  useTransactionCalculation,
  useAutoRecalculation,
} from "./use-transaction-calculation";
export type {
  UseTransactionCalculationReturn,
  TransactionCalculation,
  CalculationFunction,
} from "./use-transaction-calculation";
