/**
 * Shared Expense Route Configuration
 * Used by both /api/expenses and /api/expenses/[id] routes
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { notifyExpense } from "@/lib/notifications/line-messaging";
import type { TransactionRouteConfig } from "../transaction-routes";
import type { PaidByType, SettlementStatus } from "@prisma/client";
import { validateExpenseWhtChange } from "@/lib/validations/wht-validator";

// Re-export WHT types and validator for backward compatibility
export { validateExpenseWhtChange as validateWhtChange } from "@/lib/validations/wht-validator";
export type { WhtChangeValidation } from "@/lib/validations/wht-validator";

// Internal alias for use within this file
const validateWhtChange = validateExpenseWhtChange;

function deduplicatePayers<T extends { paidByType: string; paidByUserId?: string | null; paidByPettyCashFundId?: string | null; amount: number }>(payers: T[]): T[] {
  const seen = new Map<string, T>();
  for (const payer of payers) {
    let key: string;
    if (payer.paidByType === "USER" && payer.paidByUserId) {
      key = `USER:${payer.paidByUserId}`;
    } else if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
      key = `PETTY_CASH:${payer.paidByPettyCashFundId}`;
    } else if (payer.paidByType === "COMPANY") {
      key = `COMPANY:${payer.amount}`;
    } else {
      key = `${payer.paidByType}:${payer.paidByUserId || ""}:${payer.amount}`;
    }
    if (!seen.has(key)) {
      seen.set(key, payer);
    }
  }
  return Array.from(seen.values());
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
      // Internal company tracking (บริษัทจริงภายใน)
      internalCompanyId: data.internalCompanyId || null,
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
      // WHT delivery method (override from contact)
      whtDeliveryMethod: data.whtDeliveryMethod || null,
      whtDeliveryEmail: data.whtDeliveryEmail || null,
      whtDeliveryNotes: data.whtDeliveryNotes || null,
      // Tax invoice request method (override from contact)
      taxInvoiceRequestMethod: data.taxInvoiceRequestMethod || null,
      taxInvoiceRequestEmail: data.taxInvoiceRequestEmail || null,
      taxInvoiceRequestNotes: data.taxInvoiceRequestNotes || null,
      // Currency conversion info (เก็บข้อมูลสกุลเงินต้นทาง)
      originalCurrency: data.originalCurrency || null,
      originalAmount: data.originalAmount || null,
      exchangeRate: data.exchangeRate || null,
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
    // Internal company tracking (บริษัทจริงภายใน)
    if (data.internalCompanyId !== undefined) updateData.internalCompanyId = data.internalCompanyId || null;
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
    
    // WHT delivery method (override from contact)
    if (data.whtDeliveryMethod !== undefined) updateData.whtDeliveryMethod = data.whtDeliveryMethod || null;
    if (data.whtDeliveryEmail !== undefined) updateData.whtDeliveryEmail = data.whtDeliveryEmail || null;
    if (data.whtDeliveryNotes !== undefined) updateData.whtDeliveryNotes = data.whtDeliveryNotes || null;
    // Tax invoice request method (override from contact)
    if (data.taxInvoiceRequestMethod !== undefined) updateData.taxInvoiceRequestMethod = data.taxInvoiceRequestMethod || null;
    if (data.taxInvoiceRequestEmail !== undefined) updateData.taxInvoiceRequestEmail = data.taxInvoiceRequestEmail || null;
    if (data.taxInvoiceRequestNotes !== undefined) updateData.taxInvoiceRequestNotes = data.taxInvoiceRequestNotes || null;
    // Currency conversion info
    if (data.originalCurrency !== undefined) updateData.originalCurrency = data.originalCurrency || null;
    if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount || null;
    if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate || null;
    
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
    // Auto-learn: Update contact defaults from this transaction
    if (item.contactId) {
      try {
        const contact = await prisma.contact.findUnique({
          where: { id: item.contactId },
          select: { defaultsLastUpdatedAt: true },
        });

        // Always update defaults to the latest transaction values
        const updateData: any = {
          defaultVatRate: item.vatRate,
          defaultWhtEnabled: item.isWht,
          defaultWhtRate: item.whtRate,
          defaultWhtType: item.whtType,
          descriptionTemplate: item.description,
          defaultsLastUpdatedAt: new Date(),
        };

        // Update delivery preferences if requested
        if (body.updateContactDelivery && item.whtDeliveryMethod) {
          updateData.preferredDeliveryMethod = item.whtDeliveryMethod;
          updateData.deliveryEmail = item.whtDeliveryEmail || null;
          updateData.deliveryNotes = item.whtDeliveryNotes || null;
        }

        // Update tax invoice request preferences if requested
        if (body.updateContactTaxInvoiceRequest && item.taxInvoiceRequestMethod) {
          updateData.taxInvoiceRequestMethod = item.taxInvoiceRequestMethod;
          updateData.taxInvoiceRequestEmail = item.taxInvoiceRequestEmail || null;
          updateData.taxInvoiceRequestNotes = item.taxInvoiceRequestNotes || null;
        }

        await prisma.contact.update({
          where: { id: item.contactId },
          data: updateData,
        });
      } catch (error) {
        // Log error but don't throw - defaults update should not break the main flow
        console.error("Failed to update contact defaults:", error);
      }
    }

    // Handle payers if provided
    if (body.payers && Array.isArray(body.payers) && body.payers.length > 0) {
      const uniquePayers = deduplicatePayers(body.payers as Array<{
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
      }>);
      for (const payer of uniquePayers) {
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

      // Find SETTLED user payments that must be preserved
      const settledUserPayments = existingPayments.filter(
        (p) => p.paidByType === "USER" && p.settlementStatus === "SETTLED"
      );
      const settledUserIds = new Set(settledUserPayments.map((p) => p.paidByUserId));

      // Delete all non-settled payments
      await prisma.expensePayment.deleteMany({
        where: {
          expenseId: item.id,
          NOT: {
            AND: [
              { paidByType: "USER" },
              { settlementStatus: "SETTLED" },
            ],
          },
        },
      });

      // Create new payments — skip if an identical settled payment already exists
      if (body.payers.length > 0) {
        const uniquePayers = deduplicatePayers(body.payers as Array<{
          paidByType: PaidByType;
          paidByUserId?: string | null;
          paidByPettyCashFundId?: string | null;
          paidByName?: string | null;
          paidByBankName?: string | null;
          paidByBankAccount?: string | null;
          amount: number;
        }>);
        for (const payer of uniquePayers) {
          // Skip if this payer already has a SETTLED payment (avoid duplicates)
          if (payer.paidByType === "USER" && payer.paidByUserId && settledUserIds.has(payer.paidByUserId)) {
            continue;
          }

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

    // Update contact delivery preferences if requested
    if (body.updateContactDelivery && item.contactId && item.whtDeliveryMethod) {
      try {
        await prisma.contact.update({
          where: { id: item.contactId },
          data: {
            preferredDeliveryMethod: item.whtDeliveryMethod,
            deliveryEmail: item.whtDeliveryEmail || null,
            deliveryNotes: item.whtDeliveryNotes || null,
          },
        });
      } catch (error) {
        console.error("Failed to update contact delivery preferences:", error);
      }
    }

    // Update contact tax invoice request preferences if requested
    if (body.updateContactTaxInvoiceRequest && item.contactId && item.taxInvoiceRequestMethod) {
      try {
        await prisma.contact.update({
          where: { id: item.contactId },
          data: {
            taxInvoiceRequestMethod: item.taxInvoiceRequestMethod,
            taxInvoiceRequestEmail: item.taxInvoiceRequestEmail || null,
            taxInvoiceRequestNotes: item.taxInvoiceRequestNotes || null,
          },
        });
      } catch (error) {
        console.error("Failed to update contact tax invoice request preferences:", error);
      }
    }
  },

  notifyCreate: async (companyId, data, baseUrl) => {
    // Type assertion for notification data
    const notifyData = data as Record<string, unknown>;
    
    await notifyExpense(companyId, {
      id: notifyData.id as string | undefined,
      companyCode: notifyData.companyCode as string | undefined,
      companyName: (notifyData.companyName as string) || "Unknown",
      vendorName: (notifyData.vendorName || notifyData.contactName || notifyData.description) as string | undefined,
      description: notifyData.description as string | undefined,
      amount: Number(notifyData.amount) || 0,
      vatAmount: notifyData.vatAmount ? Number(notifyData.vatAmount) : undefined,
      isWht: (notifyData.isWht as boolean) || false,
      whtRate: notifyData.whtRate ? Number(notifyData.whtRate) : undefined,
      whtAmount: notifyData.whtAmount ? Number(notifyData.whtAmount) : undefined,
      netPaid: Number(notifyData.netPaid) || 0,
      // Use workflowStatus (new field) or fall back to status/DRAFT
      status: (notifyData.workflowStatus || notifyData.status || "DRAFT") as string,
    }, baseUrl);
  },
  
  getEntityDisplayName: (expense: any) => 
    expense.contact?.name || expense.description || undefined,
};
