/**
 * LINE Notification Settings Types and Defaults
 * Allows customization of notification scenarios and message templates
 */

export interface NotificationScenario {
  enabled: boolean;
  template?: string; // Custom template with placeholders
}

export interface LineNotifySettings {
  // Expense Notification Scenarios
  expenses: {
    onCreate: NotificationScenario;
    onStatusChange: NotificationScenario;
    onDelete: NotificationScenario;
    onUpdate: NotificationScenario;
  };
  // Income Notification Scenarios
  incomes: {
    onCreate: NotificationScenario;
    onStatusChange: NotificationScenario;
    onDelete: NotificationScenario;
    onUpdate: NotificationScenario;
  };
  // Approval Workflow Notifications (for expenses & incomes)
  approvals: {
    onSubmit: NotificationScenario;   // เมื่อส่งอนุมัติ
    onApprove: NotificationScenario;  // เมื่อได้รับการอนุมัติ
    onReject: NotificationScenario;   // เมื่อถูกปฏิเสธ
  };
  // Reimbursement Notification Scenarios
  reimbursements: {
    onSubmit: NotificationScenario;
    onApprove: NotificationScenario;
    onReject: NotificationScenario;
    onPay: NotificationScenario;
  };
  // Comment & Mention Notifications
  comments: {
    onComment: NotificationScenario;
    onMention: NotificationScenario;
    onReply: NotificationScenario;
  };
  // Daily Summary
  dailySummary: {
    enabled: boolean;
    time: string; // HH:mm format
  };
  // Message Format Options
  messageFormat: {
    useFlexMessage: boolean; // Use rich Flex Message or simple text
    showDetailLink: boolean; // Include link to view detail
    showVatBreakdown: boolean;
    showWhtInfo: boolean;
    language: "th" | "en";
  };
  // Custom Templates with placeholders
  customTemplates: {
    expenseCreate: string;
    expenseStatusChange: string;
    incomeCreate: string;
    incomeStatusChange: string;
    reimbursementSubmit: string;
    reimbursementApprove: string;
    dailySummary: string;
  };
}

// Default settings
export const DEFAULT_NOTIFY_SETTINGS: LineNotifySettings = {
  expenses: {
    onCreate: { enabled: true },
    onStatusChange: { enabled: true },
    onDelete: { enabled: true },
    onUpdate: { enabled: true },
  },
  incomes: {
    onCreate: { enabled: true },
    onStatusChange: { enabled: true },
    onDelete: { enabled: true },
    onUpdate: { enabled: true },
  },
  approvals: {
    onSubmit: { enabled: true },
    onApprove: { enabled: true },
    onReject: { enabled: true },
  },
  reimbursements: {
    onSubmit: { enabled: true },
    onApprove: { enabled: true },
    onReject: { enabled: true },
    onPay: { enabled: true },
  },
  comments: {
    onComment: { enabled: true },
    onMention: { enabled: true },
    onReply: { enabled: true },
  },
  dailySummary: {
    enabled: false,
    time: "09:00",
  },
  messageFormat: {
    useFlexMessage: true,
    showDetailLink: true,
    showVatBreakdown: true,
    showWhtInfo: true,
    language: "th",
  },
  customTemplates: {
    expenseCreate: "[รายจ่ายใหม่]\n{vendorName}\nจำนวน: ฿{amount}\nโอนจริง: ฿{netPaid}\nสถานะ: {status}",
    expenseStatusChange: "[รายจ่ายอัปเดต]\n{vendorName}\nสถานะ: {oldStatus} -> {newStatus}",
    incomeCreate: "[รายรับใหม่]\n{customerName}\nจำนวน: ฿{amount}\nรับจริง: ฿{netReceived}\nสถานะ: {status}",
    incomeStatusChange: "[รายรับอัปเดต]\n{customerName}\nสถานะ: {oldStatus} -> {newStatus}",
    reimbursementSubmit: "[คำขอเบิกจ่ายใหม่]\n{requesterName}\nจำนวน: ฿{amount}\nรายละเอียด: {description}",
    reimbursementApprove: "[คำขอเบิกจ่ายอนุมัติ]\n{requesterName} ฿{amount}\nอนุมัติโดย: {approverName}",
    dailySummary: "[สรุปประจำวัน {date}]\nรายรับ: ฿{totalIncome}\nรายจ่าย: ฿{totalExpense}\nสุทธิ: ฿{netCashFlow}",
  },
};

