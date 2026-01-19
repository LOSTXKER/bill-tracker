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

// =============================================================================
// VAT Options
// =============================================================================

export const VAT_OPTIONS = [
  { value: 0, label: "ไม่มี VAT (0%)" },
  { value: 7, label: "VAT 7%" },
] as const;

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
// Expense Workflow Status Configuration
// =============================================================================

export const EXPENSE_WORKFLOW_FLOW = [
  "DRAFT",
  "PAID",
  "TAX_INVOICE_RECEIVED",
  "WHT_ISSUED",  // ถ้ามี WHT
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
] as const;

export const EXPENSE_WORKFLOW_FLOW_NO_WHT = [
  "DRAFT",
  "PAID",
  "TAX_INVOICE_RECEIVED",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
] as const;

export const EXPENSE_WORKFLOW_INFO: Record<string, StatusInfo> = {
  DRAFT: {
    label: "ร่าง",
    description: "รายการร่าง ยังไม่จ่ายเงิน",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  PAID: {
    label: "จ่ายเงินแล้ว",
    description: "จ่ายเงินแล้ว รอใบกำกับภาษี",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    dotColor: "bg-blue-500",
  },
  WAITING_TAX_INVOICE: {
    label: "รอใบกำกับ",
    description: "รอใบกำกับภาษีจากร้านค้า",
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900",
    dotColor: "bg-orange-500",
  },
  TAX_INVOICE_RECEIVED: {
    label: "ได้ใบกำกับแล้ว",
    description: "ได้รับใบกำกับภาษีแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  WHT_PENDING_ISSUE: {
    label: "รอออก 50 ทวิ",
    description: "รอออกใบหัก ณ ที่จ่ายให้ vendor",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  WHT_ISSUED: {
    label: "ออก 50 ทวิแล้ว",
    description: "ออกใบหัก ณ ที่จ่ายแล้ว",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900",
    dotColor: "bg-purple-500",
  },
  WHT_SENT_TO_VENDOR: {
    label: "ส่ง 50 ทวิแล้ว",
    description: "ส่งใบหัก ณ ที่จ่ายให้ vendor แล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  READY_FOR_ACCOUNTING: {
    label: "รอส่งบัญชี",
    description: "เอกสารครบ รอส่งบัญชี",
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

// =============================================================================
// Income Workflow Status Configuration
// =============================================================================

export const INCOME_WORKFLOW_FLOW = [
  "DRAFT",
  "RECEIVED",
  "INVOICE_ISSUED",
  "WHT_CERT_RECEIVED",  // ถ้าลูกค้าหักภาษี
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
] as const;

export const INCOME_WORKFLOW_FLOW_NO_WHT = [
  "DRAFT",
  "RECEIVED",
  "INVOICE_ISSUED",
  "READY_FOR_ACCOUNTING",
  "SENT_TO_ACCOUNTANT",
] as const;

export const INCOME_WORKFLOW_INFO: Record<string, StatusInfo> = {
  DRAFT: {
    label: "ร่าง",
    description: "รายการร่าง ยังไม่รับเงิน",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  RECEIVED: {
    label: "รับเงินแล้ว",
    description: "รับเงินจากลูกค้าแล้ว",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    dotColor: "bg-blue-500",
  },
  NO_INVOICE_NEEDED: {
    label: "ไม่ต้องออกบิล",
    description: "ไม่ต้องออกใบกำกับภาษี",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  WAITING_INVOICE_ISSUE: {
    label: "รอออกบิล",
    description: "รอออกใบกำกับภาษีให้ลูกค้า",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  INVOICE_ISSUED: {
    label: "ออกบิลแล้ว",
    description: "ออกใบกำกับภาษีให้ลูกค้าแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  INVOICE_SENT: {
    label: "ส่งบิลแล้ว",
    description: "ส่งใบกำกับภาษีให้ลูกค้าแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
  WHT_PENDING_CERT: {
    label: "รอใบ 50 ทวิ",
    description: "รอใบหัก ณ ที่จ่ายจากลูกค้า",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  WHT_CERT_RECEIVED: {
    label: "ได้ใบ 50 ทวิ",
    description: "ได้รับใบหัก ณ ที่จ่ายจากลูกค้าแล้ว",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900",
    dotColor: "bg-purple-500",
  },
  READY_FOR_ACCOUNTING: {
    label: "รอส่งบัญชี",
    description: "เอกสารครบ รอส่งบัญชี",
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

// Expense Status Labels (Workflow)
export const EXPENSE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "ร่าง", color: "gray" },
  PAID: { label: "จ่ายเงินแล้ว", color: "blue" },
  WAITING_TAX_INVOICE: { label: "รอใบกำกับ", color: "orange" },
  TAX_INVOICE_RECEIVED: { label: "ได้ใบกำกับแล้ว", color: "green" },
  WHT_PENDING_ISSUE: { label: "รอออก 50 ทวิ", color: "amber" },
  WHT_ISSUED: { label: "ออก 50 ทวิแล้ว", color: "purple" },
  WHT_SENT_TO_VENDOR: { label: "ส่ง 50 ทวิแล้ว", color: "green" },
  READY_FOR_ACCOUNTING: { label: "รอส่งบัญชี", color: "indigo" },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชีแล้ว", color: "green" },
  COMPLETED: { label: "เสร็จสิ้น", color: "green" },
};

// Income Status Labels (Workflow)
export const INCOME_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "ร่าง", color: "gray" },
  RECEIVED: { label: "รับเงินแล้ว", color: "blue" },
  NO_INVOICE_NEEDED: { label: "ไม่ต้องออกบิล", color: "gray" },
  WAITING_INVOICE_ISSUE: { label: "รอออกบิล", color: "amber" },
  INVOICE_ISSUED: { label: "ออกบิลแล้ว", color: "green" },
  INVOICE_SENT: { label: "ส่งบิลแล้ว", color: "green" },
  WHT_PENDING_CERT: { label: "รอใบ 50 ทวิ", color: "amber" },
  WHT_CERT_RECEIVED: { label: "ได้ใบ 50 ทวิ", color: "purple" },
  READY_FOR_ACCOUNTING: { label: "รอส่งบัญชี", color: "indigo" },
  SENT_TO_ACCOUNTANT: { label: "ส่งบัญชีแล้ว", color: "green" },
  COMPLETED: { label: "เสร็จสิ้น", color: "green" },
};

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
