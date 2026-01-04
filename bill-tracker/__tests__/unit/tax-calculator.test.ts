import { describe, it, expect } from "vitest";
import {
  calculateVAT,
  calculateWHT,
  calculateTransactionTotals,
  calculateExpenseTotals,
  calculateIncomeTotals,
  reverseVAT,
  formatCurrency,
  calculateVATSummary,
  calculateWHTSummary,
} from "@/lib/utils/tax-calculator";

describe("Tax Calculator", () => {
  describe("calculateVAT", () => {
    it("should calculate VAT correctly at 7%", () => {
      expect(calculateVAT(1000, 7)).toBe(70);
      expect(calculateVAT(5000, 7)).toBe(350);
      expect(calculateVAT(10000, 7)).toBe(700);
    });

    it("should return 0 for 0% VAT rate", () => {
      expect(calculateVAT(1000, 0)).toBe(0);
      expect(calculateVAT(5000, 0)).toBe(0);
    });

    it("should handle decimal amounts", () => {
      expect(calculateVAT(1234.56, 7)).toBe(86.42);
    });
  });

  describe("calculateWHT", () => {
    it("should calculate WHT correctly at various rates", () => {
      // 1% (ค่าขนส่ง)
      expect(calculateWHT(1000, 1)).toBe(10);
      
      // 2% (ค่าโฆษณา)
      expect(calculateWHT(1000, 2)).toBe(20);
      
      // 3% (ค่าบริการ)
      expect(calculateWHT(1000, 3)).toBe(30);
      expect(calculateWHT(5000, 3)).toBe(150);
      
      // 5% (ค่าเช่า, วิชาชีพ)
      expect(calculateWHT(1000, 5)).toBe(50);
    });

    it("should return 0 for 0% WHT rate", () => {
      expect(calculateWHT(1000, 0)).toBe(0);
    });
  });

  describe("calculateTransactionTotals (unified)", () => {
    it("should calculate transaction totals with VAT only", () => {
      const result = calculateTransactionTotals(1000, 7, 0);
      expect(result.baseAmount).toBe(1000);
      expect(result.vatAmount).toBe(70);
      expect(result.whtAmount).toBe(0);
      expect(result.totalWithVat).toBe(1070);
      expect(result.netAmount).toBe(1070);
    });

    it("should calculate transaction totals with VAT and WHT", () => {
      const result = calculateTransactionTotals(1000, 7, 3);
      expect(result.baseAmount).toBe(1000);
      expect(result.vatAmount).toBe(70);
      expect(result.whtAmount).toBe(30);
      expect(result.totalWithVat).toBe(1070);
      expect(result.netAmount).toBe(1040); // 1000 + 70 - 30
    });
  });

  describe("calculateExpenseTotals (backward compat)", () => {
    it("should calculate expense totals with VAT only", () => {
      const result = calculateExpenseTotals(1000, 7, 0);
      expect(result.baseAmount).toBe(1000);
      expect(result.vatAmount).toBe(70);
      expect(result.whtAmount).toBe(0);
      expect(result.totalWithVat).toBe(1070);
      expect(result.netAmount).toBe(1070);
    });

    it("should calculate expense totals with VAT and WHT", () => {
      const result = calculateExpenseTotals(1000, 7, 3);
      expect(result.baseAmount).toBe(1000);
      expect(result.vatAmount).toBe(70);
      expect(result.whtAmount).toBe(30);
      expect(result.totalWithVat).toBe(1070);
      expect(result.netAmount).toBe(1040); // 1000 + 70 - 30
    });

    it("should handle no VAT case", () => {
      const result = calculateExpenseTotals(1000, 0, 3);
      expect(result.baseAmount).toBe(1000);
      expect(result.vatAmount).toBe(0);
      expect(result.whtAmount).toBe(30);
      expect(result.totalWithVat).toBe(1000);
      expect(result.netAmount).toBe(970);
    });

    it("should handle real-world scenario: จ้างฟรีแลนซ์", () => {
      // จ้างฟรีแลนซ์ 5,000 บาท หัก 3%
      const result = calculateExpenseTotals(5000, 0, 3);
      expect(result.baseAmount).toBe(5000);
      expect(result.whtAmount).toBe(150);
      expect(result.netAmount).toBe(4850);
    });

    it("should handle real-world scenario: ซื้อของมีใบกำกับภาษี", () => {
      // ซื้อหมึก 10,000 + VAT 7%
      const result = calculateExpenseTotals(10000, 7, 0);
      expect(result.vatAmount).toBe(700);
      expect(result.netAmount).toBe(10700);
    });
  });

  describe("calculateIncomeTotals", () => {
    it("should calculate income totals when customer deducts WHT", () => {
      // ขายของ 10,000 + VAT 7%, ลูกค้าหัก 3%
      const result = calculateIncomeTotals(10000, 7, 3);
      expect(result.baseAmount).toBe(10000);
      expect(result.vatAmount).toBe(700);
      expect(result.whtAmount).toBe(300);
      expect(result.totalWithVat).toBe(10700);
      expect(result.netAmount).toBe(10400); // 10000 + 700 - 300
    });

    it("should calculate income totals without WHT", () => {
      const result = calculateIncomeTotals(10000, 7, 0);
      expect(result.netAmount).toBe(10700);
    });

    it("should calculate income totals without VAT", () => {
      const result = calculateIncomeTotals(10000, 0, 3);
      expect(result.netAmount).toBe(9700);
    });
  });

  describe("reverseVAT", () => {
    it("should reverse calculate base amount from total with VAT", () => {
      expect(reverseVAT(1070, 7)).toBeCloseTo(1000, 1);
      expect(reverseVAT(10700, 7)).toBeCloseTo(10000, 1);
    });
  });

  describe("formatCurrency", () => {
    it("should format currency in Thai Baht", () => {
      const result = formatCurrency(1000);
      expect(result).toContain("1,000");
      expect(result).toContain("฿");
    });

    it("should handle decimal amounts", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("1,234.56");
    });

    it("should handle zero", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
    });

    it("should handle negative amounts", () => {
      const result = formatCurrency(-500);
      expect(result).toContain("-");
      expect(result).toContain("500");
    });
  });

  describe("calculateVATSummary", () => {
    it("should calculate VAT summary correctly", () => {
      const expenses = [
        { vatAmount: 70 },
        { vatAmount: 350 },
        { vatAmount: null },
      ];
      const incomes = [
        { vatAmount: 700 },
        { vatAmount: 140 },
      ];

      const result = calculateVATSummary(expenses, incomes);
      expect(result.inputVAT).toBe(420); // 70 + 350
      expect(result.outputVAT).toBe(840); // 700 + 140
      expect(result.netVAT).toBe(420); // 840 - 420 (ต้องชำระ)
    });

    it("should handle case where refund is due", () => {
      const expenses = [{ vatAmount: 1000 }];
      const incomes = [{ vatAmount: 100 }];

      const result = calculateVATSummary(expenses, incomes);
      expect(result.netVAT).toBe(-900); // 100 - 1000 (ขอคืน)
    });
  });

  describe("calculateWHTSummary", () => {
    it("should calculate WHT summary correctly", () => {
      const expenses = [
        { whtAmount: 30 },
        { whtAmount: 150 },
      ];
      const incomes = [
        { whtAmount: 300 },
        { whtAmount: null },
      ];

      const result = calculateWHTSummary(expenses, incomes);
      expect(result.whtPaid).toBe(180); // ที่เราหักเขา (ต้องนำส่ง)
      expect(result.whtReceived).toBe(300); // ที่เขาหักเรา (เครดิตภาษี)
      expect(result.netWHT).toBe(-120); // 180 - 300
    });
  });
});
