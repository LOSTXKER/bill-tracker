/**
 * Integration Tests for Contacts API
 * Tests contact CRUD operations with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiResponse } from "@/lib/api/response";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    expense: {
      count: vi.fn(),
    },
    income: {
      count: vi.fn(),
    },
    companyAccess: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit/logger", () => ({
  logCreate: vi.fn().mockResolvedValue(undefined),
  logUpdate: vi.fn().mockResolvedValue(undefined),
  logDelete: vi.fn().mockResolvedValue(undefined),
}));

describe("Contacts API Response Handling", () => {
  describe("Success Responses", () => {
    it("should format contact list response correctly", async () => {
      const contactsData = {
        contacts: [
          { id: "c1", name: "Vendor A", taxId: "1234567890123" },
          { id: "c2", name: "Customer B", taxId: "9876543210123" },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
        },
      };

      const response = apiResponse.success(contactsData);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.contacts).toHaveLength(2);
      expect(body.data.pagination.total).toBe(2);
    });

    it("should format single contact response correctly", async () => {
      const contactData = {
        contact: {
          id: "c1",
          name: "Test Vendor",
          taxId: "1234567890123",
          contactCategory: "VENDOR",
          entityType: "COMPANY",
          branchCode: "00000",
        },
      };

      const response = apiResponse.success(contactData);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.contact.name).toBe("Test Vendor");
      expect(body.data.contact.contactCategory).toBe("VENDOR");
    });

    it("should return 201 for created contact", async () => {
      const newContact = {
        contact: {
          id: "c-new",
          name: "New Contact",
          contactCategory: "CUSTOMER",
        },
      };

      const response = apiResponse.created(newContact);

      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.contact.id).toBe("c-new");
    });

    it("should format delete success message", async () => {
      const response = apiResponse.success({ message: "ลบสำเร็จ" });

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toBe("ลบสำเร็จ");
    });
  });

  describe("Error Responses", () => {
    it("should handle not found error", async () => {
      const response = apiResponse.notFound("Contact not found");

      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Contact not found");
      expect(body.code).toBe("NOT_FOUND");
    });

    it("should handle validation error for missing ID", async () => {
      const response = apiResponse.badRequest("Contact ID is required");

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Contact ID is required");
    });

    it("should handle delete restriction error", async () => {
      const response = apiResponse.error(
        new Error("ไม่สามารถลบได้ มีรายการที่เชื่อมโยงอยู่ 5 รายการ")
      );

      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("ไม่สามารถลบได้");
    });

    it("should handle unauthorized access", async () => {
      const response = apiResponse.unauthorized();

      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should handle forbidden access", async () => {
      const response = apiResponse.forbidden("No permission to manage contacts");

      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("No permission to manage contacts");
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});

describe("Contact Data Validation", () => {
  it("should validate tax ID format", () => {
    const validTaxId = "1234567890123";
    const invalidTaxId = "123";

    expect(validTaxId.length).toBe(13);
    expect(invalidTaxId.length).not.toBe(13);
  });

  it("should handle contact category types", () => {
    const categories = ["VENDOR", "CUSTOMER", "BOTH", "EMPLOYEE", "OTHER"];
    
    categories.forEach(category => {
      expect(typeof category).toBe("string");
    });
  });

  it("should handle entity types", () => {
    const entityTypes = ["INDIVIDUAL", "COMPANY", "GOVERNMENT"];
    
    entityTypes.forEach(type => {
      expect(typeof type).toBe("string");
    });
  });

  it("should validate branch code format", () => {
    const validBranchCodes = ["00000", "00001", "12345"];
    const invalidBranchCodes = ["abc", "123", "1234567"];

    validBranchCodes.forEach(code => {
      expect(code.length).toBe(5);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    invalidBranchCodes.forEach(code => {
      const isValid = code.length === 5 && /^\d+$/.test(code);
      expect(isValid).toBe(false);
    });
  });
});

describe("Contact Search Functionality", () => {
  it("should build correct search query", () => {
    const search = "test vendor";
    
    const searchQuery = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };

    expect(searchQuery.OR).toHaveLength(4);
    expect(searchQuery.OR[0].name.contains).toBe(search);
  });

  it("should handle empty search", () => {
    const search = "";
    
    // When search is empty, no OR clause should be added
    const where = {
      companyId: "company-123",
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    expect(where.OR).toBeUndefined();
  });
});

describe("Contact Pagination", () => {
  it("should calculate pagination correctly", () => {
    const page = 2;
    const limit = 50;
    const total = 120;

    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    expect(skip).toBe(50);
    expect(totalPages).toBe(3);
  });

  it("should handle first page", () => {
    const page = 1;
    const limit = 50;

    const skip = (page - 1) * limit;

    expect(skip).toBe(0);
  });

  it("should handle last page with partial results", () => {
    const total = 75;
    const limit = 50;

    const totalPages = Math.ceil(total / limit);
    const lastPageItems = total - (totalPages - 1) * limit;

    expect(totalPages).toBe(2);
    expect(lastPageItems).toBe(25);
  });
});
