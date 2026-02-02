/**
 * LINE Messaging API Integration
 * 
 * Main entry point for LINE notifications.
 * Re-exports all LINE-related functions from modular files.
 * 
 * This file maintains backward compatibility by re-exporting everything
 * that was previously defined in this single file.
 * 
 * Module Structure:
 * - line-types.ts       - Type definitions
 * - line-utils.ts       - Utility functions (formatting, validation)
 * - line-config.ts      - Configuration retrieval from database
 * - line-core.ts        - Low-level messaging functions
 * - line-message-builders.ts - Flex message builders
 * - line-notify.ts      - High-level notification functions
 * 
 * Setup:
 * 1. Create LINE Official Account at https://developers.line.biz/
 * 2. Create Messaging API channel
 * 3. Get Channel Access Token from LINE Developers Console
 * 4. Configure credentials in Company settings
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  CompanyLineConfig,
  LineMessage,
  SendMessageOptions,
  MessageFormatOptions,
  NotificationScenario,
  ExpenseNotificationData,
  IncomeNotificationData,
  ApprovalNotificationData,
  DailySummaryData,
  StatusConfig,
} from "./line-types";

export {
  EXPENSE_STATUS_CONFIG,
  INCOME_STATUS_CONFIG,
  DEFAULT_STATUS,
} from "./line-types";

// =============================================================================
// Utility Exports
// =============================================================================

export {
  formatCurrencyThai,
  formatNumber,
  formatDateThai,
  formatTimeThai,
  formatDateShort,
  validateLineConfig,
  maskToken,
  getLineErrorMessage,
  logLineError,
} from "./line-utils";

// =============================================================================
// Configuration Exports
// =============================================================================

export {
  getCompanyLineConfig,
  getCompanyLineConfigByCode,
} from "./line-config";

// =============================================================================
// Core Messaging Exports
// =============================================================================

export {
  sendLineMessage,
  sendTextMessage,
  sendReplyMessage,
  sendMulticastMessage,
  sendBroadcastMessage,
} from "./line-core";

// =============================================================================
// Message Builder Exports
// =============================================================================

export {
  createExpenseFlexMessage,
  createIncomeFlexMessage,
  createDailySummaryFlexMessage,
  createTestFlexMessage,
  createApprovalRequestFlexMessage,
  createApprovalGrantedFlexMessage,
  createRejectionFlexMessage,
} from "./line-message-builders";

// =============================================================================
// Notification Function Exports
// =============================================================================

export {
  notifyCompanyById,
  notifyCompany,
  notifyCompanyTextById,
  notifyCompanyText,
  notifyExpense,
  notifyIncome,
  notifyApprovalRequest,
  notifyApprovalGranted,
  notifyRejection,
  sendTestNotification,
} from "./line-notify";
