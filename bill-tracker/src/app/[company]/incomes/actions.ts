"use server";

import { prisma } from "@/lib/db";
import { serializeIncomes } from "@/lib/utils/serializers";

export interface FetchIncomesParams {
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

export async function fetchIncomes(params: FetchIncomesParams) {
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
    sortBy = "receiveDate",
    sortOrder = "desc",
  } = params;

  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    return { incomes: [], total: 0 };
  }

  // Build where clause
  const where: any = {
    companyId: company.id,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { source: { contains: search, mode: "insensitive" } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { contact: { name: { contains: search, mode: "insensitive" } } },
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
    where.receiveDate = {};
    if (dateFrom) {
      where.receiveDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.receiveDate.lte = new Date(dateTo);
    }
  }

  // Build orderBy
  const orderBy: any = {};
  if (sortBy === "receiveDate") {
    orderBy.receiveDate = sortOrder;
  } else if (sortBy === "amount") {
    orderBy.netReceived = sortOrder;
  } else if (sortBy === "creator") {
    orderBy.creator = { name: sortOrder };
  } else if (sortBy === "contact") {
    orderBy.contact = { name: sortOrder };
  } else {
    orderBy.receiveDate = "desc";
  }

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact: true,
        categoryRef: true,
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
    prisma.income.count({ where }),
  ]);

  return {
    incomes: serializeIncomes(incomes),
    total,
  };
}
