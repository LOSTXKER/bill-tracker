/**
 * Integration Tests for Expenses API
 * Tests the expense route handlers with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiResponse } from "@/lib/api/response";
import { expenseRouteConfig } from "@/lib/api/configs/expense-config";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    expense: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  logStatusChange: vi.fn().mockResolvedValue(undefined),
  logDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/line-messaging", () => ({
  notifyExpense: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/in-app", () => ({
  notifyTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

describe("Expense Route Config", () => {
  describe("transformCreateData", () => {
    it("should transform create data correctly with all fields", () => {
      const input = {
        contactId: "contact-123",
        contactName: "Test Vendor",
        amount: 1000,
        vatRate: 7,
        vatAmount: 70,
        isWht: true,
        whtRate: 3,
        whtAmount: 30,
        whtType: "SERVICE",
        netPaid: 1040,
        description: "Test expense",
        accountId: "account-123",
        invoiceNumber: "INV-001",
        referenceNo: "REF-001",
        paymentMethod: "BANK_TRANSFER",
        billDate: "2026-01-14",
        dueDate: "2026-02-14",
        status: "WAITING_TAX_INVOICE",
        notes: "Test notes",
        slipUrls: ["http://example.com/slip.jpg"],
        taxInvoiceUrls: ["http://example.com/tax.pdf"],
        whtCertUrls: ["http://example.com/wht.pdf"],
      };

      const result = expenseRouteConfig.transformCreateData(input);

      expect(result.contactId).toBe("contact-123");
      expect(result.contactName).toBe("Test Vendor");
      expect(result.amount).toBe(1000);
      expect(result.vatRate).toBe(7);
      expect(result.vatAmount).toBe(70);
      expect(result.isWht).toBe(true);
      expect(result.whtRate).toBe(3);
      expect(result.whtAmount).toBe(30);
      expect(result.netPaid).toBe(1040);
      expect(result.description).toBe("Test expense");
      expect(result.accountId).toBe("account-123");
      expect(result.invoiceNumber).toBe("INV-001");
      expect(result.slipUrls).toEqual(["http://example.com/slip.jpg"]);
      expect(result.hasTaxInvoice).toBe(true);
      expect(result.hasWhtCert).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const input = {
        amount: 500,
        description: "Minimal expense",
        netPaid: 500,
      };

      const result = expenseRouteConfig.transformCreateData(input);

      expect(result.contactId).toBeNull();
      expect(result.contactName).toBeNull();
      expect(result.amount).toBe(500);
      expect(result.vatRate).toBe(0);
      expect(result.isWht).toBe(false);
      expect(result.whtRate).toBeNull();
      expect(result.slipUrls).toEqual([]);
      expect(result.taxInvoiceUrls).toEqual([]);
      expect(result.whtCertUrls).toEqual([]);
      expect(result.hasTaxInvoice).toBe(false);
      expect(result.hasWhtCert).toBe(false);
    });

    it("should auto-determine workflow status when not provided", () => {
      const inputWithTaxInvoice = {
        amount: 1000,
        netPaid: 1000,
        description: "Test",
        taxInvoiceUrls: ["http://example.com/tax.pdf"],
      };

      const result = expenseRouteConfig.transformCreateData(inputWithTaxInvoice);
      expect(result.workflowStatus).toBe("READY_FOR_ACCOUNTING");

      const inputWithTaxInvoiceAndWht = {
        amount: 1000,
        netPaid: 970,
        description: "Test",
        isWht: true,
        taxInvoiceUrls: ["http://example.com/tax.pdf"],
      };

      const result2 = expenseRouteConfig.transformCreateData(inputWithTaxInvoiceAndWht);
      expect(result2.workflowStatus).toBe("WHT_PENDING_ISSUE");

      const inputNoTaxInvoice = {
        amount: 1000,
        netPaid: 1000,
        description: "Test",
      };

      const result3 = expenseRouteConfig.transformCreateData(inputNoTaxInvoice);
      expect(result3.workflowStatus).toBe("WAITING_TAX_INVOICE");
    });

    it("should use user-selected status when provided", () => {
      const input = {
        amount: 1000,
        netPaid: 1000,
        description: "Test",
        status: "SENT_TO_ACCOUNTANT",
      };

      const result = expenseRouteConfig.transformCreateData(input);
      expect(result.workflowStatus).toBe("SENT_TO_ACCOUNTANT");
    });
  });

  describe("transformUpdateData", () => {
    it("should only update provided fields", () => {
      const input = {
        description: "Updated description",
        amount: 2000,
      };

      const result = expenseRouteConfig.transformUpdateData(input);

      expect(result.description).toBe("Updated description");
      expect(result.amount).toBe(2000);
      expect(result.contactId).toBeUndefined();
      expect(result.vatRate).toBeUndefined();
    });

    it("should handle file URL updates", () => {
      const input = {
        taxInvoiceUrls: ["http://example.com/new-tax.pdf"],
      };

      const result = expenseRouteConfig.transformUpdateData(input);

      expect(result.taxInvoiceUrls).toEqual(["http://example.com/new-tax.pdf"]);
      expect(result.hasTaxInvoice).toBe(true);
      expect(result.taxInvoiceAt).toBeInstanceOf(Date);
    });

    it("should auto-adjust workflow when WHT changes from false to true", () => {
      const input = { isWht: true };
      const existingData = {
        isWht: false,
        workflowStatus: "READY_FOR_ACCOUNTING",
        hasTaxInvoice: true,
        hasWhtCert: false,
      };

      const result = expenseRouteConfig.transformUpdateData(input, existingData);

      expect(result.workflowStatus).toBe("WHT_PENDING_ISSUE");
    });

    it("should auto-adjust workflow when WHT changes from true to false", () => {
      const input = { isWht: false };
      const existingData = {
        isWht: true,
        workflowStatus: "WHT_PENDING_ISSUE",
        hasTaxInvoice: true,
        hasWhtCert: false,
      };

      const result = expenseRouteConfig.transformUpdateData(input, existingData);

      expect(result.workflowStatus).toBe("READY_FOR_ACCOUNTING");
    });
  });

  describe("getEntityDisplayName", () => {
    it("should return contact name when available", () => {
      const expense = {
        contact: { name: "Test Vendor" },
        description: "Test expense",
      };

      const result = expenseRouteConfig.getEntityDisplayName?.(expense);
      expect(result).toBe("Test Vendor");
    });

    it("should return description when no contact", () => {
      const expense = {
        contact: null,
        description: "Test expense",
      };

      const result = expenseRouteConfig.getEntityDisplayName?.(expense);
      expect(result).toBe("Test expense");
    });

    it("should return undefined when no contact or description", () => {
      const expense = {
        contact: null,
        description: undefined,
      };

      const result = expenseRouteConfig.getEntityDisplayName?.(expense);
      expect(result).toBeUndefined();
    });
  });
});

describe("API Response Integration", () => {
  it("should create success response with expense data", async () => {
    const expenseData = {
      id: "exp-123",
      amount: 1000,
      description: "Test expense",
    };

    const response = apiResponse.success({ expense: expenseData });

    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.expense).toEqual(expenseData);
  });

  it("should create 201 response for created expense", async () => {
    const expenseData = {
      id: "exp-new",
      amount: 500,
    };

    const response = apiResponse.created({ expense: expenseData });

    expect(response.status).toBe(201);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.expense.id).toBe("exp-new");
  });

  it("should handle not found errors", async () => {
    const response = apiResponse.notFound("Expense not found");

    expect(response.status).toBe(404);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Expense not found");
    expect(body.code).toBe("NOT_FOUND");
  });

  it("should handle bad request errors", async () => {
    const response = apiResponse.badRequest("Invalid amount");

    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid amount");
    expect(body.code).toBe("BAD_REQUEST");
  });
});
