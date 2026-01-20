/**
 * Shared Expense Route Configuration
 * Used by both /api/expenses and /api/expenses/[id] routes
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { notifyExpense } from "@/lib/notifications/line-messaging";
import type { TransactionRouteConfig } from "../transaction-routes";
import type { PaidByType, SettlementStatus } from "@prisma/client";

// =============================================================================
// WHT Change Rules
// =============================================================================

// สถานะที่ห้ามเปลี่ยน WHT โดยเด็ดขาด
const WHT_LOCKED_STATUSES = ["SENT_TO_ACCOUNTANT", "COMPLETED"];

// สถานะที่ต้อง confirm ก่อนเปลี่ยน WHT (จะ rollback status อัตโนมัติ)
const WHT_CONFIRM_REQUIRED_STATUSES = ["WHT_ISSUED", "READY_FOR_ACCOUNTING"];

export interface WhtChangeValidation {
  allowed: boolean;
  requiresConfirmation: boolean;
  message?: string;
  rollbackStatus?: string;
}

/**
 * ตรวจสอบว่าสามารถเปลี่ยน WHT ได้หรือไม่
 */
export function validateWhtChange(
  currentStatus: string,
  wasWht: boolean,
  nowWht: boolean,
  hasWhtCert: boolean
): WhtChangeValidation {
  // ไม่มีการเปลี่ยน WHT
  if (wasWht === nowWht) {
    return { allowed: true, requiresConfirmation: false };
  }

  // ห้ามเปลี่ยนหลังส่งบัญชี
  if (WHT_LOCKED_STATUSES.includes(currentStatus)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      message: "ไม่สามารถเปลี่ยนสถานะหัก ณ ที่จ่ายได้ เนื่องจากรายการนี้ส่งบัญชีแล้ว",
    };
  }

  // เปลี่ยนจาก หัก → ไม่หัก ตอนที่ออก 50 ทวิแล้ว
  if (wasWht && !nowWht && currentStatus === "WHT_ISSUED") {
    return {
      allowed: true,
      requiresConfirmation: true,
      message: "คุณได้ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) แล้ว การยกเลิกจะต้อง void เอกสาร 50 ทวิด้วย",
      rollbackStatus: "TAX_INVOICE_RECEIVED",
    };
  }

  // เปลี่ยนจาก หัก → ไม่หัก ตอนพร้อมส่งบัญชี (มี WHT cert)
  if (wasWht && !nowWht && currentStatus === "READY_FOR_ACCOUNTING" && hasWhtCert) {
    return {
      allowed: true,
      requiresConfirmation: true,
      message: "คุณมีหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) แนบอยู่ การยกเลิกจะลบเอกสารออกด้วย",
      rollbackStatus: "TAX_INVOICE_RECEIVED",
    };
  }

  // เปลี่ยนจาก ไม่หัก → หัก ตอนพร้อมส่งบัญชี
  if (!wasWht && nowWht && currentStatus === "READY_FOR_ACCOUNTING") {
    return {
      allowed: true,
      requiresConfirmation: true,
      message: "การเพิ่มหัก ณ ที่จ่ายจะต้องออกหนังสือรับรอง (50 ทวิ) ก่อนส่งบัญชี",
      rollbackStatus: "WHT_PENDING_ISSUE",
    };
  }

  return { allowed: true, requiresConfirmation: false };
}

