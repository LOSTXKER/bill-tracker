import { Prisma } from "@prisma/client";

/**
 * Base filter that excludes unpaid reimbursements and settlement transfers.
 * Exported so cross-company or other bespoke queries can include the same rules.
 */
export const reimbursementFilter: Prisma.ExpenseWhereInput = {
  OR: [
    { isReimbursement: false },
    { isReimbursement: true, reimbursementStatus: "PAID" },
  ],
  isSettlementTransfer: false,
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

/**
 * Build the "official" (ตามบัญชี) where clause.
 * Returns all expenses booked on this company (companyId = company), i.e. what appears
 * in this company's general ledger, regardless of economic owner.
 * Excludes unpaid reimbursements and settlement transfers.
 */
export function buildExpenseOfficialWhere(companyId: string): Prisma.ExpenseWhereInput {
  return {
    AND: [reimbursementFilter],
    companyId,
    deletedAt: null,
  };
}

/**
 * Helper: pick the right expense filter based on viewMode string.
 */
export function buildExpenseWhereForMode(
  companyId: string,
  viewMode: "official" | "internal" = "internal"
): Prisma.ExpenseWhereInput {
  return viewMode === "official"
    ? buildExpenseOfficialWhere(companyId)
    : buildExpenseBaseWhere(companyId);
}

// ============================================================================
// Income filters
// ============================================================================

/**
 * Build the base Prisma where clause for incomes.
 * Centralizes soft-delete filtering so any future global income rules live here.
 */
export function buildIncomeBaseWhere(companyId: string): Prisma.IncomeWhereInput {
  return { companyId, deletedAt: null };
}
