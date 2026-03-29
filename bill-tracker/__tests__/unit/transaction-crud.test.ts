import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCreateHandler,
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api/transaction-crud";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions/checker";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findUnique: vi.fn() },
    companyAccess: { findUnique: vi.fn() },
    expensePayment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    pettyCashFund: { update: vi.fn() },
    pettyCashTransaction: { create: vi.fn() },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true, headers: {} })),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/permissions/checker", () => ({
  hasPermission: vi.fn(),
}));

vi.mock("@/lib/api/transaction-includes", () => ({
  getBaseIncludes: vi.fn(() => ({})),
  getInternalCompanyInclude: vi.fn(() => ({})),
}));

vi.mock("@/lib/api/transaction-effects", () => ({
  runCreateSideEffects: vi.fn().mockResolvedValue(undefined),
  runUpdateSideEffects: vi.fn().mockResolvedValue(undefined),
  runDeleteSideEffects: vi.fn().mockResolvedValue(undefined),
}));

const mockSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
  expires: "2099-01-01",
};

const mockCompany = {
  id: "company-456",
  code: "TESTCO",
  name: "Test Company",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOwnerAccess = {
  id: "access-1",
  userId: "user-123",
  companyId: "company-456",
  isOwner: true,
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockExpense = {
  id: "exp-1",
  companyId: "company-456",
  description: "Office supplies",
  amount: 1000,
  createdBy: "user-123",
  workflowStatus: "DRAFT",
  approvalStatus: "DRAFT",
  deletedAt: null,
  Contact: null,
  Company: mockCompany,
};

function makeMockPrismaModel() {
  return {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  const prismaModel = makeMockPrismaModel();
  return {
    config: {
      modelName: "expense" as const,
      displayName: "Expense",
      prismaModel,
      permissions: {
        read: "expenses:read",
        create: "expenses:create",
        update: "expenses:update",
        delete: "expenses:delete",
      },
      fields: {
        statusField: "status",
        dateField: "date",
        netAmountField: "netPaid",
      },
      transformCreateData: vi.fn((data: unknown) => data),
      transformUpdateData: vi.fn((data: unknown) => data),
      ...overrides,
    } as any,
    prismaModel,
  };
}

// ─── createCreateHandler ────────────────────────────────────────────────────

describe("createCreateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockOwnerAccess as any);
  });

  it("creates a new transaction and returns 201 with the created item", async () => {
    const { config, prismaModel } = makeConfig();
    const createdItem = { ...mockExpense, id: "new-exp-1" };
    prismaModel.create.mockResolvedValue(createdItem);

    const handler = createCreateHandler(config);
    const request = new Request("http://localhost/api/test?company=TESTCO", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Office supplies", amount: 500 }),
    });

    const response = await handler(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.expense).toMatchObject({ id: "new-exp-1" });
  });

  it("injects companyId and createdBy from session into create data", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.create.mockResolvedValue({ ...mockExpense });

    const handler = createCreateHandler(config);
    const request = new Request("http://localhost/api/test?company=TESTCO", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Test" }),
    });

    await handler(request);

    expect(prismaModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-456",
          createdBy: "user-123",
        }),
      })
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { config, prismaModel } = makeConfig();
    const handler = createCreateHandler(config);
    const request = new Request("http://localhost/api/test?company=TESTCO", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Test" }),
    });

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(prismaModel.create).not.toHaveBeenCalled();
  });

  it("calls afterCreate hook with created item and context when provided", async () => {
    const { config, prismaModel } = makeConfig();
    const createdItem = { ...mockExpense };
    prismaModel.create.mockResolvedValue(createdItem);
    config.afterCreate = vi.fn().mockResolvedValue(undefined);

    const handler = createCreateHandler(config);
    const body = { description: "Test", amount: 100 };
    const request = new Request("http://localhost/api/test?company=TESTCO", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    await handler(request);

    expect(config.afterCreate).toHaveBeenCalledWith(
      createdItem,
      expect.objectContaining({ description: "Test" }),
      expect.objectContaining({ session: mockSession, company: mockCompany })
    );
  });

  it("calls transformCreateData to shape the body before insert", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.create.mockResolvedValue({ ...mockExpense });

    const handler = createCreateHandler(config);
    const request = new Request("http://localhost/api/test?company=TESTCO", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Test", extraField: true }),
    });

    await handler(request);

    expect(config.transformCreateData).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Test" })
    );
  });
});

// ─── createGetHandler ────────────────────────────────────────────────────────