export const expenseRouteConfig: Omit<TransactionRouteConfig<any, any, any>, "prismaModel"> & {
  prismaModel: typeof prisma.expense;
} = {
  modelName: "expense",
  displayName: "Expense",
  prismaModel: prisma.expense,
  
  permissions: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
    delete: "expenses:delete",
  },
  
  fields: {
    dateField: "billDate",
    netAmountField: "netPaid",
    statusField: "status",
  },
  
  transformCreateData: (body) => {
    const { vatAmount, whtAmount, netPaid, ...data } = body;
    
    const isWht = data.isWht || false;
    const hasTaxInvoice = (data.taxInvoiceUrls?.length || 0) > 0;
    
    // NEW: Always start as DRAFT - workflowStatus will be updated when submitted
    // The approvalStatus is set to NOT_REQUIRED by default (schema default)
    // It will be changed to PENDING when user submits for approval (if required)
    const workflowStatus = "DRAFT";
    
    return {
      id: randomUUID(), // Generate unique ID for expense
      updatedAt: new Date(), // Required field without @updatedAt directive
      contactId: data.contactId || null,
      contactName: data.contactName || null, // One-time contact name (not saved)
      amount: data.amount,
      vatRate: data.vatRate || 0,
      vatAmount: vatAmount || null,
      isWht: isWht,
      whtRate: data.whtRate || null,
      whtAmount: whtAmount || null,
      whtType: data.whtType || null,
      netPaid: netPaid,
      description: data.description,
      accountId: data.accountId || null,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      billDate: data.billDate ? new Date(data.billDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      // status is legacy field (ExpenseDocStatus enum) - don't override, use schema default
      workflowStatus: workflowStatus,
      // Document type for VAT 0% expenses (determines workflow steps)
      documentType: data.documentType || "TAX_INVOICE",
      hasTaxInvoice: hasTaxInvoice,
      hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
      notes: data.notes,
      slipUrls: data.slipUrls || [],
      taxInvoiceUrls: data.taxInvoiceUrls || [],
      whtCertUrls: data.whtCertUrls || [],
      otherDocUrls: data.otherDocUrls || [],
      referenceUrls: data.referenceUrls || [],
    };
  },
  
  transformUpdateData: (body, existingData?: any) => {
    const { vatAmount, whtAmount, netPaid, ...data } = body;
    const updateData: any = {};
    
    // Only update fields that are explicitly provided
    if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
    if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
    if (data.isWht !== undefined) updateData.isWht = data.isWht;
    if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
    if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
    if (data.whtType !== undefined) updateData.whtType = data.whtType;
    if (netPaid !== undefined) updateData.netPaid = netPaid;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.accountId !== undefined) updateData.accountId = data.accountId || null;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.billDate !== undefined) updateData.billDate = data.billDate ? new Date(data.billDate) : undefined;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    // status is legacy field (ExpenseDocStatus enum) - don't update from new workflow values
    if (data.workflowStatus !== undefined) updateData.workflowStatus = data.workflowStatus;
    // Document type for VAT 0% expenses
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle file URLs (array versions only)
    if (data.slipUrls !== undefined) updateData.slipUrls = data.slipUrls;
    if (data.taxInvoiceUrls !== undefined) {
      updateData.taxInvoiceUrls = data.taxInvoiceUrls;
      updateData.hasTaxInvoice = data.taxInvoiceUrls.length > 0;
      if (data.taxInvoiceUrls.length > 0 && !updateData.taxInvoiceAt) {
        updateData.taxInvoiceAt = new Date();
      }
    }
    if (data.whtCertUrls !== undefined) {
      updateData.whtCertUrls = data.whtCertUrls;
      updateData.hasWhtCert = data.whtCertUrls.length > 0;
    }
    if (data.referenceUrls !== undefined) {
      updateData.referenceUrls = data.referenceUrls;
    }
    if (data.otherDocUrls !== undefined) {
      updateData.otherDocUrls = data.otherDocUrls;
    }
    
    // ==========================================================================
    // WHT Change Validation & Auto-adjust workflow status
    // ==========================================================================
    if (existingData && data.isWht !== undefined && data.isWht !== existingData.isWht) {
      const wasWht = existingData.isWht;
      const nowWht = data.isWht;
      const currentStatus = existingData.workflowStatus;
      const hasTaxInvoice = updateData.hasTaxInvoice ?? existingData.hasTaxInvoice;
      const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;
      
      // Validate WHT change
      const validation = validateWhtChange(currentStatus, wasWht, nowWht, hasWhtCert);
      
      if (!validation.allowed) {
        throw new Error(validation.message || "ไม่สามารถเปลี่ยนสถานะหัก ณ ที่จ่ายได้");
      }
      
      // Check if confirmation was provided (via special field)
      if (validation.requiresConfirmation && !data._whtChangeConfirmed) {
        // Return validation info for frontend to show confirmation dialog
        throw new Error(JSON.stringify({
          code: "WHT_CHANGE_REQUIRES_CONFIRMATION",
          message: validation.message,
          rollbackStatus: validation.rollbackStatus,
        }));
      }
      
      // Apply rollback status if needed
      if (validation.rollbackStatus) {
        updateData.workflowStatus = validation.rollbackStatus;
      } else {
        // Default behavior: auto-adjust status
        if (!wasWht && nowWht) {
          // ไม่หัก → หัก: ต้องออก 50 ทวิ
          if (currentStatus === "READY_FOR_ACCOUNTING" || currentStatus === "TAX_INVOICE_RECEIVED") {
            if (!hasWhtCert) {
              updateData.workflowStatus = "WHT_PENDING_ISSUE";
            }
          }
        } else if (wasWht && !nowWht) {
          // หัก → ไม่หัก: ข้าม step 50 ทวิ
          if (currentStatus === "WHT_PENDING_ISSUE") {
            if (hasTaxInvoice) {
              updateData.workflowStatus = "READY_FOR_ACCOUNTING";
            }
          }
        }
      }
      
      // Record WHT change reason if provided
      if (data._whtChangeReason) {
        updateData.notes = existingData.notes 
          ? `${existingData.notes}\n\n[WHT เปลี่ยน: ${data._whtChangeReason}]`
          : `[WHT เปลี่ยน: ${data._whtChangeReason}]`;
      }
    }
    
    // Clean up internal fields
    delete updateData._whtChangeConfirmed;
    delete updateData._whtChangeReason;
    
    return updateData;
  },
  
  afterCreate: async (item, body, context) => {
    // Handle payers if provided
    if (body.payers && Array.isArray(body.payers) && body.payers.length > 0) {
      for (const payer of body.payers as Array<{
        paidByType: PaidByType;
        paidByUserId?: string | null;
        paidByPettyCashFundId?: string | null;
        paidByName?: string | null;
        paidByBankName?: string | null;
        paidByBankAccount?: string | null;
        amount: number;
        settlementStatus?: SettlementStatus;
        settledAt?: string;
        settlementRef?: string;
      }>) {
        // Determine settlement status based on payer type
        // Only USER type requires settlement (COMPANY and PETTY_CASH don't)
        let settlementStatus: SettlementStatus = payer.settlementStatus || "NOT_REQUIRED";
        if (!payer.settlementStatus && payer.paidByType === "USER") {
          settlementStatus = "PENDING";
        }

        // Create ExpensePayment record
        await prisma.expensePayment.create({
          data: {
            expenseId: item.id,
            paidByType: payer.paidByType,
            paidByUserId: payer.paidByUserId || null,
            paidByPettyCashFundId: payer.paidByPettyCashFundId || null,
            paidByName: payer.paidByName || null,
            paidByBankName: payer.paidByBankName || null,
            paidByBankAccount: payer.paidByBankAccount || null,
            amount: payer.amount,
            settlementStatus,
            settledAt: payer.settledAt ? new Date(payer.settledAt) : null,
            settledBy: settlementStatus === "SETTLED" ? context.session.user.id : null,
            settlementRef: payer.settlementRef || null,
          },
        });

        // If paid by PETTY_CASH, deduct from fund and create transaction
        if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
          // Deduct from fund balance
          await prisma.pettyCashFund.update({
            where: { id: payer.paidByPettyCashFundId },
            data: {
              currentAmount: {
                decrement: payer.amount,
              },
            },
          });

          // Create petty cash transaction record
          await prisma.pettyCashTransaction.create({
            data: {
              fundId: payer.paidByPettyCashFundId,
              type: "EXPENSE",
              amount: payer.amount,
              expenseId: item.id,
              description: item.description || "รายจ่าย",
              createdBy: context.session.user.id,
            },
          });
        }
      }
    }
  },

  afterUpdate: async (item, body, context) => {
    // Handle payers if provided
    if (body.payers && Array.isArray(body.payers)) {
      // Get existing payments to refund petty cash
      const existingPayments = await prisma.expensePayment.findMany({
        where: { expenseId: item.id },
      });

      // Refund petty cash from existing payments that will be deleted/changed
      for (const payment of existingPayments) {
        if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
          // Return money to fund
          await prisma.pettyCashFund.update({
            where: { id: payment.paidByPettyCashFundId },
            data: {
              currentAmount: {
                increment: Number(payment.amount),
              },
            },
          });

          // Create adjustment transaction (refund)
          await prisma.pettyCashTransaction.create({
            data: {
              fundId: payment.paidByPettyCashFundId,
              type: "ADJUSTMENT",
              amount: Number(payment.amount),
              description: `คืนเงินจากการแก้ไขรายจ่าย: ${item.description || "ไม่ระบุ"}`,
              createdBy: context.session.user.id,
            },
          });
        }
      }

      // Delete existing payments (except SETTLED user payments)
      await prisma.expensePayment.deleteMany({
        where: {
          expenseId: item.id,
          OR: [
            { settlementStatus: { not: "SETTLED" } },
            { paidByType: { not: "USER" } },
          ],
        },
      });

      // Create new payments
      if (body.payers.length > 0) {
        for (const payer of body.payers as Array<{
          paidByType: PaidByType;
          paidByUserId?: string | null;
          paidByPettyCashFundId?: string | null;
          paidByName?: string | null;
          paidByBankName?: string | null;
          paidByBankAccount?: string | null;
          amount: number;
        }>) {
          // Determine settlement status based on payer type
          let settlementStatus: SettlementStatus = "NOT_REQUIRED";
          if (payer.paidByType === "USER") {
            settlementStatus = "PENDING";
          }

          // Create ExpensePayment
          await prisma.expensePayment.create({
            data: {
              expenseId: item.id,
              paidByType: payer.paidByType,
              paidByUserId: payer.paidByUserId || null,
              paidByPettyCashFundId: payer.paidByPettyCashFundId || null,
              paidByName: payer.paidByName || null,
              paidByBankName: payer.paidByBankName || null,
              paidByBankAccount: payer.paidByBankAccount || null,
              amount: payer.amount,
              settlementStatus,
            },
          });

          // If paid by PETTY_CASH, deduct from fund
          if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
            await prisma.pettyCashFund.update({
              where: { id: payer.paidByPettyCashFundId },
              data: {
                currentAmount: {
                  decrement: payer.amount,
                },
              },
            });

            // Create petty cash transaction
            await prisma.pettyCashTransaction.create({
              data: {
                fundId: payer.paidByPettyCashFundId,
                type: "EXPENSE",
                amount: payer.amount,
                expenseId: item.id,
                description: item.description || "รายจ่าย (แก้ไข)",
                createdBy: context.session.user.id,
              },
            });
          }
        }
      }
    }
  },

  notifyCreate: async (companyId, data, baseUrl) => {
    await notifyExpense(companyId, {
      id: data.id,
      companyCode: data.companyCode,
      companyName: data.companyName,
      vendorName: data.vendorName || data.description,
      description: data.description,
      amount: Number(data.amount),
      vatAmount: data.vatAmount ? Number(data.vatAmount) : undefined,
      isWht: data.isWht || false,
      whtRate: data.whtRate ? Number(data.whtRate) : undefined,
      whtAmount: data.whtAmount ? Number(data.whtAmount) : undefined,
      netPaid: Number(data.netPaid),
      status: data.status,
    }, baseUrl);
  },
  
  getEntityDisplayName: (expense: any) => 
    expense.contact?.name || expense.description || undefined,
};
