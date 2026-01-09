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
    requesterIdField: "requesterId",
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
    preventSelfApproval: true,
  },
  
  findInclude: {
    requester: true,
    company: true,
  },
  
  updateInclude: {
    requester: {
      select: { id: true, name: true, email: true },
    },
    approver: {
      select: { id: true, name: true },
    },
    categoryRef: true,
    contact: true,
  },
  
  responseKey: "request",
};
