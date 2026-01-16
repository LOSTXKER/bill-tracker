/**
 * Centralized Audit Logger
 * 
 * Provides functions to log all user actions in the system
 * for compliance, debugging, and security purposes.
 */

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import type { AuditAction } from "@prisma/client";

interface CreateAuditLogParams {
  userId: string;
  companyId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: any;
  description?: string;
}

/**
 * Create an audit log entry
 * Automatically captures IP address and user agent from request headers
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes,
        description: params.description,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Get a display name for an entity (for descriptions)
 */
function getEntityName(entity: any): string {
  if (!entity) return "Unknown";
  
  // Try common name fields
  if (entity.name) return entity.name;
  if (entity.description) return entity.description;
  if (entity.vendorName) return entity.vendorName;
  if (entity.customerName) return entity.customerName;
  if (entity.invoiceNumber) return `Invoice #${entity.invoiceNumber}`;
  
  // Fallback to ID
  return entity.id ? `ID: ${entity.id.substring(0, 8)}...` : "Unknown";
}

/**
 * Log creation of a new entity
 */
export async function logCreate(
  entityType: string,
  entity: any,
  userId: string,
  companyId?: string
): Promise<void> {
  const entityName = getEntityName(entity);
  const typeLabel = getEntityTypeLabel(entityType);
  
  await createAuditLog({
    userId,
    companyId,
    action: "CREATE",
    entityType,
    entityId: entity.id,
    changes: { created: entity },
    description: `สร้าง${typeLabel}ใหม่: ${entityName}`,
  });
}

// Thai labels for field names
const FIELD_LABELS: Record<string, string> = {
  amount: "จำนวนเงิน",
  description: "รายละเอียด",
  billDate: "วันที่",
  dueDate: "วันครบกำหนด",
  status: "สถานะ",
  category: "หมวดหมู่",
  categoryId: "หมวดหมู่",
  contactId: "ผู้ติดต่อ",
  notes: "หมายเหตุ",
  invoiceNumber: "เลขที่ใบกำกับ",
  referenceNo: "เลขอ้างอิง",
  paymentMethod: "วิธีชำระเงิน",
  vatRate: "อัตรา VAT",
  whtRate: "อัตราหัก ณ ที่จ่าย",
  slipUrls: "สลิปโอนเงิน",
  taxInvoiceUrls: "ใบกำกับภาษี",
  whtCertUrls: "หนังสือรับรองหัก ณ ที่จ่าย",
  customerSlipUrls: "สลิปลูกค้า",
  myBillCopyUrls: "สำเนาบิล",
};

/**
 * Get Thai label for field name
 */
function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

/**
 * Log update of an existing entity
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  before: any,
  after: any,
  userId: string,
  companyId?: string
): Promise<void> {
  const entityName = getEntityName(after || before);
  const typeLabel = getEntityTypeLabel(entityType);
  
  // Calculate what fields changed
  const changedFields: string[] = [];
  if (before && after) {
    Object.keys(after).forEach((key) => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    });
  }
  
  // Convert field names to Thai labels
  const changedFieldLabels = changedFields.map(getFieldLabel);
  const fieldsDesc = changedFieldLabels.length > 0 
    ? ` (${changedFieldLabels.join(", ")})` 
    : "";
  
  await createAuditLog({
    userId,
    companyId,
    action: "UPDATE",
    entityType,
    entityId,
    changes: { before, after, changedFields, changedFieldLabels },
    description: `แก้ไข${typeLabel}: ${entityName}${fieldsDesc}`,
  });
}

/**
 * Log deletion of an entity
 */
export async function logDelete(
  entityType: string,
  entity: any,
  userId: string,
  companyId?: string
): Promise<void> {
  const entityName = getEntityName(entity);
  const typeLabel = getEntityTypeLabel(entityType);
  
  await createAuditLog({
    userId,
    companyId,
    action: "DELETE",
    entityType,
    entityId: entity.id,
    changes: { deleted: entity },
    description: `ลบ${typeLabel}: ${entityName}`,
  });
}