describe("createGetHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
  });

  it("returns the transaction when found and user has read permission", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(mockExpense);

    const handler = createGetHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1"),
      { params: Promise.resolve({ id: "exp-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.expense).toMatchObject({ id: "exp-1" });
  });

  it("returns 404 when transaction does not exist", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(null);

    const handler = createGetHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/no-such-id"),
      { params: Promise.resolve({ id: "no-such-id" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when user lacks read permission", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(mockExpense);
    vi.mocked(hasPermission).mockResolvedValue(false);

    const handler = createGetHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1"),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(403);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { config } = makeConfig();
    const handler = createGetHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1"),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("checks permission against the transaction's companyId", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(mockExpense);

    const handler = createGetHandler(config);
    await handler(
      new Request("http://localhost/api/expenses/exp-1"),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(hasPermission).toHaveBeenCalledWith(
      "user-123",
      "company-456",
      "expenses:read"
    );
  });
});

// ─── createUpdateHandler ─────────────────────────────────────────────────────

describe("createUpdateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.expensePayment.findFirst).mockResolvedValue(null);
  });

  it("updates transaction and returns 200 with updated data", async () => {
    const { config, prismaModel } = makeConfig();
    const updatedExpense = { ...mockExpense, description: "Updated supplies" };
    prismaModel.findUnique.mockResolvedValue(mockExpense);
    prismaModel.update.mockResolvedValue(updatedExpense);

    const handler = createUpdateHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Updated supplies" }),
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.expense.description).toBe("Updated supplies");
    expect(prismaModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "exp-1" } })
    );
  });

  it("returns 404 when transaction to update is not found", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(null);

    const handler = createUpdateHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/not-found", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Test" }),
      }),
      { params: Promise.resolve({ id: "not-found" }) }
    );

    expect(response.status).toBe(404);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks update permission and is not the owner", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue({
      ...mockExpense,
      createdBy: "other-user-999",
    });
    vi.mocked(hasPermission).mockResolvedValue(false);

    const handler = createUpdateHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Test" }),
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(403);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("allows the owner to edit their own draft without explicit permission", async () => {
    const { config, prismaModel } = makeConfig();
    const ownedDraft = { ...mockExpense, createdBy: "user-123", workflowStatus: "DRAFT" };
    prismaModel.findUnique.mockResolvedValue(ownedDraft);
    prismaModel.update.mockResolvedValue({ ...ownedDraft, description: "My updated draft" });
    vi.mocked(hasPermission).mockResolvedValue(false);

    const handler = createUpdateHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "My updated draft" }),
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { config } = makeConfig();
    const handler = createUpdateHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Test" }),
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("calls transformUpdateData with body and existing item", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(mockExpense);
    prismaModel.update.mockResolvedValue(mockExpense);

    const handler = createUpdateHandler(config);
    await handler(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: 2000 }),
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(config.transformUpdateData).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000 }),
      mockExpense
    );
  });
});

// ─── createDeleteHandler ─────────────────────────────────────────────────────

describe("createDeleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(prisma.expensePayment.findMany).mockResolvedValue([]);
  });

  it("soft-deletes a transaction by setting deletedAt and deletedBy", async () => {
    const { config, prismaModel } = makeConfig();
    const deletedExpense = { ...mockExpense, deletedAt: new Date(), deletedBy: "user-123" };
    prismaModel.findUnique.mockResolvedValue(mockExpense);
    prismaModel.update.mockResolvedValue(deletedExpense);

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exp-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: "user-123",
        }),
      })
    );
  });

  it("returns 404 when transaction to delete is not found", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue(null);

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/not-found", { method: "DELETE" }),
      { params: Promise.resolve({ id: "not-found" }) }
    );

    expect(response.status).toBe(404);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("returns 400 when the transaction is already soft-deleted", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue({
      ...mockExpense,
      deletedAt: new Date("2024-01-01"),
    });

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(400);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not the owner and lacks delete permission", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findUnique.mockResolvedValue({
      ...mockExpense,
      createdBy: "other-user-999",
    });
    vi.mocked(hasPermission).mockResolvedValue(false);

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(403);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("allows the owner to delete their own transaction without explicit permission", async () => {
    const { config, prismaModel } = makeConfig();
    const ownedExpense = { ...mockExpense, createdBy: "user-123" };
    prismaModel.findUnique.mockResolvedValue(ownedExpense);
    prismaModel.update.mockResolvedValue({ ...ownedExpense, deletedAt: new Date() });
    vi.mocked(hasPermission).mockResolvedValue(false);

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { config, prismaModel } = makeConfig();
    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(401);
    expect(prismaModel.update).not.toHaveBeenCalled();
  });

  it("refunds petty cash payment when deleting an expense with a petty cash source", async () => {
    const { config, prismaModel } = makeConfig();
    const pettyCashPayment = {
      id: "payment-1",
      expenseId: "exp-1",
      paidByType: "PETTY_CASH",
      paidByPettyCashFundId: "fund-1",
      amount: 1000,
      settlementStatus: "PENDING",
    };
    prismaModel.findUnique.mockResolvedValue(mockExpense);
    prismaModel.update.mockResolvedValue({ ...mockExpense, deletedAt: new Date() });
    vi.mocked(prisma.expensePayment.findMany).mockResolvedValue([pettyCashPayment] as any);
    vi.mocked(prisma.pettyCashFund.update).mockResolvedValue({} as any);
    vi.mocked(prisma.pettyCashTransaction.create).mockResolvedValue({} as any);

    const handler = createDeleteHandler(config);
    const response = await handler(
      new Request("http://localhost/api/expenses/exp-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(200);
    expect(prisma.pettyCashFund.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "fund-1" },
        data: expect.objectContaining({ currentAmount: expect.any(Object) }),
      })
    );
    expect(prisma.pettyCashTransaction.create).toHaveBeenCalledOnce();
  });
});
