import { prisma } from "@/lib/db";
import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { notifyIncome } from "@/lib/notifications/line-messaging";

// Create income routes using the factory
const incomeRoutes = createTransactionRoutes({
  modelName: "income",
  displayName: "Income",
  prismaModel: prisma.income,
  
  permissions: {
    read: "incomes:read",
    create: "incomes:create",
    update: "incomes:update",
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
    return {
      contactId: data.contactId || null,
      amount: data.amount,
      vatRate: data.vatRate,
      vatAmount: vatAmount,
      isWhtDeducted: data.isWhtDeducted,
      whtRate: data.whtRate,
      whtAmount: whtAmount,
      whtType: data.whtType,
      netReceived: netReceived,
      source: data.source,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      paymentMethod: data.paymentMethod,
      receiveDate: data.receiveDate ? new Date(data.receiveDate) : undefined,
      status: data.status,
      notes: data.notes,
      customerSlipUrl: data.customerSlipUrl,
      myBillCopyUrl: data.myBillCopyUrl,
      whtCertUrl: data.whtCertUrl,
    };
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
});

export const GET = incomeRoutes.list;
export const POST = incomeRoutes.create;
