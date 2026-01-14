/**
 * Integration Tests for Incomes API
 * Tests the income route handlers with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiResponse } from "@/lib/api/response";
import { incomeRouteConfig } from "@/lib/api/configs/income-config";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    income: {
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
  notifyIncome: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/in-app", () => ({
  notifyTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

describe("Income Route Config", () => {
  describe("transformCreateData", () => {
    it("should transform create data correctly with all fields", () => {
      const input = {
        contactId: "customer-123",
        contactName: "Test Customer",
        amount: 5000,
        vatRate: 7,
        vatAmount: 350,
        isWhtDeducted: true,
        whtRate: 3,
        whtAmount: 150,
        whtType: "SERVICE",
        netReceived: 5200,
        source: "Service fee",
        accountId: "account-456",
        invoiceNumber: "INV-2026-001",
        referenceNo: "REF-001",
        paymentMethod: "BANK_TRANSFER",
        receiveDate: "2026-01-14",
        status: "WAITING_INVOICE_ISSUE",
        notes: "Monthly service fee",
        customerSlipUrls: ["http://example.com/slip.jpg"],
        myBillCopyUrls: ["http://example.com/invoice.pdf"],
        whtCertUrls: ["http://example.com/wht.pdf"],
      };

      const result = incomeRouteConfig.transformCreateData(input);

      expect(result.contactId).toBe("customer-123");
      expect(result.contactName).toBe("Test Customer");
      expect(result.amount).toBe(5000);
      expect(result.vatRate).toBe(7);
      expect(result.vatAmount).toBe(350);
      expect(result.isWhtDeducted).toBe(true);
      expect(result.whtRate).toBe(3);
      expect(result.whtAmount).toBe(150);
      expect(result.netReceived).toBe(5200);
      expect(result.source).toBe("Service fee");
      expect(result.accountId).toBe("account-456");
      expect(result.invoiceNumber).toBe("INV-2026-001");
      expect(result.customerSlipUrls).toEqual(["http://example.com/slip.jpg"]);
      expect(result.hasInvoice).toBe(true);
      expect(result.hasWhtCert).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const input = {
        amount: 1000,
        source: "Cash sale",
        netReceived: 1000,
      };

      const result = incomeRouteConfig.transformCreateData(input);

      expect(result.contactId).toBeNull();
      expect(result.contactName).toBeNull();
      expect(result.amount).toBe(1000);
      expect(result.vatRate).toBe(0);
      expect(result.isWhtDeducted).toBe(false);
      expect(result.whtRate).toBeNull();
      expect(result.customerSlipUrls).toEqual([]);
      expect(result.myBillCopyUrls).toEqual([]);
      expect(result.whtCertUrls).toEqual([]);
      expect(result.hasInvoice).toBe(false);
      expect(result.hasWhtCert).toBe(false);
    });

    it("should auto-determine workflow status when not provided", () => {
      const inputWithInvoice = {
        amount: 5000,
        netReceived: 5000,
        source: "Service",
        myBillCopyUrls: ["http://example.com/invoice.pdf"],
      };

      const result = incomeRouteConfig.transformCreateData(inputWithInvoice);
      expect(result.workflowStatus).toBe("READY_FOR_ACCOUNTING");

      const inputWithInvoiceAndWht = {
        amount: 5000,
        netReceived: 4850,
        source: "Service",
        isWhtDeducted: true,
        myBillCopyUrls: ["http://example.com/invoice.pdf"],
      };

      const result2 = incomeRouteConfig.transformCreateData(inputWithInvoiceAndWht);
      expect(result2.workflowStatus).toBe("WHT_PENDING_CERT");

      const inputNoInvoice = {
        amount: 5000,
        netReceived: 5000,
        source: "Cash sale",
      };

      const result3 = incomeRouteConfig.transformCreateData(inputNoInvoice);
      expect(result3.workflowStatus).toBe("WAITING_INVOICE_ISSUE");
    });

    it("should use user-selected status when provided", () => {
      const input = {
        amount: 5000,
        netReceived: 5000,
        source: "Service",
        status: "SENT_TO_ACCOUNTANT",
      };

      const result = incomeRouteConfig.transformCreateData(input);
      expect(result.workflowStatus).toBe("SENT_TO_ACCOUNTANT");
    });
  });

  describe("transformUpdateData", () => {
    it("should only update provided fields", () => {
      const input = {
        source: "Updated service",
        amount: 6000,
      };

      const result = incomeRouteConfig.transformUpdateData(input);

      expect(result.source).toBe("Updated service");
      expect(result.amount).toBe(6000);
      expect(result.contactId).toBeUndefined();
      expect(result.vatRate).toBeUndefined();
    });

    it("should handle file URL updates", () => {
      const input = {
        myBillCopyUrls: ["http://example.com/new-invoice.pdf"],
      };

      const result = incomeRouteConfig.transformUpdateData(input);

      expect(result.myBillCopyUrls).toEqual(["http://example.com/new-invoice.pdf"]);
      expect(result.hasInvoice).toBe(true);
      expect(result.invoiceIssuedAt).toBeInstanceOf(Date);
    });

    it("should handle WHT cert URL updates", () => {
      const input = {
        whtCertUrls: ["http://example.com/wht-cert.pdf"],
      };

      const result = incomeRouteConfig.transformUpdateData(input);

      expect(result.whtCertUrls).toEqual(["http://example.com/wht-cert.pdf"]);
      expect(result.hasWhtCert).toBe(true);
      expect(result.whtCertReceivedAt).toBeInstanceOf(Date);
    });

    it("should auto-adjust workflow when WHT changes from false to true", () => {
      const input = { isWhtDeducted: true };
      const existingData = {
        isWhtDeducted: false,
        workflowStatus: "READY_FOR_ACCOUNTING",
        hasInvoice: true,
        hasWhtCert: false,
      };

      const result = incomeRouteConfig.transformUpdateData(input, existingData);

      expect(result.workflowStatus).toBe("WHT_PENDING_CERT");
    });

    it("should auto-adjust workflow when WHT changes from true to false", () => {
      const input = { isWhtDeducted: false };
      const existingData = {
        isWhtDeducted: true,
        workflowStatus: "WHT_PENDING_CERT",
        hasInvoice: true,
        hasWhtCert: false,
      };

      const result = incomeRouteConfig.transformUpdateData(input, existingData);

      expect(result.workflowStatus).toBe("READY_FOR_ACCOUNTING");
    });
  });

  describe("getEntityDisplayName", () => {
    it("should return contact name when available", () => {
      const income = {
        contact: { name: "Test Customer" },
        source: "Service fee",
      };

      const result = incomeRouteConfig.getEntityDisplayName?.(income);
      expect(result).toBe("Test Customer");
    });

    it("should return source when no contact", () => {
      const income = {
        contact: null,
        source: "Cash sale",
      };

      const result = incomeRouteConfig.getEntityDisplayName?.(income);
      expect(result).toBe("Cash sale");
    });

    it("should return undefined when no contact or source", () => {
      const income = {
        contact: null,
        source: undefined,
      };

      const result = incomeRouteConfig.getEntityDisplayName?.(income);
      expect(result).toBeUndefined();
    });
  });
});

describe("Income API Response Integration", () => {
  it("should create success response with income data", async () => {
    const incomeData = {
      id: "inc-123",
      amount: 5000,
      source: "Service fee",
    };

    const response = apiResponse.success({ income: incomeData });

    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.income).toEqual(incomeData);
  });

  it("should create 201 response for created income", async () => {
    const incomeData = {
      id: "inc-new",
      amount: 2500,
    };

    const response = apiResponse.created({ income: incomeData });

    expect(response.status).toBe(201);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.income.id).toBe("inc-new");
  });

  it("should handle validation errors for income", async () => {
    const response = apiResponse.badRequest("Amount must be greater than 0");

    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Amount must be greater than 0");
  });
});
