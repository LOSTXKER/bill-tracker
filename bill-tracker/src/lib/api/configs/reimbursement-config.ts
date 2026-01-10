/**
 * Reimbursement Request Route Configuration
 * Shared configuration for approval workflow
 */

import { prisma } from "@/lib/db";
import type { ApprovalRouteConfig } from "../approval-routes";

export const reimbursementApprovalConfig: ApprovalRouteConfig = {
  entityName: "ReimbursementRequest",
  entityDisplayName: "คำขอเบิกจ่าย",
  
  prismaModel: prisma.reimbursementRequest,
  
  fields: {
    statusField: "status",
    requesterIdField: null, // Anonymous system - no requester user relation
    companyIdField: "companyId",
    approvedByField: "approvedBy",
    approvedAtField: "approvedAt",
    rejectedReasonField: "rejectedReason",
    descriptionField: "description",
    amountField: "netAmount",
  },
  
  approval: {
    permission: "reimbursements:approve",
    pendingStatuses: ["PENDING", "FLAGGED"],
    approvedStatus: "APPROVED",
    rejectedStatus: "REJECTED",
    preventSelfApproval: false, // Anonymous system - no self-approval check needed
  },
  
  findInclude: {
    company: true,
    contact: true,
  },
  
  updateInclude: {
    approver: {
      select: { id: true, name: true },
    },
    contact: true,
  },
  
  responseKey: "request",
};
