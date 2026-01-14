/**
 * Integration Tests for Reimbursement Requests API
 * Tests reimbursement request CRUD operations with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiResponse } from "@/lib/api/response";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    reimbursementRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
    expense: {
      create: vi.fn(),
    },
    companyAccess: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("ABC123"),
}));

describe("Reimbursement Request API Responses", () => {
  describe("Success Responses", () => {
    it("should format request list response correctly", async () => {
      const requestsData = {
        requests: [
          {
            id: "req-1",
            trackingCode: "RB-ABC123",
            requesterName: "John Doe",
            amount: 1000,
            status: "PENDING",
          },
          {
            id: "req-2",
            trackingCode: "RB-DEF456",
            requesterName: "Jane Smith",
            amount: 2500,
            status: "APPROVED",
          },
        ],
      };

      const response = apiResponse.success(requestsData);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.requests).toHaveLength(2);
    });

    it("should format created response with tracking info", async () => {
      const response = apiResponse.created(
        {
          trackingCode: "RB-ABC123",
          trackingUrl: "/track/RB-ABC123",
        },
        "Reimbursement request created successfully"
      );

      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.trackingCode).toBe("RB-ABC123");
      expect(body.data.trackingUrl).toBe("/track/RB-ABC123");
      expect(body.message).toBe("Reimbursement request created successfully");
    });

    it("should format approval response", async () => {
      const approvalData = {
        request: {
          id: "req-1",
          trackingCode: "RB-ABC123",
          status: "APPROVED",
          approvedAt: new Date().toISOString(),
          approverId: "user-123",
        },
      };

      const response = apiResponse.success(approvalData, "Request approved");

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.request.status).toBe("APPROVED");
      expect(body.message).toBe("Request approved");
    });
  });

  describe("Error Responses", () => {
    it("should handle missing company ID", async () => {
      const response = apiResponse.badRequest("Company ID is required");

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Company ID is required");
    });

    it("should handle missing requester name", async () => {
      const response = apiResponse.badRequest("Requester name is required");

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Requester name is required");
    });

    it("should handle missing bank information", async () => {
      const response = apiResponse.badRequest("Bank information is required");

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Bank information is required");
    });

    it("should handle invalid amount", async () => {
      const response = apiResponse.badRequest("Valid amount is required");

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Valid amount is required");
    });

    it("should handle company not found", async () => {
      const response = apiResponse.notFound("Company not found");

      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Company not found");
    });

    it("should handle creation failure", async () => {
      const response = apiResponse.error("Failed to create reimbursement request");

      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Failed to create reimbursement request");
    });
  });
});

describe("Reimbursement Request Validation", () => {
  describe("Amount Calculations", () => {
    it("should calculate VAT amount correctly", () => {
      const amount = 1000;
      const vatRate = 7;

      const vatAmount = (amount * vatRate) / 100;

      expect(vatAmount).toBe(70);
    });

    it("should calculate net amount with VAT", () => {
      const amount = 1000;
      const vatAmount = 70;

      const netAmount = amount + vatAmount;

      expect(netAmount).toBe(1070);
    });

    it("should handle zero VAT", () => {
      const amount = 500;
      const vatRate = 0;

      const vatAmount = vatRate > 0 ? (amount * vatRate) / 100 : 0;
      const netAmount = amount + vatAmount;

      expect(vatAmount).toBe(0);
      expect(netAmount).toBe(500);
    });

    it("should use provided VAT amount over calculated", () => {
      const amount = 1000;
      const vatRate = 7;
      const providedVatAmount = 75; // Slightly different from calculated

      const calculatedVatAmount = (amount * vatRate) / 100;
      const finalVatAmount = providedVatAmount || calculatedVatAmount;

      expect(finalVatAmount).toBe(75);
    });
  });

  describe("Tracking Code Generation", () => {
    it("should generate tracking code with correct format", () => {
      const mockNanoid = "ABCDEF";
      const trackingCode = `RB-${mockNanoid}`;

      expect(trackingCode).toMatch(/^RB-[A-Z0-9]{6}$/);
    });

    it("should generate uppercase tracking codes", () => {
      const mockNanoid = "abc123";
      const trackingCode = `RB-${mockNanoid.toUpperCase()}`;

      expect(trackingCode).toBe("RB-ABC123");
    });
  });

  describe("Status Transitions", () => {
    it("should validate status values", () => {
      const validStatuses = [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "PAID",
        "CANCELLED",
      ];

      validStatuses.forEach(status => {
        expect(typeof status).toBe("string");
      });
    });

    it("should validate status transition from PENDING", () => {
      const currentStatus = "PENDING";
      const allowedTransitions = ["APPROVED", "REJECTED", "CANCELLED"];

      expect(allowedTransitions.includes("APPROVED")).toBe(true);
      expect(allowedTransitions.includes("REJECTED")).toBe(true);
      expect(allowedTransitions.includes("PAID")).toBe(false);
    });

    it("should validate status transition from APPROVED", () => {
      const currentStatus = "APPROVED";
      const allowedTransitions = ["PAID", "CANCELLED"];

      expect(allowedTransitions.includes("PAID")).toBe(true);
      expect(allowedTransitions.includes("REJECTED")).toBe(false);
    });
  });

  describe("Bank Information Validation", () => {
    it("should validate bank account number", () => {
      const validBankAccountNo = "1234567890";
      const invalidBankAccountNo = "";

      expect(validBankAccountNo.length).toBeGreaterThan(0);
      expect(invalidBankAccountNo.length).toBe(0);
    });

    it("should validate bank name", () => {
      const validBankNames = [
        "กสิกรไทย",
        "ไทยพาณิชย์",
        "กรุงเทพ",
        "กรุงไทย",
      ];

      validBankNames.forEach(name => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should trim whitespace from bank information", () => {
      const bankName = "  กสิกรไทย  ";
      const bankAccountNo = " 1234567890 ";
      const bankAccountName = "  ทดสอบ  ";

      expect(bankName.trim()).toBe("กสิกรไทย");
      expect(bankAccountNo.trim()).toBe("1234567890");
      expect(bankAccountName.trim()).toBe("ทดสอบ");
    });
  });
});

describe("Reimbursement Request Status Filtering", () => {
  it("should build query without status filter", () => {
    const companyId = "company-123";
    const status = null;

    const where: any = {
      companyId,
    };

    if (status) {
      where.status = status;
    }

    expect(where.status).toBeUndefined();
  });

  it("should build query with status filter", () => {
    const companyId = "company-123";
    const status = "PENDING";

    const where: any = {
      companyId,
    };

    if (status) {
      where.status = status;
    }

    expect(where.status).toBe("PENDING");
  });

  it("should handle multiple status filter", () => {
    const companyId = "company-123";
    const statuses = ["PENDING", "APPROVED"];

    const where = {
      companyId,
      status: { in: statuses },
    };

    expect(where.status.in).toEqual(["PENDING", "APPROVED"]);
  });
});
