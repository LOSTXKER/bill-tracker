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
  // Daily Summary
  dailySummary: {
    enabled: boolean;
    time: string; // HH:mm format
  };
  // Budget Alerts
  budgetAlerts: {
    enabled: boolean;
    thresholds: number[]; // e.g., [50, 80, 100] for 50%, 80%, 100%
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
    dailySummary: string;
    budgetAlert: string;
  };
}

// Default settings
export const DEFAULT_NOTIFY_SETTINGS: LineNotifySettings = {
  expenses: {
    onCreate: { enabled: true },
    onStatusChange: { enabled: true },
    onDelete: { enabled: false },
    onUpdate: { enabled: false },
  },
  incomes: {
    onCreate: { enabled: true },
    onStatusChange: { enabled: true },
    onDelete: { enabled: false },
    onUpdate: { enabled: false },
  },
  dailySummary: {
    enabled: false,
    time: "09:00",
  },
  budgetAlerts: {
    enabled: true,
    thresholds: [80, 100],
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
    dailySummary: "[สรุปประจำวัน {date}]\nรายรับ: ฿{totalIncome}\nรายจ่าย: ฿{totalExpense}\nสุทธิ: ฿{netCashFlow}",
    budgetAlert: "[แจ้งเตือนงบประมาณ]\nหมวด: {category}\nใช้ไป: {percentage}%\n({spent} / {budget})",
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
  summary: {
    "{companyName}": "ชื่อบริษัท",
    "{date}": "วันที่",
    "{totalIncome}": "รายรับรวม",
    "{totalExpense}": "รายจ่ายรวม",
    "{netCashFlow}": "กระแสเงินสดสุทธิ",
    "{pendingDocs}": "เอกสารค้าง",
    "{waitingWhtCerts}": "รอใบ 50 ทวิ",
  },
  budget: {
    "{companyName}": "ชื่อบริษัท",
    "{category}": "บัญชี",
    "{spent}": "ใช้ไปแล้ว",
    "{budget}": "งบประมาณ",
    "{percentage}": "เปอร์เซ็นต์",
    "{remaining}": "เหลือ",
  },
};

// Status labels in Thai (using new workflow statuses)
export const STATUS_LABELS: Record<string, string> = {
  // Expense workflow statuses
  PAID: "จ่ายแล้ว",
  WAITING_TAX_INVOICE: "รอใบกำกับภาษี",
  RECEIVED_TAX_INVOICE: "ได้ใบกำกับแล้ว",
  WHT_PENDING_ISSUE: "รอออก 50 ทวิ",
  WHT_ISSUED: "ออก 50 ทวิแล้ว",
  READY_FOR_ACCOUNTING: "พร้อมส่งบัญชี",
  SENT_TO_ACCOUNTANT: "ส่งบัญชีแล้ว",
  // Income workflow statuses
  RECEIVED: "รับเงินแล้ว",
  WAITING_INVOICE_ISSUE: "รอออกบิล",
  INVOICE_ISSUED: "ออกบิลแล้ว",
  WHT_PENDING_CERT: "รอใบ 50 ทวิ",
  WHT_RECEIVED: "ได้ใบ 50 ทวิแล้ว",
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
    dailySummary: {
      ...DEFAULT_NOTIFY_SETTINGS.dailySummary,
      ...userSettings.dailySummary,
    },
    budgetAlerts: {
      ...DEFAULT_NOTIFY_SETTINGS.budgetAlerts,
      ...userSettings.budgetAlerts,
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
