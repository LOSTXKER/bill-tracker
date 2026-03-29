import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WorkflowError,
  getWorkflowPendingItems,
  executeWorkflowAction,
  type WorkflowActionParams,
} from "@/lib/workflow/document-workflow-service";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    expense: { findUnique: vi.fn(), findMany: vi.fn() },
    income: { findUnique: vi.fn(), findMany: vi.fn() },
    companyAccess: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const COMPANY_ID = "company-123";
const USER_ID = "user-456";

const mockExpense = {
  id: "exp-1",
  companyId: COMPANY_ID,
  isWht: false,
  workflowStatus: "PAID",
};

const mockIncome = {
  id: "inc-1",
  companyId: COMPANY_ID,
  isWhtDeducted: false,
  workflowStatus: "INVOICE_ISSUED",
};

function makeParams(overrides: Partial<WorkflowActionParams> = {}): WorkflowActionParams {
  return {
    companyId: COMPANY_ID,
    userId: USER_ID,
    transactionType: "expense",
    transactionId: "exp-1",
    action: "receive_tax_invoice",
    ...overrides,
  };
}

describe("WorkflowError", () => {
  it("stores code and message correctly", () => {
    const err = new WorkflowError("something went wrong", "NOT_FOUND");
    expect(err.message).toBe("something went wrong");
    expect(err.code).toBe("NOT_FOUND");
    expect(err).toBeInstanceOf(Error);
  });

  it("supports all three error codes", () => {
    expect(new WorkflowError("x", "NOT_FOUND").code).toBe("NOT_FOUND");
    expect(new WorkflowError("x", "FORBIDDEN").code).toBe("FORBIDDEN");
    expect(new WorkflowError("x", "BAD_REQUEST").code).toBe("BAD_REQUEST");
  });
});

describe("getWorkflowPendingItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.income.findMany).mockResolvedValue([]);
  });

  it("queries only expenses when type is 'expense'", async () => {
    await getWorkflowPendingItems(COMPANY_ID, "expense");

    expect(prisma.expense.findMany).toHaveBeenCalled();
    expect(prisma.income.findMany).not.toHaveBeenCalled();
  });

  it("queries only incomes when type is 'income'", async () => {
    await getWorkflowPendingItems(COMPANY_ID, "income");

    expect(prisma.income.findMany).toHaveBeenCalled();
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });

  it("queries both when type is 'all'", async () => {
    await getWorkflowPendingItems(COMPANY_ID, "all");

    expect(prisma.expense.findMany).toHaveBeenCalled();
    expect(prisma.income.findMany).toHaveBeenCalled();
  });

  it("returns zero summary when no pending items", async () => {
    const result = await getWorkflowPendingItems(COMPANY_ID, "all");

    expect(result.summary.total).toBe(0);
    expect(result.summary.pendingTaxInvoice).toBe(0);
    expect(result.summary.pendingWhtCert).toBe(0);
  });

  it("counts summary totals from returned items", async () => {
    const fakeExpense = { ...mockExpense, Contact: null };
    vi.mocked(prisma.expense.findMany)
      .mockResolvedValueOnce([fakeExpense, fakeExpense]) // pendingTaxInvoice
      .mockResolvedValueOnce([fakeExpense])              // pendingWhtIssue
      .mockResolvedValueOnce([]);                        // pendingAccounting

    const result = await getWorkflowPendingItems(COMPANY_ID, "expense");

    expect(result.summary.pendingTaxInvoice).toBe(2);
    expect(result.summary.pendingWhtIssue).toBe(1);
    expect(result.expenses).toHaveLength(3);
  });
});

describe("executeWorkflowAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when expense does not exist", async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null);

    await expect(executeWorkflowAction(makeParams())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when expense belongs to a different company", async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      ...mockExpense,
      companyId: "other-company",
    } as any);

    await expect(executeWorkflowAction(makeParams())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when income does not exist", async () => {
    vi.mocked(prisma.income.findUnique).mockResolvedValue(null);

    await expect(
      executeWorkflowAction(makeParams({ transactionType: "income", transactionId: "inc-1", action: "issue_invoice" }))
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST for an unknown expense action", async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);

    await expect(
      executeWorkflowAction(makeParams({ action: "unknown_action" }))
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST for an unknown income action", async () => {
    vi.mocked(prisma.income.findUnique).mockResolvedValue(mockIncome as any);

    await expect(
      executeWorkflowAction(makeParams({ transactionType: "income", transactionId: "inc-1", action: "no_such_action" }))
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws FORBIDDEN when revert is attempted by non-owner", async () => {
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      isOwner: false,
    } as any);

    await expect(
      executeWorkflowAction(makeParams({ action: "revert", targetStatus: "PAID" }))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws BAD_REQUEST when revert is missing targetStatus", async () => {
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      isOwner: true,
    } as any);

    await expect(
      executeWorkflowAction(makeParams({ action: "revert", targetStatus: undefined }))
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when transactionType is invalid", async () => {
    await expect(
      executeWorkflowAction(makeParams({ transactionType: "other" as any }))
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("executes expense action and returns updated record", async () => {
    const updatedExpense = { ...mockExpense, hasTaxInvoice: true };
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const txMock = {
        expense: { update: vi.fn().mockResolvedValue(updatedExpense) },
        documentEvent: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    const result = await executeWorkflowAction(makeParams({ action: "receive_tax_invoice" }));

    expect(result).toMatchObject({ hasTaxInvoice: true });
  });
});
