"use server";

import { prisma } from "@/lib/db";
import { serializeExpenses } from "@/lib/utils/serializers";

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
  } = params;

  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    return { expenses: [], total: 0 };
  }

  // Build where clause
  // Exclude reimbursements that are not PAID
  // REJECTED reimbursements should never appear as expenses
  // PENDING/APPROVED reimbursements are not yet expenses
  const where: any = {
    companyId: company.id,
    deletedAt: null,
    OR: [
      // Regular expenses (not reimbursements)
      { isReimbursement: false },
      // Reimbursements that have been paid (now part of normal expense flow)
      { isReimbursement: true, reimbursementStatus: "PAID" as const },
    ],
  };

  if (search) {
    // Need to combine with AND to preserve the reimbursement filter
    where.AND = [
      {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { contact: { name: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  if (status) {
    where.status = status;
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
      where.billDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.billDate.lte = new Date(dateTo);
    }
  }

  // Build orderBy
  const orderBy: any = {};
  if (sortBy === "billDate") {
    orderBy.billDate = sortOrder;
  } else if (sortBy === "amount") {
    orderBy.netPaid = sortOrder;
  } else if (sortBy === "creator") {
    orderBy.creator = { name: sortOrder };
  } else if (sortBy === "contact") {
    orderBy.contact = { name: sortOrder };
  } else {
    orderBy.billDate = "desc";
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact: true,
        account: true,
        creator: {
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

  return {
    expenses: serializeExpenses(expenses),
    total,
  };
}
