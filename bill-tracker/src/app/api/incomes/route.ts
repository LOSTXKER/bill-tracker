import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate } from "@/lib/audit/logger";
import { notifyIncome } from "@/lib/notifications/line-messaging";

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

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: {
          contact: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { receiveDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.income.count({ where }),
    ]);

    return apiResponse.success({
      incomes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { permission: "incomes:read" }
);

export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();
    const { vatAmount, whtAmount, netReceived, ...data } = body;

    // Create income
    const income = await prisma.income.create({
      data: {
        companyId: company.id,
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
        invoiceNumber: data.invoiceNumber,
        referenceNo: data.referenceNo,
        paymentMethod: data.paymentMethod,
        receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
        status: data.status,
        notes: data.notes,
        createdBy: session.user.id,
      },
      include: { contact: true },
    });

    // Create audit log
    await logCreate("Income", income, session.user.id, company.id);

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Send LINE notification (non-blocking)
    notifyIncome(company.id, {
      id: income.id,
      companyCode: company.code,
      companyName: company.name,
      customerName: income.contact?.name || data.source || undefined,
      source: data.source || undefined,
      amount: Number(data.amount),
      vatAmount: vatAmount ? Number(vatAmount) : undefined,
      isWhtDeducted: data.isWhtDeducted || false,
      whtRate: data.whtRate ? Number(data.whtRate) : undefined,
      whtAmount: whtAmount ? Number(whtAmount) : undefined,
      netReceived: Number(netReceived),
      status: data.status,
    }, baseUrl).catch((error) => {
      console.error("Failed to send LINE notification:", error);
    });

    return apiResponse.created({ income });
  },
  {
    permission: "incomes:create",
    rateLimit: { maxRequests: 30, windowMs: 60000 },
  }
);
