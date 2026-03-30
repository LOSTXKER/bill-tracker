/**
 * Shared Transaction Constants
 * Used by both Expense and Income modules
 */

// =============================================================================
// Payment Methods
// =============================================================================

export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "เงินสด" },
  { value: "BANK_TRANSFER", label: "โอนเงิน" },
  { value: "PROMPTPAY", label: "พร้อมเพย์" },
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
  { value: "CHEQUE", label: "เช็ค" },
] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตรเครดิต",
  CHEQUE: "เช็ค",
};

// =============================================================================
// Withholding Tax (WHT) Options
// =============================================================================

export const WHT_OPTIONS = [
  { value: "SERVICE_3", rate: 3, label: "ค่าบริการ 3%" },
  { value: "PROFESSIONAL_5", rate: 5, label: "ค่าบริการวิชาชีพ 5%" },
  { value: "TRANSPORT_1", rate: 1, label: "ค่าขนส่ง 1%" },
  { value: "RENT_5", rate: 5, label: "ค่าเช่า 5%" },
  { value: "ADVERTISING_2", rate: 2, label: "ค่าโฆษณา 2%" },
  { value: "OTHER", rate: 0, label: "อื่นๆ" },
] as const;

/**
 * Simple WHT rate lookup by type (for contact default settings)
 * Uses shorter type names for easier usage in forms
 */
export const WHT_RATE_BY_TYPE: Record<string, number> = {
  SERVICE: 3,
  PROFESSIONAL: 5,
  RENT: 5,
  TRANSPORT: 1,
  ADVERTISING: 2,
  OTHER: 3,
} as const;

/**
 * WHT type options for contact forms (simpler naming)
 */
