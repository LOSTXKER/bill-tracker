/**
 * Shared Income Route Configuration
 * Used by both /api/incomes and /api/incomes/[id] routes
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { notifyIncome } from "@/lib/notifications/line-messaging";
import type { TransactionRouteConfig } from "../transaction-routes";
import { validateIncomeWhtChange } from "@/lib/validations/wht-validator";

// Re-export WHT types and validator for backward compatibility
export { validateIncomeWhtChange } from "@/lib/validations/wht-validator";
export type { WhtChangeValidation } from "@/lib/validations/wht-validator";

export const incomeRouteConfig: Omit<TransactionRouteConfig<any, any, any>, "prismaModel"> & {
  prismaModel: typeof prisma.income;
} = {
  modelName: "income",
  displayName: "Income",
  prismaModel: prisma.income,
  
  permissions: {
    read: "incomes:read",
    create: "incomes:create",
    update: "incomes:update",
    delete: "incomes:delete",
  },
  
  fields: {
    dateField: "receiveDate",
    netAmountField: "netReceived",
    statusField: "status",
  },
  
  transformCreateData: (body) => {
    const { vatAmount, whtAmount, netReceived, ...data } = body;
    
    const isWhtDeducted = data.isWhtDeducted || false;
    const hasInvoice = (data.myBillCopyUrls?.length || 0) > 0;
    
    // NEW: Always start as DRAFT - workflowStatus will be updated when submitted
    // The approvalStatus is set to NOT_REQUIRED by default (schema default)
    // It will be changed to PENDING when user submits for approval (if required)
    const workflowStatus = "DRAFT";
    
    return {
      id: randomUUID(), // Generate unique ID for income
      updatedAt: new Date(), // Required field without @updatedAt directive
      contactId: data.contactId || null,
      contactName: data.contactName || null, // One-time contact name (not saved)
      amount: data.amount,
      vatRate: data.vatRate || 0,
      vatAmount: vatAmount || null,
      isWhtDeducted: isWhtDeducted,
      whtRate: data.whtRate || null,
      whtAmount: whtAmount || null,
      whtType: data.whtType || null,
      netReceived: netReceived,
      source: data.source,
      accountId: data.accountId || null,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
      // status is legacy field (IncomeDocStatus enum) - don't override, use schema default
      workflowStatus: workflowStatus,
      hasInvoice: hasInvoice,
      hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
      notes: data.notes,
      customerSlipUrls: data.customerSlipUrls || [],
      myBillCopyUrls: data.myBillCopyUrls || [],
      whtCertUrls: data.whtCertUrls || [],
      otherDocUrls: data.otherDocUrls || [],
      referenceUrls: data.referenceUrls || [],
    };
  },
  
  transformUpdateData: (body, existingData?: any) => {
    const { vatAmount, whtAmount, netReceived, ...data } = body;
    const updateData: any = {};
    
    // Only update fields that are explicitly provided
    if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
    if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
    if (data.isWhtDeducted !== undefined) updateData.isWhtDeducted = data.isWhtDeducted;
    if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
    if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
    if (data.whtType !== undefined) updateData.whtType = data.whtType;
    if (netReceived !== undefined) updateData.netReceived = netReceived;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.accountId !== undefined) updateData.accountId = data.accountId || null;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.receiveDate !== undefined) updateData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : undefined;
    // status is legacy field (IncomeDocStatus enum) - don't update from new workflow values
    if (data.workflowStatus !== undefined) updateData.workflowStatus = data.workflowStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle multiple file URLs
    if (data.customerSlipUrls !== undefined) updateData.customerSlipUrls = data.customerSlipUrls;
    if (data.myBillCopyUrls !== undefined) {
      updateData.myBillCopyUrls = data.myBillCopyUrls;
      updateData.hasInvoice = data.myBillCopyUrls.length > 0;
      if (data.myBillCopyUrls.length > 0 && !updateData.invoiceIssuedAt) {
        updateData.invoiceIssuedAt = new Date();
      }
    }
    if (data.whtCertUrls !== undefined) {
      updateData.whtCertUrls = data.whtCertUrls;
      updateData.hasWhtCert = data.whtCertUrls.length > 0;
      if (data.whtCertUrls.length > 0 && !updateData.whtCertReceivedAt) {
        updateData.whtCertReceivedAt = new Date();
      }
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
    if (existingData && data.isWhtDeducted !== undefined && data.isWhtDeducted !== existingData.isWhtDeducted) {
      const wasWht = existingData.isWhtDeducted;
      const nowWht = data.isWhtDeducted;
      const currentStatus = existingData.workflowStatus;
      const hasInvoice = updateData.hasInvoice ?? existingData.hasInvoice;
      const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;
      
      // Validate WHT change
      const validation = validateIncomeWhtChange(currentStatus, wasWht, nowWht, hasWhtCert);
      
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
          // ไม่หัก → หัก: ต้องรอ 50 ทวิจากลูกค้า
          if (currentStatus === "READY_FOR_ACCOUNTING" || currentStatus === "INVOICE_ISSUED") {
            if (!hasWhtCert) {
              updateData.workflowStatus = "WHT_PENDING_CERT";
            }
          }
        } else if (wasWht && !nowWht) {
          // หัก → ไม่หัก: ข้าม step 50 ทวิ
          if (currentStatus === "WHT_PENDING_CERT") {
            if (hasInvoice) {
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
        await prisma.contact.update({
          where: { id: item.contactId },
          data: {
            defaultVatRate: item.vatRate,
            defaultWhtEnabled: item.isWhtDeducted,
            defaultWhtRate: item.whtRate,
            defaultWhtType: item.whtType,
            descriptionTemplate: item.source, // Use source field for income description
            defaultsLastUpdatedAt: new Date(),
          },
        });
      } catch (error) {
        // Log error but don't throw - defaults update should not break the main flow
        console.error("Failed to update contact defaults:", error);
      }
    }
  },
  
  notifyCreate: async (companyId, data, baseUrl) => {
    // Type assertion for notification data
    const notifyData = data as Record<string, unknown>;
    
    await notifyIncome(companyId, {
      id: notifyData.id as string | undefined,
      companyCode: notifyData.companyCode as string | undefined,
      companyName: (notifyData.companyName as string) || "Unknown",
      customerName: (notifyData.customerName || notifyData.contactName || notifyData.source) as string | undefined,
      source: notifyData.source as string | undefined,
      amount: Number(notifyData.amount) || 0,
      vatAmount: notifyData.vatAmount ? Number(notifyData.vatAmount) : undefined,
      isWhtDeducted: (notifyData.isWhtDeducted as boolean) || false,
      whtRate: notifyData.whtRate ? Number(notifyData.whtRate) : undefined,
      whtAmount: notifyData.whtAmount ? Number(notifyData.whtAmount) : undefined,
      netReceived: Number(notifyData.netReceived) || 0,
      // Use workflowStatus (new field) or fall back to status/DRAFT
      status: (notifyData.workflowStatus || notifyData.status || "DRAFT") as string,
    }, baseUrl);
  },
  
  getEntityDisplayName: (income: any) => 
    income.contact?.name || income.source || undefined,
};
