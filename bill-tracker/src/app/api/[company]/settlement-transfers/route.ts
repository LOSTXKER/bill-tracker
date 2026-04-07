import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { toThaiStartOfDay, toThaiEndOfDay } from "@/lib/queries/date-utils";
import type { Prisma, PaidByType } from "@prisma/client";

/**
 * GET /api/[company]/settlement-transfers
 * List settlement transfer expenses with search, date range, and pagination.
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const sortBy = searchParams.get("sortBy") || "billDate";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as Prisma.SortOrder;

    const where: Prisma.ExpenseWhereInput = {
      companyId: company.id,
      isSettlementTransfer: true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = toThaiStartOfDay(dateFrom);
      if (dateTo) where.billDate.lte = toThaiEndOfDay(dateTo);
    }

    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [];
    if (sortBy === "amount") {
      orderBy.push({ netPaid: sortOrder }, { createdAt: "desc" });
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder });
    } else {
      orderBy.push({ billDate: sortOrder }, { createdAt: "desc" });
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          User_Expense_createdByToUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          ExpensePayments: {
            select: {
              id: true,
              amount: true,
              paidByType: true,
              paidByUserId: true,
              settlementStatus: true,
              PaidByUser: { select: { id: true, name: true } },
            },
          },
          Category: { select: { id: true, name: true } },
          Account: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    const serialized = items.map((item) => ({
      id: item.id,
      description: item.description,
      contactName: item.contactName,
      amount: Number(item.amount),
      netPaid: Number(item.netPaid),
      billDate: item.billDate.toISOString(),
      notes: item.notes,
      slipUrls: item.slipUrls,
      workflowStatus: item.workflowStatus,
      paymentMethod: item.paymentMethod,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creator: item.User_Expense_createdByToUser,
      payments: item.ExpensePayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paidByType: p.paidByType,
        paidByUserId: p.paidByUserId,
        paidByUser: p.PaidByUser,
        settlementStatus: p.settlementStatus,
      })),
      category: item.Category,
      account: item.Account,
      categoryId: item.categoryId,
      accountId: item.accountId,
    }));

    return apiResponse.successWithCache(
      { items: serialized, total },
      undefined,
      { maxAge: 5, staleWhileRevalidate: 30 }
    );
  },
  { permission: "settlements:read" }
);

/**
 * POST /api/[company]/settlement-transfers
 * Create a standalone settlement transfer expense.
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company, session }) => {
    const body = await request.json();

    const {
      contactName,
      amount,
      billDate,
      notes,
      slipUrls,
      payerType,
      payerUserId,
      categoryId,
      accountId,
    } = body as {
      contactName: string;
      amount: number;
      billDate?: string;
      notes?: string;
      slipUrls?: string[];
      payerType: PaidByType;
      payerUserId?: string | null;
      categoryId?: string | null;
      accountId?: string | null;
    };

    if (!contactName || !amount || amount <= 0) {
      throw ApiErrors.badRequest("กรุณาระบุชื่อพนักงานและจำนวนเงิน");
    }

    const expenseId = randomUUID();
    const parsedAmount = Number(amount);
    const parsedDate = billDate ? new Date(billDate) : new Date();

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          id: expenseId,
          companyId: company.id,
          amount: parsedAmount,
          vatRate: 0,
          vatAmount: 0,
          netPaid: parsedAmount,
          description: `โอนคืนค่าใช้จ่ายให้${contactName}`,
          billDate: parsedDate,
          paymentMethod: "BANK_TRANSFER",
          workflowStatus: "COMPLETED",
          status: "PENDING_PHYSICAL",
          isSettlementTransfer: true,
          createdBy: session.user.id,
          updatedAt: new Date(),
          contactName,
          slipUrls: slipUrls || [],
          notes: notes || null,
          categoryId: categoryId || null,
          accountId: accountId || null,
        },
      });

      await tx.expensePayment.create({
        data: {
          expenseId: created.id,
          amount: parsedAmount,
          paidByType: payerType || "COMPANY",
          paidByUserId: payerType === "USER" ? (payerUserId || null) : null,
          settlementStatus: "NOT_REQUIRED",
        },
      });

      return created;
    });

    return apiResponse.created({ expense });
  },
  { permission: "settlements:manage" }
);