// Template placeholders documentation
export const TEMPLATE_PLACEHOLDERS = {
  expense: {
    "{companyName}": "ชื่อบริษัท",
    "{vendorName}": "ชื่อผู้ขาย",
    "{description}": "รายละเอียด",
    "{amount}": "จำนวนเงิน (ก่อน VAT)",
    "{vatAmount}": "VAT",
    "{whtRate}": "อัตราหัก ณ ที่จ่าย",
    "{whtAmount}": "จำนวนหัก ณ ที่จ่าย",
    "{netPaid}": "โอนจริง",
    "{status}": "สถานะ",
    "{oldStatus}": "สถานะเดิม",
    "{newStatus}": "สถานะใหม่",
    "{category}": "บัญชี",
    "{date}": "วันที่",
    "{invoiceNumber}": "เลขที่ใบกำกับ",
  },
  income: {
    "{companyName}": "ชื่อบริษัท",
    "{customerName}": "ชื่อลูกค้า",
    "{source}": "แหล่งที่มา",
    "{amount}": "จำนวนเงิน (ก่อน VAT)",
    "{vatAmount}": "VAT",
    "{whtRate}": "อัตราโดนหัก",
    "{whtAmount}": "จำนวนโดนหัก",
    "{netReceived}": "รับจริง",
    "{status}": "สถานะ",
    "{oldStatus}": "สถานะเดิม",
    "{newStatus}": "สถานะใหม่",
    "{category}": "บัญชี",
    "{date}": "วันที่",
    "{invoiceNumber}": "เลขที่ใบกำกับ",
  },
  reimbursement: {
    "{requesterName}": "ผู้ขอเบิก",
    "{amount}": "จำนวนเงิน",
    "{description}": "รายละเอียด",
    "{approverName}": "ผู้อนุมัติ",
    "{status}": "สถานะ",
    "{reason}": "เหตุผล",
  },
  summary: {
    "{companyName}": "ชื่อบริษัท",
    "{date}": "วันที่",
    "{totalIncome}": "รายรับรวม",
    "{totalExpense}": "รายจ่ายรวม",
    "{netCashFlow}": "กระแสเงินสดสุทธิ",
    "{pendingDocs}": "เอกสารค้าง",
    "{waitingWhtCerts}": "รอใบ 50 ทวิ",
  },
};

// Status labels in Thai (using new workflow statuses - matches Prisma schema enums)
export const STATUS_LABELS: Record<string, string> = {
  // Expense workflow statuses (ExpenseWorkflowStatus enum)
  DRAFT: "ร่าง",
  PAID: "จ่ายแล้ว",
  WAITING_TAX_INVOICE: "รอใบกำกับภาษี",
  TAX_INVOICE_RECEIVED: "ได้ใบกำกับแล้ว",
  WHT_PENDING_ISSUE: "รอออก 50 ทวิ",
  WHT_ISSUED: "ออก 50 ทวิแล้ว",
  WHT_SENT_TO_VENDOR: "ส่ง 50 ทวิแล้ว",
  READY_FOR_ACCOUNTING: "พร้อมส่งบัญชี",
  SENT_TO_ACCOUNTANT: "ส่งบัญชีแล้ว",
  COMPLETED: "เสร็จสิ้น",
  // Income workflow statuses (IncomeWorkflowStatus enum)
  RECEIVED: "รับเงินแล้ว",
  NO_INVOICE_NEEDED: "ไม่ต้องออกบิล",
  WAITING_INVOICE_ISSUE: "รอออกบิล",
  INVOICE_ISSUED: "ออกบิลแล้ว",
  INVOICE_SENT: "ส่งบิลแล้ว",
  WHT_PENDING_CERT: "รอใบ 50 ทวิ",
  WHT_CERT_RECEIVED: "ได้ใบ 50 ทวิแล้ว",
};

/**
 * Parse template with placeholders
 */
export function parseTemplate(
  template: string,
  data: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [placeholder, value] of Object.entries(data)) {
    const key = placeholder.startsWith("{") ? placeholder : `{${placeholder}}`;
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), String(value ?? ""));
  }
  return result;
}

/**
 * Format currency for Thai Baht
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Merge user settings with defaults (deep merge)
 */
export function mergeSettings(
  userSettings: Partial<LineNotifySettings> | null | undefined
): LineNotifySettings {
  if (!userSettings) return DEFAULT_NOTIFY_SETTINGS;

  return {
    expenses: {
      ...DEFAULT_NOTIFY_SETTINGS.expenses,
      ...userSettings.expenses,
    },
    incomes: {
      ...DEFAULT_NOTIFY_SETTINGS.incomes,
      ...userSettings.incomes,
    },
    approvals: {
      ...DEFAULT_NOTIFY_SETTINGS.approvals,
      ...userSettings.approvals,
    },
    reimbursements: {
      ...DEFAULT_NOTIFY_SETTINGS.reimbursements,
      ...userSettings.reimbursements,
    },
    comments: {
      ...DEFAULT_NOTIFY_SETTINGS.comments,
      ...userSettings.comments,
    },
    dailySummary: {
      ...DEFAULT_NOTIFY_SETTINGS.dailySummary,
      ...userSettings.dailySummary,
    },
    messageFormat: {
      ...DEFAULT_NOTIFY_SETTINGS.messageFormat,
      ...userSettings.messageFormat,
    },
    customTemplates: {
      ...DEFAULT_NOTIFY_SETTINGS.customTemplates,
      ...userSettings.customTemplates,
    },
  };
}
