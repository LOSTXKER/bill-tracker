import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseExcelFile, buildContactPreview, type ParsedContact } from "@/lib/import/contacts-import";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";

vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    contact: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/audit/logger", () => ({ logCreate: vi.fn() }));

const mockSheet = {};
const mockWorkbook = { SheetNames: ["Sheet1"], Sheets: { Sheet1: mockSheet } };

function makeContact(peakCode: string, name: string): ParsedContact {
  return {
    peakCode,
    name,
    firstName: name,
    lastName: null,
    prefix: null,
    taxId: null,
    branchCode: "00000",
    entityType: "COMPANY" as any,
    contactCategory: "VENDOR" as any,
    businessType: null,
    nationality: "ไทย",
    address: null,
    subDistrict: null,
    district: null,
    province: null,
    postalCode: null,
    country: "Thailand",
    phone: null,
    email: null,
    contactPerson: null,
  };
}

describe("contacts-import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
  });

  describe("parseExcelFile", () => {
    it("parses non-PEAK format and returns contacts", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([["Code", "Name"]]) // no PEAK headers
        .mockReturnValueOnce([
          {
            "รหัสผู้ติดต่อ": "C001",
            "ชื่อ": "บริษัท ทดสอบ",
            "นามสกุล": "",
            "ประเภทผู้ติดต่อ": "ลูกค้า",
            "บุคคล/นิติบุคคล": "นิติบุคคล",
          },
        ]);

      const result = parseExcelFile(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].peakCode).toBe("C001");
      expect(result[0].name).toBe("บริษัท ทดสอบ");
      expect(result[0].contactCategory).toBe("CUSTOMER");
      // "นิติบุคคล" contains "บุคคล" so mapEntityType returns INDIVIDUAL
      expect(result[0].entityType).toBe("INDIVIDUAL");
    });

    it("combines firstName and lastName into name", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([["Code"]])
        .mockReturnValueOnce([
          { "รหัสผู้ติดต่อ": "P001", "ชื่อ": "สมชาย", "นามสกุล": "ใจดี" },
        ]);

      const result = parseExcelFile(new ArrayBuffer(0));

      expect(result[0].name).toBe("สมชาย ใจดี");
      expect(result[0].firstName).toBe("สมชาย");
      expect(result[0].lastName).toBe("ใจดี");
    });

    it("detects and parses PEAK export format", () => {
      const peakRow = Array(30).fill("");
      peakRow[1] = "C002";
      peakRow[2] = "ผู้จำหน่าย";
      peakRow[9] = "บริษัท PEAK";

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValueOnce([
        ["ข้อมูลผู้ติดต่อ", "รหัสผู้ติดต่อ", "ประเภท"],
        peakRow,
      ]);

      const result = parseExcelFile(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].peakCode).toBe("C002");
      expect(result[0].name).toBe("บริษัท PEAK");
      expect(result[0].contactCategory).toBe("VENDOR");
    });

    it("returns empty array when sheet has no data rows", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      expect(parseExcelFile(new ArrayBuffer(0))).toHaveLength(0);
    });

    it("skips rows missing peakCode", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([["Code"]])
        .mockReturnValueOnce([
          { "รหัสผู้ติดต่อ": "", "ชื่อ": "บริษัท ทดสอบ" },
          { "รหัสผู้ติดต่อ": "C001", "ชื่อ": "บริษัท OK" },
        ]);

      const result = parseExcelFile(new ArrayBuffer(0));

      expect(result).toHaveLength(1);
      expect(result[0].peakCode).toBe("C001");
    });

    it("skips rows missing both firstName and lastName", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([["Code"]])
        .mockReturnValueOnce([
          { "รหัสผู้ติดต่อ": "C001", "ชื่อ": "", "นามสกุล": "" },
        ]);

      expect(parseExcelFile(new ArrayBuffer(0))).toHaveLength(0);
    });

    it("maps vendor/customer/other contact categories", () => {
      vi.mocked(XLSX.utils.sheet_to_json)
        .mockReturnValueOnce([["Code"]])
        .mockReturnValueOnce([
          { "รหัสผู้ติดต่อ": "C001", "ชื่อ": "A", "ประเภทผู้ติดต่อ": "ลูกค้า" },
          { "รหัสผู้ติดต่อ": "C002", "ชื่อ": "B", "ประเภทผู้ติดต่อ": "vendor" },
          { "รหัสผู้ติดต่อ": "C003", "ชื่อ": "C", "ประเภทผู้ติดต่อ": "ลูกค้า ผู้จำหน่าย" },
          { "รหัสผู้ติดต่อ": "C004", "ชื่อ": "D", "ประเภทผู้ติดต่อ": "other" },
        ]);

      const result = parseExcelFile(new ArrayBuffer(0));

      expect(result[0].contactCategory).toBe("CUSTOMER");
      expect(result[1].contactCategory).toBe("VENDOR");
      expect(result[2].contactCategory).toBe("BOTH");
      expect(result[3].contactCategory).toBe("OTHER");
    });
  });

  describe("buildContactPreview", () => {
    it("categorises contacts as new, update, or skip", async () => {
      vi.mocked(prisma.contact.findMany).mockResolvedValue([
        { peakCode: "EXIST", name: "Old Name", source: "PEAK" as any },
        { peakCode: "SAME", name: "Same Name", source: "PEAK" as any },
      ]);

      const contacts = [
        makeContact("NEW001", "Brand New"),
        makeContact("EXIST", "New Name"),
        makeContact("SAME", "Same Name"),
      ];

      const result = await buildContactPreview(contacts, "company-1");

      expect(result.contacts).toHaveLength(3);
      expect(result.contacts.find((c) => c.peakCode === "NEW001")?.status).toBe("new");
      expect(result.contacts.find((c) => c.peakCode === "EXIST")?.status).toBe("update");
      expect(result.contacts.find((c) => c.peakCode === "SAME")?.status).toBe("skip");
    });

    it("returns correct stats totals", async () => {
      vi.mocked(prisma.contact.findMany).mockResolvedValue([
        { peakCode: "E1", name: "Changed", source: "PEAK" as any },
        { peakCode: "E2", name: "Unchanged", source: "PEAK" as any },
      ]);

      const contacts = [
        makeContact("N1", "New"),
        makeContact("E1", "Changed New"),
        makeContact("E2", "Unchanged"),
      ];

      const result = await buildContactPreview(contacts, "company-1");

      expect(result.stats.total).toBe(3);
      expect(result.stats.new).toBe(1);
      expect(result.stats.update).toBe(1);
      expect(result.stats.skip).toBe(1);
    });

    it("returns all new when no existing contacts match", async () => {
      vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

      const contacts = [makeContact("C1", "Alpha"), makeContact("C2", "Beta")];
      const result = await buildContactPreview(contacts, "company-1");

      expect(result.stats.new).toBe(2);
      expect(result.stats.update).toBe(0);
      expect(result.stats.skip).toBe(0);
    });
  });
});
