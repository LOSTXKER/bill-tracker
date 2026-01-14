/**
 * Reimbursement Request Route Configuration
 * Shared configuration for approval and payment workflow
 */

import { prisma } from "@/lib/db";
import type { ApprovalRouteConfig, PaymentRouteConfig } from "../approval-routes";

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

export const reimbursementPaymentConfig: PaymentRouteConfig = {
  entityName: "ReimbursementRequest",
  entityDisplayName: "คำขอเบิกจ่าย",
  
  prismaModel: prisma.reimbursementRequest,
  
  fields: {
    statusField: "status",
    companyIdField: "companyId",
    paidByField: "paidBy",
    paidAtField: "paidAt",
    paymentRefField: "paymentRef",
    descriptionField: "description",
    amountField: "netAmount",
  },
  
  payment: {
    permission: "reimbursements:pay",
    allowedStatuses: ["APPROVED"],
    paidStatus: "PAID",
  },
  
  findInclude: {
    company: true,
    contact: true,
  },
  
  updateInclude: {
    approver: {
      select: { id: true, name: true },
    },
    payer: {
      select: { id: true, name: true },
    },
    contact: true,
    linkedExpense: {
      select: { id: true, status: true },
    },
  },
  
  responseKey: "request",
};
