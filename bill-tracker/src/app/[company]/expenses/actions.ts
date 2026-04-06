"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { serializeExpenses } from "@/lib/utils/serializers";
import { toThaiStartOfDay, toThaiEndOfDay } from "@/lib/queries/date-utils";
import {
  buildExpenseBaseWhere,
  buildExpenseSelfWhere,
  buildExpensePayOnBehalfWhere,
} from "@/lib/queries/expense-filters";

export interface FetchExpensesParams {
  companyCode: string;
  search?: string;
  status?: string;
  category?: string;
  contact?: string;
  creator?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  ownership?: "self" | "payOnBehalf" | "all";
}

export async function fetchExpenses(params: FetchExpensesParams) {
  const {
    companyCode,
    search,
    status,
    category,
    contact,
    creator,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = "billDate",
    sortOrder = "desc",
    ownership,
  } = params;

  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    return { expenses: [], total: 0 };
  }

  // Build where clause using the same shared filter builders as the page SSR query
  let baseWhere: Prisma.ExpenseWhereInput;
  if (ownership === "self") {
    baseWhere = buildExpenseSelfWhere(company.id);
  } else if (ownership === "payOnBehalf") {
    baseWhere = buildExpensePayOnBehalfWhere(company.id);
  } else {
    baseWhere = buildExpenseBaseWhere(company.id);
  }
  const where: Prisma.ExpenseWhereInput = { ...baseWhere };

  if (search) {
    // Need to combine with AND to preserve the reimbursement filter
    where.AND = [
      {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { Contact: { name: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  if (status) {
    // Support multiple statuses (comma-separated)
    if (status.includes(",")) {
      where.workflowStatus = { in: status.split(",") as Prisma.EnumWorkflowStatusFilter["in"] };
    } else {
      where.workflowStatus = status as Prisma.EnumWorkflowStatusFilter["equals"];
    }
  }

  if (category) {
    where.categoryId = category;
  }

  if (contact) {
    where.contactId = contact;
  }

  if (creator) {
    where.createdBy = creator;
  }

  if (dateFrom || dateTo) {
    where.billDate = {};
    if (dateFrom) {
      where.billDate.gte = toThaiStartOfDay(dateFrom);
    }
    if (dateTo) {
      where.billDate.lte = toThaiEndOfDay(dateTo);
    }
  }

  // Build orderBy
  const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
  if (sortBy === "billDate") {
    orderBy.billDate = sortOrder;
  } else if (sortBy === "amount") {
    orderBy.netPaid = sortOrder;
  } else if (sortBy === "creator") {
    orderBy.User_Expense_createdByToUser = { name: sortOrder };
  } else if (sortBy === "contact") {
    orderBy.Contact = { name: sortOrder };
  } else if (sortBy === "updatedAt") {
    orderBy.updatedAt = sortOrder;
  } else {
    orderBy.billDate = "desc";
  }

  const [expensesRaw, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Contact: true,
        Account: true,
        User_Expense_createdByToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  // Map Prisma relation names to what the client expects
  const expenses = expensesRaw.map((expense) => {
    const { Contact, Account, User_Expense_createdByToUser, ...rest } = expense;
    return {
      ...rest,
      contact: Contact,
      account: Account,
      creator: User_Expense_createdByToUser,
    };
  });

  return {
    expenses: serializeExpenses(expenses),
    total,
  };
}
