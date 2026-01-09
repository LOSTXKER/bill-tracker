import { describe, it, expect } from "vitest";
import { expenseSchema } from "@/lib/validations/expense";
import { incomeSchema } from "@/lib/validations/income";

describe("Expense Validation", () => {
  it("should validate valid expense data", () => {
    const validData = {
      companyId: "company-123",
      amount: 1000,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
    };

    const result = expenseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject negative amounts", () => {
    const invalidData = {
      companyId: "company-123",
      amount: -100,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
    };

    const result = expenseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject zero amount", () => {
    const invalidData = {
      companyId: "company-123",
      amount: 0,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
    };

    const result = expenseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should accept valid VAT rates", () => {
    const validRates = [0, 7];

    validRates.forEach((vatRate) => {
      const data = {
        companyId: "company-123",
        amount: 1000,
        vatRate,
        paymentMethod: "BANK_TRANSFER",
        billDate: new Date(),
        status: "PENDING_PHYSICAL",
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should accept valid WHT rates", () => {
    const validWhtRates = [1, 2, 3, 5, 10]; // 0 is excluded when isWht=true

    validWhtRates.forEach((whtRate) => {
      const data = {
        companyId: "company-123",
        amount: 1000,
        vatRate: 7,
        isWht: true,
        whtRate,
        whtType: "SERVICE_3",
        paymentMethod: "BANK_TRANSFER",
        billDate: new Date(),
        status: "PENDING_PHYSICAL",
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should validate expense status values", () => {
    const validStatuses = [
      "WAITING_FOR_DOC",
      "PENDING_PHYSICAL",
      "READY_TO_SEND",
      "SENT_TO_ACCOUNT",
    ];

    validStatuses.forEach((status) => {
      const data = {
        companyId: "company-123",
        amount: 1000,
        vatRate: 7,
        paymentMethod: "BANK_TRANSFER",
        billDate: new Date(),
        status,
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid status", () => {
    const data = {
      companyId: "company-123",
      amount: 1000,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "INVALID_STATUS",
    };

    const result = expenseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should accept valid payment methods", () => {
    const validMethods = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "PROMPTPAY", "CHEQUE"];

    validMethods.forEach((paymentMethod) => {
      const data = {
        companyId: "company-123",
        amount: 1000,
        vatRate: 7,
        paymentMethod,
        billDate: new Date(),
        status: "PENDING_PHYSICAL",
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe("Income Validation", () => {
  it("should validate valid income data", () => {
    const validData = {
      companyId: "company-123",
      amount: 1000,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject negative amounts", () => {
    const invalidData = {
      companyId: "company-123",
      amount: -100,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should validate income status values", () => {
    const validStatuses = [
      "NO_DOC_REQUIRED",
      "WAITING_ISSUE",
      "WAITING_WHT_CERT",
      "PENDING_COPY_SEND",
      "SENT_COPY",
    ];

    validStatuses.forEach((status) => {
      const data = {
        companyId: "company-123",
        amount: 1000,
        vatRate: 7,
        paymentMethod: "BANK_TRANSFER",
        receiveDate: new Date(),
        status,
      };

      const result = incomeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should accept income with WHT deduction", () => {
    const data = {
      companyId: "company-123",
      amount: 10000,
      vatRate: 7,
      isWhtDeducted: true,
      whtRate: 3,
      whtType: "SERVICE_3",
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept income with source", () => {
    const data = {
      companyId: "company-123",
      amount: 1000,
      vatRate: 7,
      source: "ขายสินค้าให้บริษัท ABC",
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept income with contact ID", () => {
    const data = {
      companyId: "company-123",
      amount: 1000,
      vatRate: 7,
      contactId: "contact-123",
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