// Thai labels for expense statuses (Workflow)
const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PAID: "จ่ายเงินแล้ว",
  WAITING_TAX_INVOICE: "รอใบกำกับ",
  TAX_INVOICE_RECEIVED: "ได้ใบกำกับแล้ว",
  WHT_PENDING_ISSUE: "รอออก 50 ทวิ",
  WHT_ISSUED: "ออก 50 ทวิแล้ว",
  READY_FOR_ACCOUNTING: "รอส่งบัญชี",
  SENT_TO_ACCOUNTANT: "ส่งบัญชีแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

// Thai labels for income statuses (Workflow)
const INCOME_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "รับเงินแล้ว",
  NO_INVOICE_NEEDED: "ไม่ต้องออกบิล",
  WAITING_INVOICE_ISSUE: "รอออกบิล",
  INVOICE_ISSUED: "ออกบิลแล้ว",
  WHT_PENDING_CERT: "รอใบ 50 ทวิ",
  WHT_CERT_RECEIVED: "ได้ใบ 50 ทวิ",
  READY_FOR_ACCOUNTING: "รอส่งบัญชี",
  SENT_TO_ACCOUNTANT: "ส่งบัญชีแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

// Thai labels for entity types
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Expense: "รายจ่าย",
  Income: "รายรับ",
  Contact: "ผู้ติดต่อ",
  Category: "หมวดหมู่",
};

/**
 * Get Thai label for status
 */
function getStatusLabel(entityType: string, status: string): string {
  if (entityType === "Expense") {
    return EXPENSE_STATUS_LABELS[status] || status;
  }
  if (entityType === "Income") {
    return INCOME_STATUS_LABELS[status] || status;
  }
  return status;
}

/**
 * Get Thai label for entity type
 */
function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

/**
 * Log status change of an entity
 */
export async function logStatusChange(
  entityType: string,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  companyId?: string,
  entityName?: string
): Promise<void> {
  const typeLabel = getEntityTypeLabel(entityType);
  const oldLabel = getStatusLabel(entityType, oldStatus);
  const newLabel = getStatusLabel(entityType, newStatus);
  const name = entityName || "";
  
  const description = name 
    ? `เปลี่ยนสถานะ${typeLabel} "${name}": ${oldLabel} → ${newLabel}`
    : `เปลี่ยนสถานะ${typeLabel}: ${oldLabel} → ${newLabel}`;
  
  await createAuditLog({
    userId,
    companyId,
    action: "STATUS_CHANGE",
    entityType,
    entityId,
    changes: { 
      oldStatus, 
      newStatus,
      oldStatusLabel: oldLabel,
      newStatusLabel: newLabel,
    },
    description,
  });
}

/**
 * Log approval of an entity
 */
export async function logApprove(
  entityType: string,
  entity: any,
  userId: string,
  companyId?: string
): Promise<void> {
  const entityName = getEntityName(entity);
  
  await createAuditLog({
    userId,
    companyId,
    action: "APPROVE",
    entityType,
    entityId: entity.id,
    changes: { approved: entity },
    description: `อนุมัติ${entityType}: ${entityName}`,
  });
}

/**
 * Log data export
 */
export async function logExport(
  entityType: string,
  exportFormat: string,
  filters: any,
  userId: string,
  companyId?: string
): Promise<void> {
  await createAuditLog({
    userId,
    companyId,
    action: "EXPORT",
    entityType,
    entityId: `export_${Date.now()}`,
    changes: { format: exportFormat, filters },
    description: `ส่งออกข้อมูล${entityType} เป็น ${exportFormat}`,
  });
}

/**
 * Log team member invitation
 */
export async function logMemberInvite(
  memberEmail: string,
  permissions: string[],
  userId: string,
  companyId: string
): Promise<void> {
  await createAuditLog({
    userId,
    companyId,
    action: "CREATE",
    entityType: "TeamMember",
    entityId: `invite_${Date.now()}`,
    changes: { email: memberEmail, permissions },
    description: `เชิญสมาชิกใหม่: ${memberEmail}`,
  });
}

