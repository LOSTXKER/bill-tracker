export interface StatusTab {
  key: string;
  label: string;
  statuses: string[];
  icon?: string;
  isTabFilter?: boolean;
  isApprovalTab?: boolean;
  isRejectedTab?: boolean;
}

// Expense workflow: ร่าง → รออนุมัติ → จ่ายแล้ว → รอใบกำกับ → (ออก 50 ทวิ) → รอส่งบัญชี → ส่งแล้ว
export const EXPENSE_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: [], isApprovalTab: true },
  { key: "rejected", label: "ถูกปฏิเสธ", statuses: [], isRejectedTab: true },
  { key: "waiting_doc", label: "รอเอกสาร", statuses: ["PAID", "WAITING_TAX_INVOICE", "WHT_PENDING_ISSUE"] },
  { key: "doc_received", label: "ได้เอกสารแล้ว", statuses: ["TAX_INVOICE_RECEIVED", "WHT_ISSUED", "WHT_SENT_TO_VENDOR"] },
  { key: "ready", label: "รอส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
  { key: "recent", label: "แก้ไขล่าสุด", statuses: [] },
];

// Income workflow: ร่าง → รออนุมัติ → รับเงินแล้ว → รอออกบิล → (รอ 50 ทวิ) → รอส่งบัญชี → ส่งแล้ว
export const INCOME_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: [], isApprovalTab: true },
  { key: "rejected", label: "ถูกปฏิเสธ", statuses: [], isRejectedTab: true },
  { key: "waiting_doc", label: "รอออกบิล", statuses: ["RECEIVED", "NO_INVOICE_NEEDED", "WAITING_INVOICE_ISSUE", "WHT_PENDING_CERT"] },
  { key: "doc_issued", label: "ออกบิลแล้ว", statuses: ["INVOICE_ISSUED", "INVOICE_SENT", "WHT_CERT_RECEIVED"] },
  { key: "ready", label: "รอส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
  { key: "recent", label: "แก้ไขล่าสุด", statuses: [] },
];
