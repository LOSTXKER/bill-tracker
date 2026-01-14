import { describe, it, expect } from "vitest";
import { expenseSchema } from "@/lib/validations/expense";
import { incomeSchema } from "@/lib/validations/income";

// Base valid data to be used in tests
const baseExpenseData = {
  companyId: "company-123",
  contactId: "contact-123",
  amount: 1000,
  vatRate: 7,
  description: "Test expense description",
  paymentMethod: "BANK_TRANSFER",
  billDate: new Date(),
  status: "PENDING_PHYSICAL",
};

const baseIncomeData = {
  companyId: "company-123",
  contactId: "contact-123",
  amount: 1000,
  vatRate: 7,
  source: "Test income source",
  paymentMethod: "BANK_TRANSFER",
  receiveDate: new Date(),
  status: "PENDING_COPY_SEND",
};

describe("Expense Validation", () => {
  it("should validate valid expense data", () => {
    const result = expenseSchema.safeParse(baseExpenseData);
    expect(result.success).toBe(true);
  });

  it("should reject negative amounts", () => {
    const invalidData = {
      ...baseExpenseData,
      amount: -100,
    };

    const result = expenseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject zero amount", () => {
    const invalidData = {
      ...baseExpenseData,
      amount: 0,
    };

    const result = expenseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should accept valid VAT rates", () => {
    const validRates = [0, 7];

    validRates.forEach((vatRate) => {
      const data = {
        ...baseExpenseData,
        vatRate,
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should accept valid WHT rates", () => {
    const validWhtRates = [1, 2, 3, 5, 10]; // 0 is excluded when isWht=true

    validWhtRates.forEach((whtRate) => {
      const data = {
        ...baseExpenseData,
        isWht: true,
        whtRate,
        whtType: "SERVICE_3",
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
        ...baseExpenseData,
        status,
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid status", () => {
    const data = {
      ...baseExpenseData,
      status: "INVALID_STATUS",
    };

    const result = expenseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should accept valid payment methods", () => {
    const validMethods = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "PROMPTPAY", "CHEQUE"];

    validMethods.forEach((paymentMethod) => {
      const data = {
        ...baseExpenseData,
        paymentMethod,
      };

      const result = expenseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should require description", () => {
    const data = {
      companyId: "company-123",
      contactId: "contact-123",
      amount: 1000,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
      // description is missing
    };

    const result = expenseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should require contactId", () => {
    const data = {
      companyId: "company-123",
      // contactId is missing
      amount: 1000,
      vatRate: 7,
      description: "Test",
      paymentMethod: "BANK_TRANSFER",
      billDate: new Date(),
      status: "PENDING_PHYSICAL",
    };

    const result = expenseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Income Validation", () => {
  it("should validate valid income data", () => {
    const result = incomeSchema.safeParse(baseIncomeData);
    expect(result.success).toBe(true);
  });

  it("should reject negative amounts", () => {
    const invalidData = {
      ...baseIncomeData,
      amount: -100,
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
        ...baseIncomeData,
        status,
      };

      const result = incomeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("should accept income with WHT deduction", () => {
    const data = {
      ...baseIncomeData,
      amount: 10000,
      isWhtDeducted: true,
      whtRate: 3,
      whtType: "SERVICE_3",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept income with source", () => {
    const data = {
      ...baseIncomeData,
      source: "ขายสินค้าให้บริษัท ABC",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept income with different contact ID", () => {
    const data = {
      ...baseIncomeData,
      contactId: "different-contact-456",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should require source", () => {
    const data = {
      companyId: "company-123",
      contactId: "contact-123",
      amount: 1000,
      vatRate: 7,
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
      // source is missing
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should require contactId", () => {
    const data = {
      companyId: "company-123",
      // contactId is missing
      amount: 1000,
      vatRate: 7,
      source: "Test source",
      paymentMethod: "BANK_TRANSFER",
      receiveDate: new Date(),
      status: "PENDING_COPY_SEND",
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should reject WHT deduction without rate", () => {
    const data = {
      ...baseIncomeData,
      isWhtDeducted: true,
      // whtRate is missing
    };

    const result = incomeSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
