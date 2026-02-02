/**
 * LINE Notification Functions
 * 
 * High-level functions for sending notifications to LINE.
 */

import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/utils/logger";
import { formatCurrency, STATUS_LABELS, parseTemplate } from "./settings";
import { getCompanyLineConfig, getCompanyLineConfigByCode } from "./line-config";
import { sendLineMessage, sendTextMessage } from "./line-core";
import {
  createExpenseFlexMessage,
  createIncomeFlexMessage,
  createTestFlexMessage,
  createApprovalRequestFlexMessage,
  createApprovalGrantedFlexMessage,
  createRejectionFlexMessage,
} from "./line-message-builders";
import type {
  LineMessage,
  NotificationScenario,
  ExpenseNotificationData,
  IncomeNotificationData,
  ApprovalNotificationData,
} from "./line-types";

const log = createLogger("line-notify");

// =============================================================================
// Company Notification Functions
// =============================================================================

/**
 * Send notification to company's configured LINE channel (by company ID)
 */
export async function notifyCompanyById(
  companyId: string,
  message: LineMessage
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Send notification to company's configured LINE channel (by company code)
 */
export async function notifyCompany(
  companyCode: string,
  message: LineMessage
): Promise<boolean> {
  const config = await getCompanyLineConfigByCode(companyCode);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyCode}`);
    return false;
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Simple text notification (by company ID)
 */
export async function notifyCompanyTextById(
  companyId: string,
  text: string
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  return sendTextMessage(config.channelAccessToken, config.groupId, text);
}

/**
 * Simple text notification (by company code - backward compatible)
 */
export async function notifyCompanyText(
  companyCode: string,
  text: string
): Promise<boolean> {
  const config = await getCompanyLineConfigByCode(companyCode);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyCode}`);
    return false;
  }

  return sendTextMessage(config.channelAccessToken, config.groupId, text);
}

// =============================================================================
// Expense Notifications
// =============================================================================

/**
 * Send expense notification to company with scenario check
 */
