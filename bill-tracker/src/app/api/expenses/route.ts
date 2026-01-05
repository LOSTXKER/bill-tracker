import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate } from "@/lib/audit/logger";
import { notifyExpense } from "@/lib/notifications/line-messaging";

export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {
      companyId: company.id,
      ...(status && { status: status as any }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          contact: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { billDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return apiResponse.success({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { permission: "expenses:read" }
);

export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();
    const { vatAmount, whtAmount, netPaid, ...data } = body;

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
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
        createdBy: session.user.id,
      },
      include: { contact: true },
    });

    // Create audit log
    await logCreate("Expense", expense, session.user.id, company.id);

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Send LINE notification (non-blocking)
    notifyExpense(company.id, {
      id: expense.id,
      companyCode: company.code,
      companyName: company.name,
      vendorName: expense.contact?.name || data.description || undefined,
      description: data.description || undefined,
      amount: Number(data.amount),
      vatAmount: vatAmount ? Number(vatAmount) : undefined,
      isWht: data.isWht || false,
      whtRate: data.whtRate ? Number(data.whtRate) : undefined,
      whtAmount: whtAmount ? Number(whtAmount) : undefined,
      netPaid: Number(netPaid),
      status: data.status,
    }, baseUrl).catch((error) => {
      console.error("Failed to send LINE notification:", error);
    });

    return apiResponse.created({ expense });
  },
  {
    permission: "expenses:create",
    rateLimit: { maxRequests: 30, windowMs: 60000 },
  }
);
