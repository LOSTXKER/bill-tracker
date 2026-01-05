import { prisma } from "@/lib/db";
import { createTransactionRoutes } from "@/lib/api/transaction-routes";
import { notifyExpense } from "@/lib/notifications/line-messaging";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Create expense routes using the factory
const expenseRoutes = createTransactionRoutes({
  modelName: "expense",
  displayName: "Expense",
  prismaModel: prisma.expense,
  
  permissions: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
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
      amount: data.amount,
      vatRate: data.vatRate || 0,
      vatAmount: vatAmount || null,
      isWht: data.isWht || false,
      whtRate: data.whtRate || null,
      whtAmount: whtAmount || null,
      whtType: data.whtType || null,
      netPaid: netPaid,
      description: data.description,
      category: data.category,
      categoryId: data.categoryId || null,
      invoiceNumber: data.invoiceNumber,
      referenceNo: data.referenceNo,
      paymentMethod: data.paymentMethod,
      billDate: data.billDate ? new Date(data.billDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      notes: data.notes,
      slipUrl: data.slipUrl || null,
      taxInvoiceUrl: data.taxInvoiceUrl || null,
      whtCertUrl: data.whtCertUrl || null,
    };
  },
  
  transformUpdateData: (body) => {
    const { vatAmount, whtAmount, netPaid, ...data } = body;
    const updateData: any = {};
    
    // Only update fields that are explicitly provided
    if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (vatAmount !== undefined) updateData.vatAmount = vatAmount;
    if (data.isWht !== undefined) updateData.isWht = data.isWht;
    if (data.whtRate !== undefined) updateData.whtRate = data.whtRate;
    if (whtAmount !== undefined) updateData.whtAmount = whtAmount;
    if (data.whtType !== undefined) updateData.whtType = data.whtType;
    if (netPaid !== undefined) updateData.netPaid = netPaid;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.referenceNo !== undefined) updateData.referenceNo = data.referenceNo;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.billDate !== undefined) updateData.billDate = data.billDate ? new Date(data.billDate) : undefined;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Handle file URLs
    if (data.slipUrl !== undefined) updateData.slipUrl = data.slipUrl;
    if (data.taxInvoiceUrl !== undefined) updateData.taxInvoiceUrl = data.taxInvoiceUrl;
    if (data.whtCertUrl !== undefined) updateData.whtCertUrl = data.whtCertUrl;
    if (data.slipUrls !== undefined) updateData.slipUrls = data.slipUrls;
    if (data.taxInvoiceUrls !== undefined) updateData.taxInvoiceUrls = data.taxInvoiceUrls;
    if (data.whtCertUrls !== undefined) updateData.whtCertUrls = data.whtCertUrls;
    
    return updateData;
  },
  
  getEntityDisplayName: (expense: any) => 
    expense.contact?.name || expense.description || undefined,
});

export const GET = expenseRoutes.get;
export const PUT = expenseRoutes.update;
export const DELETE = expenseRoutes.delete;
