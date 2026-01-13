/**
 * Shared Expense Route Configuration
 * Used by both /api/expenses and /api/expenses/[id] routes
 */

import { prisma } from "@/lib/db";
import { notifyExpense } from "@/lib/notifications/line-messaging";
import type { TransactionRouteConfig } from "../transaction-routes";

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
    
    // Use status selected by user as workflowStatus (new workflow)
    // If not selected, auto-determine based on document state
    const isWht = data.isWht || false;
    const hasTaxInvoice = (data.taxInvoiceUrls?.length || 0) > 0;
    let workflowStatus = data.status; // Use user's selection
    
    // If no status selected, auto-determine
    if (!workflowStatus) {
      if (hasTaxInvoice) {
        workflowStatus = isWht ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
      } else {
        workflowStatus = "WAITING_TAX_INVOICE";
      }
    }
    
    return {
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
      paymentMethod: data.paymentMethod,
      billDate: data.billDate ? new Date(data.billDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      workflowStatus: workflowStatus,
      hasTaxInvoice: hasTaxInvoice,
      hasWhtCert: (data.whtCertUrls?.length || 0) > 0,
      notes: data.notes,
      slipUrls: data.slipUrls || [],
      taxInvoiceUrls: data.taxInvoiceUrls || [],
      whtCertUrls: data.whtCertUrls || [],
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
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.billDate !== undefined) updateData.billDate = data.billDate ? new Date(data.billDate) : undefined;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.workflowStatus !== undefined) updateData.workflowStatus = data.workflowStatus;
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
    
    // ==========================================================================
    // Auto-adjust workflow status when WHT changes
    // ==========================================================================
    if (existingData && data.isWht !== undefined) {
      const wasWht = existingData.isWht;
      const nowWht = data.isWht;
      const currentStatus = existingData.workflowStatus;
      const hasTaxInvoice = updateData.hasTaxInvoice ?? existingData.hasTaxInvoice;
      const hasWhtCert = updateData.hasWhtCert ?? existingData.hasWhtCert;
      
      // Case 1: Changed from non-WHT to WHT
      if (!wasWht && nowWht) {
        // If was ready for accounting but now needs WHT cert
        if (currentStatus === "READY_FOR_ACCOUNTING" || currentStatus === "RECEIVED_TAX_INVOICE") {
          if (!hasWhtCert) {
            updateData.workflowStatus = "WHT_PENDING_ISSUE";
          }
        }
      }
      
      // Case 2: Changed from WHT to non-WHT
      if (wasWht && !nowWht) {
        // If was waiting for WHT, can move to ready
        if (currentStatus === "WHT_PENDING_ISSUE" || currentStatus === "WHT_ISSUED") {
          if (hasTaxInvoice) {
            updateData.workflowStatus = "READY_FOR_ACCOUNTING";
          }
        }
      }
    }
    
    return updateData;
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
