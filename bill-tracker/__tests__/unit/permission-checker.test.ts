import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  hasCompanyAccess,
} from "@/lib/permissions/checker";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    companyAccess: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock next-auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Permission Checker", () => {
  const mockUserId = "user-123";
  const mockCompanyId = "company-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasPermission", () => {
    it("should return false if user has no access to company", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(null);

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:read");

      expect(result).toBe(false);
      expect(prisma.companyAccess.findUnique).toHaveBeenCalledWith({
        where: {
          userId_companyId: {
            userId: mockUserId,
            companyId: mockCompanyId,
          },
        },
      });
    });

    it("should return true if user is owner", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: true,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:delete");

      expect(result).toBe(true);
    });

    it("should return true if user has exact permission", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read", "expenses:create"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:read");

      expect(result).toBe(true);
    });

    it("should return true if user has wildcard permission", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:*"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:delete");

      expect(result).toBe(true);
    });

    it("should return false if user lacks permission", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:delete");

      expect(result).toBe(false);
    });

    it("should handle different modules correctly", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:*"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const expenseResult = await hasPermission(mockUserId, mockCompanyId, "expenses:create");
      const incomeResult = await hasPermission(mockUserId, mockCompanyId, "incomes:create");

      expect(expenseResult).toBe(true);
      expect(incomeResult).toBe(false);
    });
  });

  describe("hasPermissions", () => {
    it("should check multiple permissions and return results object", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read", "expenses:create"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermissions(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:create",
        "expenses:delete",
      ]);

      expect(result).toEqual({
        "expenses:read": true,
        "expenses:create": true,
        "expenses:delete": false,
      });
    });

    it("should return all true for owner", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: true,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermissions(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:delete",
        "settings:manage",
      ]);

      expect(result).toEqual({
        "expenses:read": true,
        "expenses:delete": true,
        "settings:manage": true,
      });
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasAnyPermission(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:delete",
      ]);

      expect(result).toBe(true);
    });

    it("should return false if user has none of the permissions", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["incomes:read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasAnyPermission(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:delete",
      ]);

      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read", "expenses:create", "expenses:delete"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasAllPermissions(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:create",
      ]);

      expect(result).toBe(true);
    });

    it("should return false if user lacks any permission", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasAllPermissions(mockUserId, mockCompanyId, [
        "expenses:read",
        "expenses:delete",
      ]);

      expect(result).toBe(false);
    });

    it("should return true for owner with any permissions", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: true,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasAllPermissions(mockUserId, mockCompanyId, [
        "expenses:delete",
        "settings:manage",
        "users:delete",
      ]);

      expect(result).toBe(true);
    });
  });

  describe("getUserPermissions", () => {
    it("should return permissions for regular user", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read", "incomes:read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserPermissions(mockUserId, mockCompanyId);

      expect(result).toEqual({
        isOwner: false,
        permissions: ["expenses:read", "incomes:read"],
      });
    });

    it("should return owner status", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: true,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserPermissions(mockUserId, mockCompanyId);

      expect(result).toEqual({
        isOwner: true,
        permissions: [],
      });
    });

    it("should return empty permissions if no access", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(null);

      const result = await getUserPermissions(mockUserId, mockCompanyId);

      expect(result).toEqual({
        isOwner: false,
        permissions: [],
      });
    });
  });

  describe("hasCompanyAccess", () => {
    it("should return true if user has access", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasCompanyAccess(mockUserId, mockCompanyId);

      expect(result).toBe(true);
    });

    it("should return false if user has no access", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue(null);

      const result = await hasCompanyAccess(mockUserId, mockCompanyId);

      expect(result).toBe(false);
    });
  });

  describe("Wildcard Permission Scenarios", () => {
    it("should handle multiple wildcard permissions", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:*", "incomes:*"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const expenseCreate = await hasPermission(mockUserId, mockCompanyId, "expenses:create");
      const expenseDelete = await hasPermission(mockUserId, mockCompanyId, "expenses:delete");
      const incomeRead = await hasPermission(mockUserId, mockCompanyId, "incomes:read");
      const settingsManage = await hasPermission(mockUserId, mockCompanyId, "settings:manage");

      expect(expenseCreate).toBe(true);
      expect(expenseDelete).toBe(true);
      expect(incomeRead).toBe(true);
      expect(settingsManage).toBe(false);
    });

    it("should prioritize exact match over wildcard", async () => {
      vi.mocked(prisma.companyAccess.findUnique).mockResolvedValue({
        id: "access-1",
        userId: mockUserId,
        companyId: mockCompanyId,
        isOwner: false,
        permissions: ["expenses:read", "expenses:*"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission(mockUserId, mockCompanyId, "expenses:read");

      expect(result).toBe(true);
    });
  });
});
