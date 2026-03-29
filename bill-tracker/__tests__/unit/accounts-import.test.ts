import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseAccountsFromExcel,
  previewAccounts,
  type ParsedAccount,
} from "@/lib/import/accounts-import";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";

vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    account: { findMany: vi.fn() },
    company: { update: vi.fn() },
  },
}));

const mockSheet = {};
const mockWorkbook = { SheetNames: ["Sheet1"], Sheets: { Sheet1: mockSheet } };

/** Build a minimal 4-column row array for the accounts sheet parser. */
function makeRow(code: string, nameTh = "บัญชีทดสอบ", nameEn = "Test Account") {
  return ["", code, nameTh, nameEn];
}

/** Return mock sheet data: a header row followed by the given data rows. */
function mockSheet2Json(dataRows: string[][]) {
  return [["", "รหัสบัญชี", "ชื่อบัญชี (ภาษาไทย)", "ชื่อบัญชี (ภาษาอังกฤษ)"], ...dataRows];
}

describe("accounts-import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
  });

  // -------------------------------------------------------------------------
  // mapCodeToAccountClass (tested indirectly via parseAccountsFromExcel)
  // -------------------------------------------------------------------------
  describe("mapCodeToAccountClass (via parseAccountsFromExcel)", () => {
    it.each([
      ["4100", "REVENUE"],
      ["4101", "REVENUE"],
      ["4200", "OTHER_INCOME"],
      ["4299", "OTHER_INCOME"],
      ["5100", "COST_OF_SALES"],
      ["5150", "COST_OF_SALES"],
      ["5200", "EXPENSE"],
      ["5300", "EXPENSE"],
      ["5800", "EXPENSE"],
      ["5400", "OTHER_EXPENSE"],
    ])("code %s maps to AccountClass %s", (code, expectedClass) => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        mockSheet2Json([makeRow(code)]) as any
      );

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe(code);
      expect(result[0].class).toBe(expectedClass);
    });

    it("returns null (filters out) for unknown code prefixes", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        mockSheet2Json([makeRow("9900"), makeRow("1000"), makeRow("3500")]) as any
      );

      expect(parseAccountsFromExcel(new ArrayBuffer(0))).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // parseAccountsFromExcel
  // -------------------------------------------------------------------------
  describe("parseAccountsFromExcel", () => {
    it("parses multiple valid accounts in one sheet", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        mockSheet2Json([
          makeRow("4100", "รายได้จากการขาย", "Sales Revenue"),
          makeRow("5200", "ค่าใช้จ่ายในการขาย", "Selling Expense"),
          makeRow("5400", "ค่าใช้จ่ายอื่น", "Other Expense"),
        ]) as any
      );

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ code: "4100", nameTh: "รายได้จากการขาย", nameEn: "Sales Revenue", class: "REVENUE" });
      expect(result[1]).toEqual({ code: "5200", nameTh: "ค่าใช้จ่ายในการขาย", nameEn: "Selling Expense", class: "EXPENSE" });
      expect(result[2]).toEqual({ code: "5400", nameTh: "ค่าใช้จ่ายอื่น", nameEn: "Other Expense", class: "OTHER_EXPENSE" });
    });

    it("returns empty array when sheet contains no data rows", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([] as any);

      expect(parseAccountsFromExcel(new ArrayBuffer(0))).toHaveLength(0);
    });

    it("skips rows where nameTh is empty", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        mockSheet2Json([
          makeRow("4100", "", "Sales Revenue"), // empty Thai name
          makeRow("5200", "ค่าใช้จ่าย", "Expense"),
        ]) as any
      );

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("5200");
    });

    it("skips rows where code is empty", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        mockSheet2Json([
          makeRow("", "รายได้", "Revenue"),
          makeRow("4100", "รายได้", "Revenue"),
        ]) as any
      );

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
    });

    it("skips rows with fewer than 4 columns", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["", "รหัสบัญชี", "ชื่อ"],
        ["", "4100"],          // only 2 cols
        ["", "5200", "ค่าใช้จ่าย", "Expense"],
      ] as any);

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("5200");
    });

    it("finds header row anywhere in the first 10 rows", () => {
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["บริษัท ทดสอบ"],
        ["รายงานผังบัญชี"],
        ["", "รหัสบัญชี", "ชื่อบัญชี", "Account"],  // header at row index 2
        ["", "4200", "รายได้อื่น", "Other Income"],
      ] as any);

      const result = parseAccountsFromExcel(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].class).toBe("OTHER_INCOME");
    });
  });

  // -------------------------------------------------------------------------
  // previewAccounts
  // -------------------------------------------------------------------------
  describe("previewAccounts", () => {
    const parsed: ParsedAccount[] = [
      { code: "4100", nameTh: "รายได้ใหม่", nameEn: "New Revenue", class: "REVENUE" as any },
      { code: "5200", nameTh: "ค่าใช้จ่ายเปลี่ยน", nameEn: "Changed", class: "EXPENSE" as any },
      { code: "5300", nameTh: "ค่าใช้จ่ายเดิม", nameEn: "Same", class: "EXPENSE" as any },
    ];

    it("categorises accounts as new, update, or skip", async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([
        { code: "5200", name: "ชื่อเก่า", source: "PEAK" as any },
        { code: "5300", name: "ค่าใช้จ่ายเดิม", source: "PEAK" as any },
      ]);

      const result = await previewAccounts("company-1", parsed);

      expect(result.accounts.find((a) => a.code === "4100")?.status).toBe("new");
      expect(result.accounts.find((a) => a.code === "5200")?.status).toBe("update");
      expect(result.accounts.find((a) => a.code === "5300")?.status).toBe("skip");
    });

    it("returns correct stats", async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([
        { code: "5200", name: "ชื่อเก่า", source: "PEAK" as any },
        { code: "5300", name: "ค่าใช้จ่ายเดิม", source: "PEAK" as any },
      ]);

      const result = await previewAccounts("company-1", parsed);

      expect(result.stats).toEqual({ total: 3, new: 1, update: 1, skip: 1 });
    });

    it("marks everything as new when no existing accounts found", async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([]);

      const result = await previewAccounts("company-1", parsed);

      expect(result.stats.new).toBe(3);
      expect(result.stats.update).toBe(0);
      expect(result.stats.skip).toBe(0);
    });
  });
});
