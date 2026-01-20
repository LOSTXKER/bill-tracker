/**
 * Generic Approval Routes Factory
 * Creates approve/reject handlers for entities with approval workflow
 * (e.g., ReimbursementRequest)
 */

import { withAuth } from "./with-auth";
import { apiResponse } from "./response";
import { createAuditLog } from "@/lib/audit/logger";
import { hasPermission } from "@/lib/permissions/checker";
import type { AuditAction } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

// Prisma model interface for type safety
interface PrismaModelDelegate {
  findUnique: (args: { where: { id: string }; include?: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
  update: (args: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<Record<string, unknown>>;
}

export interface ApprovalRouteConfig {
  // Entity name for error messages
  entityName: string;
  entityDisplayName: string;
  
  // Prisma model accessor
  prismaModel: PrismaModelDelegate;
  
  // Fields to use for workflow
  fields: {
    statusField: string;          // e.g., "status"
    requesterIdField: string | null; // e.g., "requesterId" or null for anonymous
    companyIdField: string;       // e.g., "companyId"
    approvedByField: string;      // e.g., "approvedBy"
    approvedAtField: string;      // e.g., "approvedAt"
    rejectedReasonField?: string; // e.g., "rejectedReason"
    descriptionField: string;     // e.g., "description"
    amountField: string;          // e.g., "netAmount"
  };
  
  // Approval configuration
  approval: {
    permission: string;           // e.g., "reimbursements:approve"
    pendingStatuses: string[];    // e.g., ["PENDING", "FLAGGED"]
    approvedStatus: string;       // e.g., "APPROVED"
    rejectedStatus: string;       // e.g., "REJECTED"
    preventSelfApproval: boolean; // Prevent approving own requests
  };
  
  // Include for findUnique
  findInclude?: Record<string, unknown>;
  
  // Include for update response
  updateInclude?: Record<string, unknown>;
  
  // Response key (e.g., "request")
  responseKey: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create approval handler
 */
export function createApproveHandler(config: ApprovalRouteConfig) {
  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;
      
      // Find the entity
      const entity = await config.prismaModel.findUnique({
        where: { id },
        include: config.findInclude || { Company: true },
      });
      
      if (!entity) {
        return apiResponse.notFound(`${config.entityDisplayName} not found`);
      }
      
      const currentStatus = entity[config.fields.statusField] as string;
      const companyId = entity[config.fields.companyIdField] as string;
      const requesterId = config.fields.requesterIdField 
        ? (entity[config.fields.requesterIdField] as string | null)
        : null;
      
      // Check if status allows approval
      if (!config.approval.pendingStatuses.includes(currentStatus)) {
        return apiResponse.badRequest(
          `สามารถอนุมัติได้เฉพาะ${config.entityDisplayName}ที่รออนุมัติ`
        );
      }
      
      // Check permission
      const canApprove = await hasPermission(
        session.user.id,
        companyId,
        config.approval.permission
      );
      
      if (!canApprove) {
        return apiResponse.forbidden(`คุณไม่มีสิทธิ์อนุมัติ${config.entityDisplayName}`);
      }
      
      // Prevent self-approval if configured (only when requester is tracked)
      if (config.approval.preventSelfApproval && requesterId && requesterId === session.user.id) {
        return apiResponse.badRequest("ไม่สามารถอนุมัติคำขอของตัวเองได้");
      }
      
      // Update the entity
      const updateData: Record<string, unknown> = {
        [config.fields.statusField]: config.approval.approvedStatus,
        [config.fields.approvedByField]: session.user.id,
        [config.fields.approvedAtField]: new Date(),
      };
      
      const updatedEntity = await config.prismaModel.update({
        where: { id },
        data: updateData,
        include: config.updateInclude,
      });
      
      // Create audit log
      const description = (entity[config.fields.descriptionField] as string) || "ไม่ระบุ";
      const amount = entity[config.fields.amountField];
      
      await createAuditLog({
        userId: session.user.id,
        companyId,
        action: "APPROVE" as AuditAction,
        entityType: config.entityName,
        entityId: id,
        description: `อนุมัติ${config.entityDisplayName}: ${description} จำนวน ${amount} บาท`,
        changes: {
          before: { [config.fields.statusField]: currentStatus },
          after: { [config.fields.statusField]: config.approval.approvedStatus },
        },
      });
      
      return apiResponse.success(
        { [config.responseKey]: updatedEntity },
        "อนุมัติสำเร็จ"
      );
    })(request);
  };
}

/**
 * Create rejection handler
 */
export function createRejectHandler(config: ApprovalRouteConfig) {
  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;
      const body = await req.json();
      const { reason } = body;
      
      // Validate reason
      if (!reason || reason.trim() === "") {
        return apiResponse.badRequest("กรุณาระบุเหตุผลในการปฏิเสธ");
      }
      
      // Find the entity
      const entity = await config.prismaModel.findUnique({
        where: { id },
        include: config.findInclude || { Company: true },
      });
      
      if (!entity) {
        return apiResponse.notFound(`${config.entityDisplayName} not found`);
      }
      
      const currentStatus = entity[config.fields.statusField] as string;
      const companyId = entity[config.fields.companyIdField] as string;
      
      // Check if status allows rejection
      if (!config.approval.pendingStatuses.includes(currentStatus)) {
        return apiResponse.badRequest(
          `สามารถปฏิเสธได้เฉพาะ${config.entityDisplayName}ที่รออนุมัติ`
        );
      }
      
      // Check permission (same as approve)
      const canReject = await hasPermission(
        session.user.id,
        companyId,
        config.approval.permission
      );
      
      if (!canReject) {
        return apiResponse.forbidden(`คุณไม่มีสิทธิ์ปฏิเสธ${config.entityDisplayName}`);
      }
      
      // Update the entity
      const updateData: Record<string, unknown> = {
        [config.fields.statusField]: config.approval.rejectedStatus,
        [config.fields.approvedByField]: session.user.id,
        [config.fields.approvedAtField]: new Date(),
      };
      
      if (config.fields.rejectedReasonField) {
        updateData[config.fields.rejectedReasonField] = reason.trim();
      }
      
      const updatedEntity = await config.prismaModel.update({
        where: { id },
        data: updateData,
        include: config.updateInclude,
      });
      
      // Create audit log
      const description = (entity[config.fields.descriptionField] as string) || "ไม่ระบุ";
      
      await createAuditLog({
        userId: session.user.id,
        companyId,
        action: "STATUS_CHANGE" as AuditAction,
        entityType: config.entityName,
        entityId: id,
        description: `ปฏิเสธ${config.entityDisplayName}: ${description} เหตุผล: ${reason}`,
        changes: {
          before: { [config.fields.statusField]: currentStatus },
          after: { [config.fields.statusField]: config.approval.rejectedStatus, reason },
        },
      });
      
      return apiResponse.success(
        { [config.responseKey]: updatedEntity },
        "ปฏิเสธสำเร็จ"
      );
    })(request);
  };
}

