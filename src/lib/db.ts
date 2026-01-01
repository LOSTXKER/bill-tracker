// Database utility functions using Prisma
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ============================================
// COMPANY
// ============================================

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      profiles: true,
      expenseCategories: true,
    },
  });
}

export async function createCompany(data: Prisma.CompanyCreateInput) {
  return prisma.company.create({
    data,
  });
}

// ============================================
// PROFILE
// ============================================

export async function getProfileById(id: string) {
  return prisma.profile.findUnique({
    where: { id },
    include: {
      company: true,
    },
  });
}

export async function getProfileByEmail(email: string) {
  return prisma.profile.findFirst({
    where: { email },
    include: {
      company: true,
    },
  });
}

export async function createProfile(data: Prisma.ProfileCreateInput) {
  return prisma.profile.create({
    data,
  });
}

export async function updateProfile(id: string, data: Prisma.ProfileUpdateInput) {
  return prisma.profile.update({
    where: { id },
    data,
  });
}

// ============================================
// RECEIPT
// ============================================

export async function getReceiptById(id: string) {
  return prisma.receipt.findUnique({
    where: { id },
    include: {
      company: true,
      uploader: true,
      approver: true,
      category: true,
      userCategory: true,
    },
  });
}

export async function getReceiptsByCompany(
  companyId: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected';
    periodMonth?: number;
    periodYear?: number;
    limit?: number;
    offset?: number;
  }
) {
  const { status, periodMonth, periodYear, limit = 50, offset = 0 } = options || {};

  return prisma.receipt.findMany({
    where: {
      companyId,
      ...(status && { status }),
      ...(periodMonth && { periodMonth }),
      ...(periodYear && { periodYear }),
    },
    include: {
      uploader: true,
      category: true,
      userCategory: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getReceiptStats(companyId: string, periodMonth: number, periodYear: number) {
  const receipts = await prisma.receipt.findMany({
    where: {
      companyId,
      periodMonth,
      periodYear,
    },
    select: {
      status: true,
      amount: true,
      totalAmount: true,
      userAmount: true,
      vatAmount: true,
    },
  });

  const stats = {
    total: receipts.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    vatAmount: 0,
  };

  receipts.forEach((r) => {
    if (r.status === 'pending') stats.pending++;
    if (r.status === 'approved') stats.approved++;
    if (r.status === 'rejected') stats.rejected++;

    const amount = Number(r.userAmount || r.totalAmount || r.amount || 0);
    stats.totalAmount += amount;
    stats.vatAmount += Number(r.vatAmount || 0);
  });

  return stats;
}

export async function createReceipt(data: Prisma.ReceiptCreateInput) {
  return prisma.receipt.create({
    data,
    include: {
      category: true,
    },
  });
}

export async function updateReceipt(id: string, data: Prisma.ReceiptUpdateInput) {
  return prisma.receipt.update({
    where: { id },
    data,
    include: {
      category: true,
      userCategory: true,
    },
  });
}

export async function approveReceipt(id: string, approvedBy: string) {
  return prisma.receipt.update({
    where: { id },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

export async function rejectReceipt(id: string, approvedBy: string) {
  return prisma.receipt.update({
    where: { id },
    data: {
      status: 'rejected',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

// ============================================
// EXPENSE CATEGORY
// ============================================

export async function getExpenseCategories(companyId?: string) {
  return prisma.expenseCategory.findMany({
    where: {
      OR: [
        { isDefault: true },
        ...(companyId ? [{ companyId }] : []),
      ],
    },
    orderBy: { nameTh: 'asc' },
  });
}

export async function createExpenseCategory(data: Prisma.ExpenseCategoryCreateInput) {
  return prisma.expenseCategory.create({
    data,
  });
}

// ============================================
// PRE-ACCOUNTING ENTRY
// ============================================

export async function getEntriesByCompany(
  companyId: string,
  options?: {
    status?: 'pending' | 'processed';
    limit?: number;
    offset?: number;
  }
) {
  const { status, limit = 50, offset = 0 } = options || {};

  return prisma.preAccountingEntry.findMany({
    where: {
      companyId,
      ...(status && { status }),
    },
    include: {
      receipt: true,
      processor: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function createEntry(data: Prisma.PreAccountingEntryCreateInput) {
  return prisma.preAccountingEntry.create({
    data,
  });
}

export async function processEntry(id: string, processedBy: string) {
  return prisma.preAccountingEntry.update({
    where: { id },
    data: {
      status: 'processed',
      processedBy,
      processedAt: new Date(),
    },
  });
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(companyId: string, periodMonth: number, periodYear: number) {
  // Get receipt stats
  const receiptStats = await getReceiptStats(companyId, periodMonth, periodYear);

  // Get category breakdown
  const categoryBreakdown = await prisma.receipt.groupBy({
    by: ['categoryId'],
    where: {
      companyId,
      periodMonth,
      periodYear,
    },
    _count: true,
    _sum: {
      amount: true,
      totalAmount: true,
      userAmount: true,
    },
  });

  // Get category names
  const categoryIds = categoryBreakdown
    .map((c) => c.categoryId)
    .filter((id): id is string => id !== null);

  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const byCategory = categoryBreakdown.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryId ? categoryMap.get(c.categoryId)?.nameTh || 'อื่นๆ' : 'ไม่ระบุ',
    count: c._count,
    amount: Number(c._sum.userAmount || c._sum.totalAmount || c._sum.amount || 0),
  }));

  return {
    ...receiptStats,
    byCategory,
  };
}
