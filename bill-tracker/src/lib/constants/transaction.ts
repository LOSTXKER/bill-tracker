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
// Expense Status Configuration
// =============================================================================

export const EXPENSE_STATUS_FLOW = [
  "WAITING_FOR_DOC",
  "PENDING_PHYSICAL",
  "READY_TO_SEND",
  "SENT_TO_ACCOUNT",
] as const;

export const EXPENSE_STATUS_INFO: Record<string, StatusInfo> = {
  WAITING_FOR_DOC: {
    label: "ร้านส่งบิลตามมา",
    description: "รอร้านค้าส่งใบเสร็จมา",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  PENDING_PHYSICAL: {
    label: "ได้บิลครบแล้ว (รอส่งบัญชี)",
    description: "ได้ใบเสร็จแล้ว รอส่งบัญชี",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
    dotColor: "bg-destructive",
  },
  READY_TO_SEND: {
    label: "พร้อมส่ง",
    description: "รวบรวมเอกสารครบแล้ว",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    dotColor: "bg-blue-500",
  },
  SENT_TO_ACCOUNT: {
    label: "ส่งบัญชีแล้ว",
    description: "ส่งให้บัญชีเรียบร้อย",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
};

// =============================================================================
// Income Status Configuration
// =============================================================================

export const INCOME_STATUS_FLOW = [
  "NO_DOC_REQUIRED",
  "WAITING_ISSUE",
  "WAITING_WHT_CERT",
  "PENDING_COPY_SEND",
  "SENT_COPY",
] as const;

export const INCOME_STATUS_INFO: Record<string, StatusInfo> = {
  NO_DOC_REQUIRED: {
    label: "ไม่ต้องทำเอกสาร",
    description: "รับเงินแล้ว ไม่ต้องออกเอกสาร",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800",
    dotColor: "bg-slate-400",
  },
  WAITING_ISSUE: {
    label: "รอออกบิล",
    description: "รับเงินแล้ว รอออกใบเสร็จ",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    dotColor: "bg-amber-500",
  },
  WAITING_WHT_CERT: {
    label: "รอใบ 50 ทวิ",
    description: "ออกบิลแล้ว รอใบหัก ณ ที่จ่าย",
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900",
    dotColor: "bg-orange-500",
  },
  PENDING_COPY_SEND: {
    label: "รอส่งสำเนา",
    description: "เอกสารครบ รอส่งบัญชี",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
    dotColor: "bg-destructive",
  },
  SENT_COPY: {
    label: "ส่งแล้ว",
    description: "ส่งสำเนาให้บัญชีแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    dotColor: "bg-emerald-500",
  },
};

// =============================================================================
// Legacy Category Colors (for backward compatibility)
// =============================================================================

export const CATEGORY_COLORS: Record<string, string> = {
  MATERIAL: "#22c55e",
  UTILITY: "#f59e0b",
  MARKETING: "#ec4899",
  SALARY: "#3b82f6",
  FREELANCE: "#8b5cf6",
  TRANSPORT: "#14b8a6",
  RENT: "#f97316",
  OFFICE: "#6b7280",
  OTHER: "#71717a",
};

export const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "วัตถุดิบ",
  UTILITY: "สาธารณูปโภค",
  MARKETING: "การตลาด",
  SALARY: "เงินเดือน",
  FREELANCE: "ค่าจ้างฟรีแลนซ์",
  TRANSPORT: "ค่าขนส่ง",
  RENT: "ค่าเช่า",
  OFFICE: "สำนักงาน",
  OTHER: "อื่นๆ",
};
