import { prisma } from "@/lib/db";
import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { notifyIncome } from "@/lib/notifications/line-messaging";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Create income routes using the factory
const incomeRoutes = createTransactionRoutes({
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
      customerSlipUrl: data.customerSlipUrl || null,
      myBillCopyUrl: data.myBillCopyUrl || null,
      whtCertUrl: data.whtCertUrl || null,
    };
  },
  
  transformUpdateData: (body) => {
    const { vatAmount, whtAmount, netReceived, ...data } = body;
    const updateData: any = {};
    
    // Only update fields that are explicitly provided
    if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
    if (data.isWhtDeducted !== undefined) updateData.isWhtDeducted = data.isWhtDeducted;
    if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
    if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
    if (data.whtType !== undefined) updateData.whtType = data.whtType;
    if (netReceived !== undefined) updateData.netReceived = netReceived;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.receiveDate !== undefined) updateData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : undefined;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle single file URLs (legacy)
    if (data.customerSlipUrl !== undefined) updateData.customerSlipUrl = data.customerSlipUrl;
    if (data.myBillCopyUrl !== undefined) updateData.myBillCopyUrl = data.myBillCopyUrl;
    if (data.whtCertUrl !== undefined) updateData.whtCertUrl = data.whtCertUrl;
    
    // Handle multiple file URLs
    if (data.customerSlipUrls !== undefined) updateData.customerSlipUrls = data.customerSlipUrls;
    if (data.myBillCopyUrls !== undefined) updateData.myBillCopyUrls = data.myBillCopyUrls;
    if (data.whtCertUrls !== undefined) updateData.whtCertUrls = data.whtCertUrls;
    
    return updateData;
  },
  
  getEntityDisplayName: (income: any) => 
    income.contact?.name || income.source || undefined,
});

export const GET = incomeRoutes.get;
export const PUT = incomeRoutes.update;
export const DELETE = incomeRoutes.delete;
