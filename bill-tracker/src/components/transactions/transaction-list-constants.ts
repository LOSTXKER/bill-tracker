export interface StatusTab {
  key: string;
  label: string;
  statuses: string[];
  icon?: string;
  isTabFilter?: boolean;
  isApprovalTab?: boolean;
  isRejectedTab?: boolean;
}

export const EXPENSE_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: ["PENDING_APPROVAL"] },
  { key: "active", label: "ดำเนินการ", statuses: ["ACTIVE"] },
  { key: "ready", label: "พร้อมส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
  { key: "payOnBehalf", label: "จ่ายแทน", statuses: [], isTabFilter: true },
];

export const INCOME_STATUS_TABS: StatusTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: [] },
  { key: "draft", label: "ร่างของฉัน", statuses: ["DRAFT"], isTabFilter: true },
  { key: "pending", label: "รออนุมัติ", statuses: ["PENDING_APPROVAL"] },
  { key: "active", label: "ดำเนินการ", statuses: ["ACTIVE"] },
  { key: "ready", label: "พร้อมส่งบัญชี", statuses: ["READY_FOR_ACCOUNTING"] },
  { key: "sent", label: "ส่งบัญชีแล้ว", statuses: ["SENT_TO_ACCOUNTANT", "COMPLETED"] },
];
