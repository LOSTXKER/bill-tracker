import { describe, it, expect, vi, beforeEach } from "vitest";
import { withCompanyAccess, withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

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

const mockAccess = {
  id: "access-1",
  userId: "user-123",
  companyId: "company-456",
  isOwner: false,
  permissions: ["expenses:read", "expenses:create"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(url = "http://localhost/api/test?company=TESTCO") {
  return new Request(url);
}

function makeSuccessHandler() {
  return vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
}

describe("withCompanyAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 400 when company code is not provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(new Request("http://localhost/api/test"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 404 when company is not found in database", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user has no company access record", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(null);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks the required permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      ...mockAccess,
      isOwner: false,
      permissions: ["incomes:read"],
    } as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { permission: "expenses:delete" });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when user has valid session, access, and permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { permission: "expenses:read" });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("grants owner access regardless of permission requirement", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      ...mockAccess,
      isOwner: true,
      permissions: [],
    } as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { permission: "settings:delete" });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("grants access with wildcard permission matching", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      ...mockAccess,
      isOwner: false,
      permissions: ["expenses:*"],
    } as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { permission: "expenses:delete" });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 403 when requireOwner is true but user is not owner", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { requireOwner: true });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes when requireOwner is true and user is owner", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
      ...mockAccess,
      isOwner: true,
    } as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, { requireOwner: true });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 500 when handler throws an unexpected error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = vi.fn().mockRejectedValue(new Error("Unexpected server error"));
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(500);
  });

  it("passes company, session, and normalized companyCode to handler context", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    let capturedContext: any;
    const handler = vi.fn().mockImplementation(async (_req: Request, ctx: any) => {
      capturedContext = ctx;
      return NextResponse.json({ ok: true });
    });

    const wrapped = withCompanyAccess(handler);
    await wrapped(new Request("http://localhost/api/test?company=testco")); // lowercase

    expect(capturedContext.company).toEqual(mockCompany);
    expect(capturedContext.session).toMatchObject({ user: { id: "user-123" } });
    expect(capturedContext.companyCode).toBe("TESTCO"); // normalized to uppercase
  });

  it("extracts company code from JSON body for POST requests", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler);
    const response = await wrapped(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyCode: "TESTCO", amount: 100 }),
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { code: "TESTCO" },
    });
  });

  it("uses custom getCompanyCode when provided in options", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccess(handler, {
      getCompanyCode: () => "TESTCO",
    });
    const response = await wrapped(new Request("http://localhost/api/no-params"));

    expect(response.status).toBe(200);
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { code: "TESTCO" },
    });
  });
});

describe("withCompanyAccessFromParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts short company code from params.company", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccessFromParams(handler);

    const response = await wrapped(
      new Request("http://localhost/api/TESTCO/expenses"),
      { params: Promise.resolve({ company: "TESTCO" }) }
    );

    expect(response.status).toBe(200);
    expect(prisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "TESTCO" } })
    );
  });

  it("looks up company by ID when param is a long non-code identifier", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique)
      .mockResolvedValueOnce({ code: "TESTCO" } as any) // lookup by long ID
      .mockResolvedValueOnce(mockCompany as any);        // lookup by code
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccessFromParams(handler);

    const longId = "clxxxxxxxxxxxxxxxxxxxxxxx"; // >10 chars, looks like a DB ID
    const response = await wrapped(
      new Request("http://localhost/api/test"),
      { params: Promise.resolve({ company: longId }) }
    );

    expect(response.status).toBe(200);
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: longId },
      select: { code: true },
    });
  });

  it("returns 400 when params have no valid company identifier", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccessFromParams(handler);

    const response = await wrapped(
      new Request("http://localhost/api/test"),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes route params to the inner handler context", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    let capturedParams: any;
    const handler = vi.fn().mockImplementation(async (_req: Request, ctx: any) => {
      capturedParams = ctx.params;
      return NextResponse.json({ ok: true });
    });

    const wrapped = withCompanyAccessFromParams(handler);
    const routeParams = { company: "TESTCO", id: "item-789" };

    await wrapped(
      new Request("http://localhost/api/TESTCO/expenses/item-789"),
      { params: Promise.resolve(routeParams) }
    );

    expect(capturedParams).toEqual(routeParams);
  });

  it("also accepts companyId param name for company lookup", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
    vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(mockAccess as any);

    const handler = makeSuccessHandler();
    const wrapped = withCompanyAccessFromParams(handler);

    const response = await wrapped(
      new Request("http://localhost/api/test"),
      { params: Promise.resolve({ companyId: "TESTCO" }) }
    );

    expect(response.status).toBe(200);
  });
});
