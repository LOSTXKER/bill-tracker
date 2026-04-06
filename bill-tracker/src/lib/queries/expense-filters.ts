import { Prisma } from "@prisma/client";

const reimbursementFilter = {
  OR: [
    { isReimbursement: false },
    { isReimbursement: true, reimbursementStatus: "PAID" as const },
  ],
};

/**
 * Build the base Prisma where clause for expenses using "internal" view
 * (real ownership: internalCompanyId or companyId when no internal set).
 * Excludes soft-deleted and unpaid reimbursements.
 */
export function buildExpenseBaseWhere(companyId: string): Prisma.ExpenseWhereInput {
  return {
    AND: [
      {
        OR: [
          { internalCompanyId: companyId },
          { companyId, internalCompanyId: null },
        ],
      },
      reimbursementFilter,
    ],
    deletedAt: null,
  };
}

/**
 * Build where clause filtered to only "self-paid" expenses
 * (company paid itself, no cross-company involvement).
 */
export function buildExpenseSelfWhere(companyId: string): Prisma.ExpenseWhereInput {
  return {
    AND: [
      {
        OR: [
          { companyId, internalCompanyId: null },
          { companyId, internalCompanyId: companyId },
        ],
      },
      reimbursementFilter,
    ],
    deletedAt: null,
  };
}

/**
 * Build where clause filtered to only "pay-on-behalf" expenses
 * (another company recorded/paid, but this company is the real owner).
 */
export function buildExpensePayOnBehalfWhere(companyId: string): Prisma.ExpenseWhereInput {
  return {
    AND: [reimbursementFilter],
    internalCompanyId: companyId,
    companyId: { not: companyId },
    deletedAt: null,
  };
}
