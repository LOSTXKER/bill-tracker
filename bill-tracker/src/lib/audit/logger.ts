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
  
  await createAuditLog({
    userId,
    companyId,
    action: "CREATE",
    entityType,
    entityId: entity.id,
    changes: { created: entity },
    description: `สร้าง${entityType}ใหม่: ${entityName}`,
  });
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
  
  // Calculate what fields changed
  const changedFields: string[] = [];
  if (before && after) {
    Object.keys(after).forEach((key) => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    });
  }
  
  const fieldsDesc = changedFields.length > 0 
    ? ` (${changedFields.join(", ")})` 
    : "";
  
  await createAuditLog({
    userId,
    companyId,
    action: "UPDATE",
    entityType,
    entityId,
    changes: { before, after, changedFields },
    description: `แก้ไข${entityType}: ${entityName}${fieldsDesc}`,
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
  
  await createAuditLog({
    userId,
    companyId,
    action: "DELETE",
    entityType,
    entityId: entity.id,
    changes: { deleted: entity },
    description: `ลบ${entityType}: ${entityName}`,
  });
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
  const name = entityName || entityId.substring(0, 8) + "...";
  
  await createAuditLog({
    userId,
    companyId,
    action: "STATUS_CHANGE",
    entityType,
    entityId,
    changes: { oldStatus, newStatus },
    description: `เปลี่ยนสถานะ${entityType} ${name}: ${oldStatus} → ${newStatus}`,
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
