/**
 * Shared Income Route Configuration
 * Used by both /api/incomes and /api/incomes/[id] routes
 */

import { prisma } from "@/lib/db";
import { notifyIncome } from "@/lib/notifications/line-messaging";
import type { TransactionRouteConfig } from "../transaction-routes";

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
    
    // Use status selected by user as workflowStatus (new workflow)
    // If not selected, auto-determine based on document state
    const isWhtDeducted = data.isWhtDeducted || false;
    const hasInvoice = (data.myBillCopyUrls?.length || 0) > 0;
    let workflowStatus = data.status; // Use user's selection
    
    // If no status selected, auto-determine
    if (!workflowStatus) {
      if (hasInvoice) {
        workflowStatus = isWhtDeducted ? "WHT_PENDING_CERT" : "READY_FOR_ACCOUNTING";
      } else {
        workflowStatus = "WAITING_INVOICE_ISSUE";
      }
    }
    
    return {
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
      paymentMethod: data.paymentMethod,
      receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
      status: data.status,
      workflowStatus: workflowStatus,
      hasInvoice: hasInvoice,
      hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
      notes: data.notes,
      customerSlipUrls: data.customerSlipUrls || [],
      myBillCopyUrls: data.myBillCopyUrls || [],
      whtCertUrls: data.whtCertUrls || [],
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
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.receiveDate !== undefined) updateData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : undefined;
    if (data.status !== undefined) updateData.status = data.status;
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
    
    // ==========================================================================
    // Auto-adjust workflow status when WHT changes
    // ==========================================================================
    if (existingData && data.isWhtDeducted !== undefined) {
      const wasWht = existingData.isWhtDeducted;
      const nowWht = data.isWhtDeducted;
      const currentStatus = existingData.workflowStatus;
      const hasInvoice = updateData.hasInvoice ?? existingData.hasInvoice;
      const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;
      
      // Case 1: Changed from non-WHT to WHT (ลูกค้าจะหักเรา)
      if (!wasWht && nowWht) {
        // If was ready for accounting but now needs WHT cert from customer
        if (currentStatus === "READY_FOR_ACCOUNTING" || currentStatus === "INVOICE_ISSUED") {
          if (!hasWhtCert) {
            updateData.workflowStatus = "WHT_PENDING_CERT";
          }
        }
      }
      
      // Case 2: Changed from WHT to non-WHT
      if (wasWht && !nowWht) {
        // If was waiting for WHT cert, can move to ready
        if (currentStatus === "WHT_PENDING_CERT") {
          if (hasInvoice) {
            updateData.workflowStatus = "READY_FOR_ACCOUNTING";
          }
        }
      }
    }
    
    return updateData;
  },
  
  notifyCreate: async (companyId, data, baseUrl) => {
    await notifyIncome(companyId, {
      id: data.id,
      companyCode: data.companyCode,
      companyName: data.companyName,
      customerName: data.customerName || data.source,
      source: data.source,
      amount: Number(data.amount),
      vatAmount: data.vatAmount ? Number(data.vatAmount) : undefined,
      isWhtDeducted: data.isWhtDeducted || false,
      whtRate: data.whtRate ? Number(data.whtRate) : undefined,
      whtAmount: data.whtAmount ? Number(data.whtAmount) : undefined,
      netReceived: Number(data.netReceived),
      status: data.status,
    }, baseUrl);
  },
  
  getEntityDisplayName: (income: any) => 
    income.contact?.name || income.source || undefined,
};
