/**
 * Shared Constants for Audit Logs
 * 
 * Centralized labels for field names, statuses, entity types, and actions
 * Used across audit log displays to ensure consistency
 */

// Field labels for translation (English field name -> Thai label)
export const FIELD_LABELS: Record<string, string> = {
  // Basic transaction fields
  amount: "จำนวนเงิน",
  description: "รายละเอียด",
  billDate: "วันที่",
  receiveDate: "วันที่รับเงิน",
  dueDate: "วันครบกำหนด",
  status: "สถานะ",
  notes: "หมายเหตุ",
  
  // Contact fields
  contactId: "ผู้ติดต่อ",
  contactName: "ชื่อผู้ติดต่อ",
  contact: "ผู้ติดต่อ",
  
  // Account fields
  account: "บัญชี",
  accountId: "บัญชี",
  
  // Document fields
  invoiceNumber: "เลขที่ใบกำกับ",
  referenceNo: "เลขอ้างอิง",
  
  // Payment fields
  paymentMethod: "วิธีชำระเงิน",
  
  // Tax fields
  vatRate: "อัตรา VAT",
  vatAmount: "ยอด VAT",
  isWht: "หักภาษี ณ ที่จ่าย",
  isWhtDeducted: "ลูกค้าหักภาษี ณ ที่จ่าย",
  whtRate: "อัตราหัก ณ ที่จ่าย",
  whtAmount: "ยอดหักภาษี ณ ที่จ่าย",
  whtType: "ประเภทหัก ณ ที่จ่าย",
  netPaid: "ยอดชำระสุทธิ",
  netReceived: "ยอดรับสุทธิ",
  
  // File upload fields
  slipUrls: "สลิปโอนเงิน",
  taxInvoiceUrls: "ใบกำกับภาษี",
  whtCertUrls: "หนังสือรับรองหัก ณ ที่จ่าย",
  customerSlipUrls: "สลิปลูกค้า",
  myBillCopyUrls: "สำเนาบิล",
  
  // Legacy/backward compatibility
  category: "หมวดหมู่",
  categoryId: "หมวดหมู่",
  
  // System fields (usually filtered out)
  updatedAt: "วันที่อัปเดต",
  company: "บริษัท",
  creator: "ผู้สร้าง",
};

// Status labels for translation
export const STATUS_LABELS: Record<string, string> = {
  // Expense document statuses (Legacy)
  WAITING_FOR_DOC: "ร้านส่งบิลตามมา",
  PENDING_PHYSICAL: "ได้บิลครบแล้ว (รอส่งบัญชี)",
  READY_TO_SEND: "พร้อมส่ง",
  SENT_TO_ACCOUNT: "ส่งบัญชีแล้ว",
  
  // Expense Workflow statuses (New)
  PAID: "จ่ายเงินแล้ว",
  WAITING_TAX_INVOICE: "รอใบกำกับภาษี",
  TAX_INVOICE_RECEIVED: "ได้รับใบกำกับแล้ว",
  WHT_PENDING_ISSUE: "รอออกใบ 50 ทวิ",
  WHT_ISSUED: "ออกใบ 50 ทวิแล้ว",
  WHT_SENT_TO_VENDOR: "ส่งใบ 50 ทวิให้ vendor แล้ว",
  READY_FOR_ACCOUNTING: "รอส่งบัญชี",
  SENT_TO_ACCOUNTANT: "ส่งบัญชีแล้ว",
  COMPLETED: "เสร็จสิ้น",
  
  // Income document statuses (Legacy)
  NO_DOC_REQUIRED: "ไม่ต้องทำเอกสาร",
  WAITING_ISSUE: "รอออกบิลให้ลูกค้า",
  WAITING_WHT_CERT: "รอใบ 50 ทวิ จากลูกค้า",
  PENDING_COPY_SEND: "เอกสารครบ (รอส่งบัญชี)",
  SENT_COPY: "ส่งสำเนาให้บัญชีแล้ว",
  
  // Income Workflow statuses (New)
  RECEIVED: "รับเงินแล้ว",
  NO_INVOICE_NEEDED: "ไม่ต้องออกบิล",
  WAITING_INVOICE_ISSUE: "รอออกใบกำกับ",
  INVOICE_ISSUED: "ออกใบกำกับแล้ว",
  INVOICE_SENT: "ส่งใบกำกับให้ลูกค้าแล้ว",
  WHT_PENDING_CERT: "รอใบ 50 ทวิจากลูกค้า",
  WHT_CERT_RECEIVED: "ได้รับใบ 50 ทวิแล้ว",
  
  // Reimbursement statuses
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  // PAID is already defined above
  
  // Legacy statuses (if any)
  PENDING_INVOICE: "รอออกบิล",
  COPY_SENT: "ส่งสำเนาแล้ว",
};

// Entity type labels
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Expense: "รายจ่าย",
  Income: "รายรับ",
  Contact: "ผู้ติดต่อ",
  Account: "บัญชี",
  Category: "หมวดหมู่",
  Company: "บริษัท",
  User: "ผู้ใช้",
  ReimbursementRequest: "เบิกจ่าย",
};

// Action labels
export const ACTION_LABELS: Record<string, string> = {
  CREATE: "สร้าง",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
  STATUS_CHANGE: "เปลี่ยนสถานะ",
  APPROVE: "อนุมัติ",
  REJECT: "ปฏิเสธ",
  RESTORE: "กู้คืน",
};

// Action colors for badges
export const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  UPDATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  STATUS_CHANGE: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  APPROVE: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  REJECT: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  RESTORE: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
};

/**
 * Helper Functions
 */

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function getActionColor(action: string): string {
  return ACTION_COLORS[action] || "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300";
}