export const WHT_TYPE_OPTIONS = [
  { value: "SERVICE", label: "ค่าบริการ (3%)" },
  { value: "RENT", label: "ค่าเช่า (5%)" },
  { value: "TRANSPORT", label: "ค่าขนส่ง (1%)" },
  { value: "ADVERTISING", label: "ค่าโฆษณา (2%)" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

// =============================================================================
// VAT Options
// =============================================================================

export const VAT_OPTIONS = [
  { value: 0, label: "ไม่มี VAT (0%)" },
  { value: 7, label: "VAT 7%" },
] as const;

// =============================================================================
// WHT Status Constants (Centralized)
// =============================================================================

/**
 * สถานะที่ห้ามเปลี่ยน WHT โดยเด็ดขาด (locked after accounting)
 */
export const WHT_LOCKED_STATUSES = ["SENT_TO_ACCOUNTANT", "COMPLETED"] as const;

/**
 * สถานะที่ต้อง confirm ก่อนเปลี่ยน WHT (ใช้ macro statuses)
 */
export const WHT_CONFIRM_REQUIRED_STATUSES = {
  expense: ["ACTIVE", "READY_FOR_ACCOUNTING"] as const,
  income: ["ACTIVE", "READY_FOR_ACCOUNTING"] as const,
} as const;

/**
 * Combined WHT confirm statuses (for components that check both types)
 */
export const WHT_CONFIRM_STATUSES_ALL = [
  "ACTIVE",
  "READY_FOR_ACCOUNTING",
] as const;

export type TransactionType = "expense" | "income";

// =============================================================================
// Status Info Types
// =============================================================================

export interface StatusInfo {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

// =============================================================================
// Unified Workflow Status Configuration (Macro Statuses)
// =============================================================================

export const WORKFLOW_STATUS_FLOW = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
  "COMPLETED",
] as const;

export const WORKFLOW_STATUS_INFO: Record<string, StatusInfo> = {
  DRAFT: {
    label: "ร่าง",
    description: "รายการร่าง ยังไม่ส่ง",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  PENDING_APPROVAL: {
    label: "รออนุมัติ",
    description: "ส่งแล้ว รอคนอนุมัติ",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  ACTIVE: {
    label: "ดำเนินการ",
    description: "จ่ายเงิน/รับเงินแล้ว กำลังจัดการเอกสาร",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    dotColor: "bg-blue-500",
  },
  READY_FOR_ACCOUNTING: {
    label: "พร้อมส่งบัญชี",
    description: "เอกสารครบ พร้อมส่งบัญชี",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900",
    dotColor: "bg-indigo-500",
  },
  SENT_TO_ACCOUNTANT: {
    label: "ส่งบัญชีแล้ว",
    description: "ส่งให้บัญชีแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    description: "ดำเนินการเสร็จสิ้น",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800",
    dotColor: "bg-emerald-600",
  },
};

// Legacy aliases for backward compatibility during transition
export const EXPENSE_WORKFLOW_INFO = WORKFLOW_STATUS_INFO;
export const INCOME_WORKFLOW_INFO = WORKFLOW_STATUS_INFO;
export const EXPENSE_WORKFLOW_FLOW = WORKFLOW_STATUS_FLOW;
export const INCOME_WORKFLOW_FLOW = WORKFLOW_STATUS_FLOW;
export const EXPENSE_WORKFLOW_FLOW_NO_WHT = WORKFLOW_STATUS_FLOW;
export const INCOME_WORKFLOW_FLOW_NO_WHT = WORKFLOW_STATUS_FLOW;

// =============================================================================
// Reimbursement Status Configuration
// =============================================================================

export const REIMBURSEMENT_STATUS_FLOW = [
  "PENDING",
  "FLAGGED",
  "APPROVED",
  "REJECTED",
  "PAID",
] as const;

export const REIMBURSEMENT_STATUS_INFO: Record<string, StatusInfo> = {
  PENDING: {
    label: "รออนุมัติ",
    description: "รอผู้จัดการอนุมัติ",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  FLAGGED: {
    label: "AI พบปัญหา",
    description: "AI ตรวจพบปัญหา รอตรวจสอบเพิ่ม",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    dotColor: "bg-red-500",
  },
  APPROVED: {
    label: "รอจ่ายเงิน",
    description: "อนุมัติแล้ว รอจ่ายเงินคืน",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    dotColor: "bg-blue-500",
  },
  REJECTED: {
    label: "ถูกปฏิเสธ",
    description: "คำขอถูกปฏิเสธ",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  PAID: {
    label: "จ่ายแล้ว",
    description: "จ่ายเงินคืนแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
};

// =============================================================================
// Status Labels for StatusBadge component (consolidated)
// =============================================================================

// Unified Workflow Status Labels (shared by expense and income)
export const WORKFLOW_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "ร่าง", color: "gray" },
  PENDING_APPROVAL: { label: "รออนุมัติ", color: "amber" },
  ACTIVE: { label: "ดำเนินการ", color: "blue" },
  READY_FOR_ACCOUNTING: { label: "พร้อมส่งบัญชี", color: "indigo" },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชีแล้ว", color: "green" },
  COMPLETED: { label: "เสร็จสิ้น", color: "green" },
};

// Legacy aliases
export const EXPENSE_STATUS_LABELS = WORKFLOW_STATUS_LABELS;
export const INCOME_STATUS_LABELS = WORKFLOW_STATUS_LABELS;

// Reimbursement Status Labels
export const REIMBURSEMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "รออนุมัติ", color: "orange" },
  FLAGGED: { label: "AI พบปัญหา", color: "red" },
  APPROVED: { label: "รอจ่ายเงิน", color: "yellow" },
  REJECTED: { label: "ถูกปฏิเสธ", color: "gray" },
  PAID: { label: "จ่ายแล้ว", color: "green" },
};

// =============================================================================
// Approval Status Configuration
// =============================================================================

export const APPROVAL_STATUS_FLOW = [
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export const APPROVAL_STATUS_INFO: Record<string, StatusInfo> = {
  NOT_REQUIRED: {
    label: "ไม่ต้องอนุมัติ",
    description: "สร้างโดยผู้มีสิทธิ์",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  PENDING: {
    label: "รออนุมัติ",
    description: "รอผู้มีสิทธิ์อนุมัติ",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  APPROVED: {
    label: "อนุมัติแล้ว",
    description: "ได้รับการอนุมัติแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  REJECTED: {
    label: "ถูกปฏิเสธ",
    description: "ถูกปฏิเสธ รอแก้ไขและส่งใหม่",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    dotColor: "bg-red-500",
  },
};

export const APPROVAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOT_REQUIRED: { label: "ไม่ต้องอนุมัติ", color: "gray" },
  PENDING: { label: "รออนุมัติ", color: "orange" },
  APPROVED: { label: "อนุมัติแล้ว", color: "green" },
  REJECTED: { label: "ถูกปฏิเสธ", color: "red" },
};

// =============================================================================
// Expense Document Type Configuration
// =============================================================================

export const EXPENSE_DOCUMENT_TYPE_OPTIONS = [
  { value: "TAX_INVOICE", label: "ใบกำกับภาษี", description: "สำหรับรายจ่ายที่มี VAT 7%" },
  { value: "CASH_RECEIPT", label: "บิลเงินสด", description: "สำหรับรายจ่ายที่ไม่มี VAT" },
  { value: "NO_DOCUMENT", label: "ไม่มีเอกสาร", description: "ค่าใช้จ่ายเบ็ดเตล็ด" },
] as const;

// =============================================================================
// Other Document Type Configuration (เอกสารประกอบ)
// =============================================================================

export const OTHER_DOC_TYPE_OPTIONS = [
  { value: "QUOTATION", label: "ใบเสนอราคา", icon: "FileText" },
  { value: "INVOICE", label: "ใบแจ้งหนี้", icon: "FileText" },
  { value: "CONTRACT", label: "สัญญา", icon: "FileSignature" },
  { value: "PURCHASE_ORDER", label: "ใบสั่งซื้อ (PO)", icon: "ClipboardList" },
  { value: "DELIVERY_NOTE", label: "ใบส่งของ", icon: "Truck" },
  { value: "OTHER", label: "อื่นๆ", icon: "File" },
] as const;

export type OtherDocType = typeof OTHER_DOC_TYPE_OPTIONS[number]["value"];

export const OTHER_DOC_TYPE_LABELS: Record<OtherDocType, string> = {
  QUOTATION: "ใบเสนอราคา",
  INVOICE: "ใบแจ้งหนี้",
  CONTRACT: "สัญญา",
  PURCHASE_ORDER: "ใบสั่งซื้อ (PO)",
  DELIVERY_NOTE: "ใบส่งของ",
  OTHER: "อื่นๆ",
};

// Typed other document structure
export interface TypedOtherDoc {
  url: string;
  type: OtherDocType;
  name?: string; // Optional custom name
}

export const EXPENSE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "ใบกำกับภาษี",
  CASH_RECEIPT: "บิลเงินสด",
  NO_DOCUMENT: "ไม่มีเอกสาร",
};

// Helper function to get workflow label (now uses unified labels)
export function getExpenseWorkflowLabel(
  status: string,
  _documentType: string = "TAX_INVOICE"
): string {
  return WORKFLOW_STATUS_INFO[status]?.label || status;
}

// All document-type specific flows now use the same macro statuses
export const EXPENSE_WORKFLOW_FLOW_NO_DOC = WORKFLOW_STATUS_FLOW;
export const EXPENSE_WORKFLOW_FLOW_CASH_RECEIPT = WORKFLOW_STATUS_FLOW;
