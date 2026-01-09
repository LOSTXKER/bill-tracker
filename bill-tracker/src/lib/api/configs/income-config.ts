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
    return {
      contactId: data.contactId || null,
      contactName: data.contactName || null, // One-time contact name (not saved)
      amount: data.amount,
      vatRate: data.vatRate || 0,
      vatAmount: vatAmount || null,
      isWhtDeducted: data.isWhtDeducted || false,
      whtRate: data.whtRate || null,
      whtAmount: whtAmount || null,
      whtType: data.whtType || null,
      netReceived: netReceived,
      source: data.source,
      categoryId: data.categoryId || null,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      paymentMethod: data.paymentMethod,
      receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
      status: data.status,
      notes: data.notes,
      customerSlipUrls: data.customerSlipUrls || [],
      myBillCopyUrls: data.myBillCopyUrls || [],
      whtCertUrls: data.whtCertUrls || [],
    };
  },
  
  transformUpdateData: (body) => {
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
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.receiveDate !== undefined) updateData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : undefined;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle multiple file URLs
    if (data.customerSlipUrls !== undefined) updateData.customerSlipUrls = data.customerSlipUrls;
    if (data.myBillCopyUrls !== undefined) updateData.myBillCopyUrls = data.myBillCopyUrls;
    if (data.whtCertUrls !== undefined) updateData.whtCertUrls = data.whtCertUrls;
    
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
