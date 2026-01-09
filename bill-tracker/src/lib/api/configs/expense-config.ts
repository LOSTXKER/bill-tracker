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
    return {
      contactId: data.contactId || null,
      contactName: data.contactName || null, // One-time contact name (not saved)
      amount: data.amount,
      vatRate: data.vatRate || 0,
      vatAmount: vatAmount || null,
      isWht: data.isWht || false,
      whtRate: data.whtRate || null,
      whtAmount: whtAmount || null,
      whtType: data.whtType || null,
      netPaid: netPaid,
      description: data.description,
      categoryId: data.categoryId || null,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      paymentMethod: data.paymentMethod,
      billDate: data.billDate ? new Date(data.billDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      notes: data.notes,
      slipUrls: data.slipUrls || [],
      taxInvoiceUrls: data.taxInvoiceUrls || [],
      whtCertUrls: data.whtCertUrls || [],
    };
  },
  
  transformUpdateData: (body) => {
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
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.billDate !== undefined) updateData.billDate = data.billDate ? new Date(data.billDate) : undefined;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle file URLs (array versions only)
    if (data.slipUrls !== undefined) updateData.slipUrls = data.slipUrls;
    if (data.taxInvoiceUrls !== undefined) updateData.taxInvoiceUrls = data.taxInvoiceUrls;
    if (data.whtCertUrls !== undefined) updateData.whtCertUrls = data.whtCertUrls;
    
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
