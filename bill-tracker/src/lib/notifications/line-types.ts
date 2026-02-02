/**
 * LINE Messaging Types
 * 
 * Type definitions for LINE Messaging API integration.
 */

import type { LineNotifySettings } from "./settings";

// =============================================================================
// Configuration Types
// =============================================================================

export interface CompanyLineConfig {
  channelAccessToken: string;
  groupId: string;
  notifyEnabled: boolean;
  notifySettings: LineNotifySettings;
}

// =============================================================================
// Message Types
// =============================================================================

export interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

export interface SendMessageOptions {
  channelAccessToken: string;
  to: string; // User ID or Group ID
  messages: LineMessage[];
}

export interface MessageFormatOptions {
  showDetailLink?: boolean;
  showVatBreakdown?: boolean;
  showWhtInfo?: boolean;
}

// =============================================================================
// Notification Data Types
// =============================================================================

export type NotificationScenario = "onCreate" | "onStatusChange" | "onUpdate" | "onDelete";

export interface ExpenseNotificationData {
  id?: string;
  companyCode?: string;
  companyName: string;
  vendorName?: string;
  description?: string;
  amount: number;
  vatAmount?: number;
  isWht: boolean;
  whtRate?: number;
  whtAmount?: number;
  netPaid: number;
  status: string;
  oldStatus?: string;
  category?: string;
  invoiceNumber?: string;
}

export interface IncomeNotificationData {
  id?: string;
  companyCode?: string;
  companyName: string;
  customerName?: string;
  source?: string;
  amount: number;
  vatAmount?: number;
  isWhtDeducted: boolean;
  whtRate?: number;
  whtAmount?: number;
  netReceived: number;
  status: string;
  oldStatus?: string;
  category?: string;
  invoiceNumber?: string;
}

export interface ApprovalNotificationData {
  id: string;
  companyCode: string;
  companyName: string;
  type: "expense" | "income";
  description?: string;
  vendorOrCustomer?: string;
  amount: number;
  submitterName: string;
  approverName?: string;
  rejectedReason?: string;
}

export interface DailySummaryData {
  companyName: string;
  date: Date;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  pendingDocs: number;
  waitingWhtCerts: number;
}

// =============================================================================
// Status Configuration
// =============================================================================

export interface StatusConfig {
  emoji: string;
  text: string;
  color: string;
  bgColor: string;
}

export const EXPENSE_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { emoji: "📝", text: "ร่าง", color: "#6B7280", bgColor: "#F3F4F6" },
  PAID: { emoji: "💳", text: "จ่ายแล้ว", color: "#3B82F6", bgColor: "#DBEAFE" },
  WAITING_TAX_INVOICE: { emoji: "📋", text: "รอใบกำกับ", color: "#F59E0B", bgColor: "#FEF3C7" },
  TAX_INVOICE_RECEIVED: { emoji: "📄", text: "ได้ใบกำกับแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  WHT_PENDING_ISSUE: { emoji: "📝", text: "รอออก 50 ทวิ", color: "#F97316", bgColor: "#FED7AA" },
  WHT_ISSUED: { emoji: "✍️", text: "ออก 50 ทวิแล้ว", color: "#8B5CF6", bgColor: "#EDE9FE" },
  WHT_SENT_TO_VENDOR: { emoji: "📨", text: "ส่ง 50 ทวิแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  READY_FOR_ACCOUNTING: { emoji: "📦", text: "พร้อมส่งบัญชี", color: "#6366F1", bgColor: "#E0E7FF" },
  SENT_TO_ACCOUNTANT: { emoji: "✅", text: "ส่งบัญชีแล้ว", color: "#059669", bgColor: "#A7F3D0" },
  COMPLETED: { emoji: "🎉", text: "เสร็จสิ้น", color: "#059669", bgColor: "#A7F3D0" },
};

export const INCOME_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { emoji: "📝", text: "ร่าง", color: "#6B7280", bgColor: "#F3F4F6" },
  RECEIVED: { emoji: "💵", text: "รับเงินแล้ว", color: "#3B82F6", bgColor: "#DBEAFE" },
  NO_INVOICE_NEEDED: { emoji: "📋", text: "ไม่ต้องออกบิล", color: "#6B7280", bgColor: "#F3F4F6" },
  WAITING_INVOICE_ISSUE: { emoji: "📝", text: "รอออกบิล", color: "#F59E0B", bgColor: "#FEF3C7" },
  INVOICE_ISSUED: { emoji: "📄", text: "ออกบิลแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  INVOICE_SENT: { emoji: "📨", text: "ส่งบิลแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  WHT_PENDING_CERT: { emoji: "📋", text: "รอใบ 50 ทวิ", color: "#F97316", bgColor: "#FED7AA" },
  WHT_CERT_RECEIVED: { emoji: "✍️", text: "ได้ใบ 50 ทวิแล้ว", color: "#8B5CF6", bgColor: "#EDE9FE" },
  READY_FOR_ACCOUNTING: { emoji: "📦", text: "พร้อมส่งบัญชี", color: "#6366F1", bgColor: "#E0E7FF" },
  SENT_TO_ACCOUNTANT: { emoji: "✅", text: "ส่งบัญชีแล้ว", color: "#059669", bgColor: "#A7F3D0" },
  COMPLETED: { emoji: "🎉", text: "เสร็จสิ้น", color: "#059669", bgColor: "#A7F3D0" },
};

export const DEFAULT_STATUS: StatusConfig = { 
  emoji: "⚪", 
  text: "Unknown", 
  color: "#6B7280", 
  bgColor: "#F3F4F6" 
};