/**
 * Log team member removal
 */
export async function logMemberRemove(
  memberName: string,
  memberEmail: string,
  userId: string,
  companyId: string
): Promise<void> {
  await createAuditLog({
    userId,
    companyId,
    action: "DELETE",
    entityType: "TeamMember",
    entityId: `remove_${Date.now()}`,
    changes: { name: memberName, email: memberEmail },
    description: `ลบสมาชิก: ${memberName} (${memberEmail})`,
  });
}

/**
 * Log permission changes for a team member
 */
export async function logPermissionChange(
  memberName: string,
  oldPermissions: string[],
  newPermissions: string[],
  userId: string,
  companyId: string
): Promise<void> {
  const added = newPermissions.filter(p => !oldPermissions.includes(p));
  const removed = oldPermissions.filter(p => !newPermissions.includes(p));
  
  let description = `แก้ไขสิทธิ์: ${memberName}`;
  if (added.length > 0) description += ` (+${added.length})`;
  if (removed.length > 0) description += ` (-${removed.length})`;
  
  await createAuditLog({
    userId,
    companyId,
    action: "UPDATE",
    entityType: "TeamMember",
    entityId: `permission_${Date.now()}`,
    changes: { 
      before: oldPermissions, 
      after: newPermissions,
      added,
      removed
    },
    description,
  });
}

/**
 * Log company settings change
 */
export async function logSettingsChange(
  settingName: string,
  oldValue: any,
  newValue: any,
  userId: string,
  companyId: string
): Promise<void> {
  await createAuditLog({
    userId,
    companyId,
    action: "UPDATE",
    entityType: "CompanySettings",
    entityId: companyId,
    changes: { 
      setting: settingName,
      before: oldValue,
      after: newValue
    },
    description: `แก้ไขการตั้งค่า: ${settingName}`,
  });
}

/**
 * Log bulk operations
 */
export async function logBulkAction(
  action: AuditAction,
  entityType: string,
  count: number,
  filters: any,
  userId: string,
  companyId?: string
): Promise<void> {
  const actionText = {
    CREATE: "สร้าง",
    UPDATE: "แก้ไข",
    DELETE: "ลบ",
    STATUS_CHANGE: "เปลี่ยนสถานะ",
    APPROVE: "อนุมัติ",
    EXPORT: "ส่งออก",
  }[action] || action;
  
  await createAuditLog({
    userId,
    companyId,
    action,
    entityType,
    entityId: `bulk_${Date.now()}`,
    changes: { count, filters },
    description: `${actionText}${entityType}จำนวน ${count} รายการ`,
  });
}

/**
 * Log WHT (Withholding Tax) change
 * This is a special audit log for tracking changes to WHT settings
 * which may require document adjustments (e.g., voiding 50 ทวิ forms)
 */
export async function logWhtChange(
  entityType: "Expense" | "Income",
  entityId: string,
  wasWht: boolean,
  nowWht: boolean,
  reason: string | undefined,
  statusRollback: { from: string; to: string } | undefined,
  userId: string,
  companyId?: string,
  entityName?: string
): Promise<void> {
  const typeLabel = getEntityTypeLabel(entityType);
  const changeDesc = wasWht ? "ยกเลิกหัก ณ ที่จ่าย" : "เพิ่มหัก ณ ที่จ่าย";
  const name = entityName ? ` "${entityName}"` : "";
  
  let description = `${changeDesc}${typeLabel}${name}`;
  if (statusRollback) {
    description += ` (ย้อนสถานะ: ${statusRollback.from} → ${statusRollback.to})`;
  }
  
  await createAuditLog({
    userId,
    companyId,
    action: "UPDATE",
    entityType,
    entityId,
    changes: {
      whtChange: {
        before: wasWht,
        after: nowWht,
        reason: reason || undefined,
        statusRollback,
      },
    },
    description,
  });
}