export async function notifyExpense(
  companyId: string,
  expense: ExpenseNotificationData,
  baseUrl?: string,
  scenario: NotificationScenario = "onCreate"
): Promise<boolean> {
  log.info(`notifyExpense called`, { companyId, scenario, expenseId: expense.id });
  
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  log.debug(`Config found`, { groupId: config.groupId?.substring(0, 10) + "...", notifyEnabled: config.notifyEnabled });

  // Check if this scenario is enabled
  const settings = config.notifySettings;
  const scenarioConfig = settings.expenses[scenario];
  
  if (!scenarioConfig?.enabled) {
    log.debug(`Expense notification for scenario "${scenario}" is disabled`);
    return false;
  }
  
  log.debug(`Scenario "${scenario}" is enabled, creating message...`);

  // Decide message format based on settings
  let message: LineMessage;
  
  if (settings.messageFormat.useFlexMessage) {
    message = createExpenseFlexMessage(expense, baseUrl, settings.messageFormat);
  } else {
    // Use custom template
    const template = scenario === "onStatusChange" 
      ? settings.customTemplates.expenseStatusChange
      : settings.customTemplates.expenseCreate;
    
    const text = parseTemplate(template, {
      companyName: expense.companyName,
      vendorName: expense.vendorName || "ไม่ระบุผู้ขาย",
      description: expense.description || "",
      amount: formatCurrency(expense.amount),
      vatAmount: expense.vatAmount ? formatCurrency(expense.vatAmount) : "0",
      whtRate: expense.whtRate?.toString() || "0",
      whtAmount: expense.whtAmount ? formatCurrency(expense.whtAmount) : "0",
      netPaid: formatCurrency(expense.netPaid),
      status: STATUS_LABELS[expense.status] || expense.status,
      oldStatus: expense.oldStatus ? (STATUS_LABELS[expense.oldStatus] || expense.oldStatus) : "",
      newStatus: STATUS_LABELS[expense.status] || expense.status,
      category: expense.category || "",
      date: new Date().toLocaleDateString("th-TH"),
      invoiceNumber: expense.invoiceNumber || "",
    });
    
    message = { type: "text", text };
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

// =============================================================================
// Income Notifications
// =============================================================================

/**
 * Send income notification to company with scenario check
 */
export async function notifyIncome(
  companyId: string,
  income: IncomeNotificationData,
  baseUrl?: string,
  scenario: NotificationScenario = "onCreate"
): Promise<boolean> {
  log.info(`notifyIncome called`, { companyId, scenario, incomeId: income.id });
  
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    log.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  log.debug(`Config found`, { groupId: config.groupId?.substring(0, 10) + "...", notifyEnabled: config.notifyEnabled });

  // Check if this scenario is enabled
  const settings = config.notifySettings;
  const scenarioConfig = settings.incomes[scenario];
  
  if (!scenarioConfig?.enabled) {
    log.debug(`Income notification for scenario "${scenario}" is disabled`);
    return false;
  }
  
  log.debug(`Scenario "${scenario}" is enabled, creating message...`);

  // Decide message format based on settings
  let message: LineMessage;
  
  if (settings.messageFormat.useFlexMessage) {
    message = createIncomeFlexMessage(income, baseUrl, settings.messageFormat);
  } else {
    // Use custom template
    const template = scenario === "onStatusChange" 
      ? settings.customTemplates.incomeStatusChange
      : settings.customTemplates.incomeCreate;
    
    const text = parseTemplate(template, {
      companyName: income.companyName,
      customerName: income.customerName || "ไม่ระบุลูกค้า",
      source: income.source || "",
      amount: formatCurrency(income.amount),
      vatAmount: income.vatAmount ? formatCurrency(income.vatAmount) : "0",
      whtRate: income.whtRate?.toString() || "0",
      whtAmount: income.whtAmount ? formatCurrency(income.whtAmount) : "0",
      netReceived: formatCurrency(income.netReceived),
      status: STATUS_LABELS[income.status] || income.status,
      oldStatus: income.oldStatus ? (STATUS_LABELS[income.oldStatus] || income.oldStatus) : "",
      newStatus: STATUS_LABELS[income.status] || income.status,
      category: income.category || "",
      date: new Date().toLocaleDateString("th-TH"),
      invoiceNumber: income.invoiceNumber || "",
    });
    
    message = { type: "text", text };
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

// =============================================================================
// Approval Notifications
// =============================================================================

/**
 * Send approval request notification to LINE
 */
export async function notifyApprovalRequest(
  companyId: string,
  data: ApprovalNotificationData,
  baseUrl?: string
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  if (!config) return false;

  // Check if approval submit notification is enabled
  const settings = config.notifySettings;
  if (!settings.approvals?.onSubmit?.enabled) {
    log.debug("Approval submit notification is disabled");
    return false;
  }

  const message = createApprovalRequestFlexMessage(data, baseUrl);
  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Send approval granted notification to LINE
 */
export async function notifyApprovalGranted(
  companyId: string,
  data: ApprovalNotificationData,
  baseUrl?: string
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  if (!config) return false;

  // Check if approval granted notification is enabled
  const settings = config.notifySettings;
  if (!settings.approvals?.onApprove?.enabled) {
    log.debug("Approval granted notification is disabled");
    return false;
  }

  const message = createApprovalGrantedFlexMessage(data, baseUrl);
  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Send rejection notification to LINE
 */
export async function notifyRejection(
  companyId: string,
  data: ApprovalNotificationData,
  baseUrl?: string
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  if (!config) return false;

  // Check if rejection notification is enabled
  const settings = config.notifySettings;
  if (!settings.approvals?.onReject?.enabled) {
    log.debug("Rejection notification is disabled");
    return false;
  }

  const message = createRejectionFlexMessage(data, baseUrl);
  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

// =============================================================================
// Test Notification
// =============================================================================

/**
 * Send test notification to company (bypasses notifyEnabled check)
 */
export async function sendTestNotification(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    if (!company) {
      return { success: false, error: "ไม่พบบริษัท" };
    }

    if (!company.lineChannelAccessToken) {
      return { success: false, error: "ยังไม่ได้ตั้งค่า Channel Access Token" };
    }

    if (!company.lineGroupId) {
      return { success: false, error: "ยังไม่ได้ตั้งค่า Group ID" };
    }

    const message = createTestFlexMessage(company.name);
    const success = await sendLineMessage({
      channelAccessToken: company.lineChannelAccessToken,
      to: company.lineGroupId,
      messages: [message],
    });

    if (!success) {
      return { success: false, error: "ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบ Channel Access Token และ Group ID" };
    }

    return { success: true };
  } catch (error) {
    log.error("Test notification error", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการส่งข้อความ" };
  }
}
