import { describe, it, expect, vi, beforeEach } from "vitest";
import { createListHandler } from "@/lib/api/transaction-query";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findUnique: vi.fn() },
    companyAccess: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true, headers: {} })),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/api/transaction-includes", () => ({
  getBaseIncludes: vi.fn(() => ({})),
}));

const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
  expires: "2099-01-01",
};

const mockCompany = {
  id: "company-456",
  code: "TESTCO",
  name: "Test Company",
};

// Owner access so we don't need to worry about per-test permission setup
const mockOwnerAccess = {
  id: "access-1",
  userId: "user-123",
  companyId: "company-456",
  isOwner: true,
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMockPrismaModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  const prismaModel = makeMockPrismaModel();
  return {
    config: {
      modelName: "expense",
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

function makeListRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/test");
  url.searchParams.set("company", "TESTCO");
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return new Request(url.toString());
}

describe("createListHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockOwnerAccess as any);
  });

  it("returns 200 with paginated list and default pagination values", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.findMany.mockResolvedValue([{ id: "exp-1", description: "Test" }]);
    prismaModel.count.mockResolvedValue(1);

    const handler = createListHandler(config);
    const response = await handler(makeListRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.expenses).toHaveLength(1);
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("always scopes query to the authenticated company", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest());

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "company-456" }),
      })
    );
  });

  it("applies status filter when status param is provided", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ status: "ACTIVE" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("applies workflowStatus filter", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ workflowStatus: "PAID" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workflowStatus: "PAID" }),
      })
    );
  });

  it("applies approvalStatus filter", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ approvalStatus: "PENDING" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ approvalStatus: "PENDING" }),
      })
    );
  });

  it("applies date range filter with gte and lte when both dateFrom and dateTo are provided", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ dateFrom: "2024-01-01", dateTo: "2024-12-31" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it("applies only gte when only dateFrom is provided", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ dateFrom: "2024-06-01" }));

    const call = prismaModel.findMany.mock.calls[0][0];
    expect(call.where.date).toHaveProperty("gte");
    expect(call.where.date).not.toHaveProperty("lte");
  });

  it("applies search filter using OR with contains insensitive match", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ search: "invoice" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              description: expect.objectContaining({
                contains: "invoice",
                mode: "insensitive",
              }),
            }),
          ]),
        }),
      })
    );
  });

  it("applies custom sortBy and sortOrder from query params", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ sortBy: "date", sortOrder: "asc" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([{ date: "asc" }]),
      })
    );
  });

  it("defaults to createdAt desc ordering", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest());

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([{ createdAt: "desc" }]),
      })
    );
  });

  it("calculates correct skip value for pagination", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ page: "3", limit: "10" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("caps limit at 100 to prevent oversized queries", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ limit: "500" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("calculates totalPages correctly in pagination response", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.count.mockResolvedValue(45);

    const handler = createListHandler(config);
    const response = await handler(makeListRequest({ limit: "10" }));
    const body = await response.json();

    expect(body.data.pagination.totalPages).toBe(5);
  });

  it("excludes soft-deleted items by default", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest());

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it("omits deletedAt filter when includeDeleted=true", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ includeDeleted: "true" }));

    const call = prismaModel.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("deletedAt");
  });

  it("applies tab=draft filter to user's own draft items", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ tab: "draft" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workflowStatus: "DRAFT",
          createdBy: "user-123",
        }),
      })
    );
  });

  it("applies tab=pending filter for approval-pending items", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ tab: "pending" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ approvalStatus: "PENDING" }),
      })
    );
  });

  it("applies tab=rejected filter to user's own rejected items", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ tab: "rejected" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approvalStatus: "REJECTED",
          createdBy: "user-123",
        }),
      })
    );
  });

  it("applies onlyMine filter when onlyMine=true", async () => {
    const { config, prismaModel } = makeConfig();

    const handler = createListHandler(config);
    await handler(makeListRequest({ onlyMine: "true" }));

    expect(prismaModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdBy: "user-123" }),
      })
    );
  });

  it("calls both findMany and count with the same where clause", async () => {
    const { config, prismaModel } = makeConfig();
    prismaModel.count.mockResolvedValue(5);

    const handler = createListHandler(config);
    await handler(makeListRequest({ status: "ACTIVE" }));

    expect(prismaModel.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE", companyId: "company-456" }),
      })
    );
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { config } = makeConfig();
    const handler = createListHandler(config);
    const response = await handler(makeListRequest());

    expect(response.status).toBe(401);
  });
});