/**
 * Helper to create both approve and reject handlers
 */
export function createApprovalRoutes(config: ApprovalRouteConfig) {
  return {
    approve: createApproveHandler(config),
    reject: createRejectHandler(config),
  };
}

// =============================================================================
// Payment Route Config
// =============================================================================

export interface PaymentRouteConfig {
  // Entity name for error messages
  entityName: string;
  entityDisplayName: string;
  
  // Prisma model accessor
  prismaModel: PrismaModelDelegate;
  
  // Fields to use for payment
  fields: {
    statusField: string;          // e.g., "status"
    companyIdField: string;       // e.g., "companyId"
    paidByField: string;          // e.g., "paidBy"
    paidAtField: string;          // e.g., "paidAt"
    paymentRefField: string;      // e.g., "paymentRef"
    descriptionField: string;     // e.g., "description"
    amountField: string;          // e.g., "netAmount"
  };
  
  // Payment configuration
  payment: {
    permission: string;           // e.g., "reimbursements:pay"
    allowedStatuses: string[];    // e.g., ["APPROVED"]
    paidStatus: string;           // e.g., "PAID"
  };
  
  // Include for findUnique
  findInclude?: Record<string, unknown>;
  
  // Include for update response
  updateInclude?: Record<string, unknown>;
  
  // Response key (e.g., "request")
  responseKey: string;
}

/**
 * Create payment handler
 */
export function createPayHandler(config: PaymentRouteConfig) {
  return (request: Request, routeParams: { params: Promise<{ id: string }> }) => {
    return withAuth(async (req, { session }) => {
      const { id } = await routeParams.params;
      const body = await req.json();
      const { paymentRef } = body;
      
      // Find the entity
      const entity = await config.prismaModel.findUnique({
        where: { id },
        include: config.findInclude || { Company: true, Contact: true },
      });
      
      if (!entity) {
        return apiResponse.notFound(`${config.entityDisplayName} not found`);
      }
      
      const currentStatus = entity[config.fields.statusField] as string;
      const companyId = entity[config.fields.companyIdField] as string;
      
      // Check if status allows payment
      if (!config.payment.allowedStatuses.includes(currentStatus)) {
        return apiResponse.badRequest(
          `สามารถจ่ายเงินได้เฉพาะ${config.entityDisplayName}ที่อนุมัติแล้วเท่านั้น`
        );
      }
      
      // Check permission
      const canPay = await hasPermission(
        session.user.id,
        companyId,
        config.payment.permission
      );
      
      if (!canPay) {
        return apiResponse.forbidden("คุณไม่มีสิทธิ์บันทึกการจ่ายเงิน");
      }
      
      // Update the entity
      const updateData: Record<string, unknown> = {
        [config.fields.statusField]: config.payment.paidStatus,
        [config.fields.paidByField]: session.user.id,
        [config.fields.paidAtField]: new Date(),
        [config.fields.paymentRefField]: paymentRef || null,
      };
      
      const updatedEntity = await config.prismaModel.update({
        where: { id },
        data: updateData,
        include: config.updateInclude,
      });
      
      // Create audit log
      const description = (entity[config.fields.descriptionField] as string) || "ไม่ระบุ";
      const amount = entity[config.fields.amountField];
      
      await createAuditLog({
        userId: session.user.id,
        companyId,
        action: "STATUS_CHANGE" as AuditAction,
        entityType: config.entityName,
        entityId: id,
        description: `จ่ายเงิน${config.entityDisplayName}: ${description} จำนวน ${amount} บาท`,
        changes: {
          before: { [config.fields.statusField]: currentStatus },
          after: { [config.fields.statusField]: config.payment.paidStatus, paymentRef },
        },
      });
      
      return apiResponse.success(
        { [config.responseKey]: updatedEntity },
        "บันทึกการจ่ายเงินสำเร็จ"
      );
    })(request);
  };
}