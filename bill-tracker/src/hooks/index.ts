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

// Transaction Form Helpers (Phase 5.1 Refactoring)
export { useAiResultProcessor } from "./use-ai-result-processor";
export type {
  UseAiResultProcessorProps,
  AiVendorSuggestion,
  AccountSuggestion as AiAccountSuggestion,
} from "./use-ai-result-processor";

export { useTransactionSubmission } from "./use-transaction-submission";
export type { UseTransactionSubmissionProps } from "./use-transaction-submission";

export { useMergeHandler } from "./use-merge-handler";
export type { UseMergeHandlerProps } from "./use-merge-handler";

// TODO: Implement use-wht-change-rules.ts
// export { useWhtChangeRules } from "./use-wht-change-rules";
// export type { UseWhtChangeRulesProps } from "./use-wht-change-rules";

// Transaction List Helpers (Phase 5.2 Refactoring)
export { useBulkActions } from "./use-bulk-actions";
export type { UseBulkActionsProps } from "./use-bulk-actions";

export { useSelection } from "./use-selection";
export type { UseSelectionProps } from "./use-selection";

export { useStatusCalculations } from "./use-status-calculations";
export type {
  UseStatusCalculationsProps,
  Transaction as StatusTransaction,
} from "./use-status-calculations";

export { useTabManagement } from "./use-tab-management";
export type {
  UseTabManagementProps,
  StatusTab,
} from "./use-tab-management";
