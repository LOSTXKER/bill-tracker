import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractRowsFromPdf } from "@/lib/reconcile/pdf-extract";
import { extractText } from "unpdf";
import { generateText, analyzeImage } from "@/lib/ai/gemini";

vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

vi.mock("@/lib/ai/gemini", () => ({
  generateText: vi.fn(),
  analyzeImage: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

/** A valid PP30 text line: row-number date [internal-ref] invoice-date vendor amounts */
const STANDARD_LINE =
  "1 01/01/2025 15/01/2025 TEST VENDOR CO LTD  1,000.00   70.00  1,070.00";

/** Same line using a Buddhist Era year (2567 = 2024 CE). */
const BUDDHIST_YEAR_LINE =
  "1 01/01/2567 15/01/2567 TEST VENDOR CO LTD  1,000.00   70.00  1,070.00";

/** PP36 format: header keyword + single data row. */
const PP36_TEXT = [
  "สกุลเงิน Ex Rate",
  "1 01/01/2025 บริษัท ทดสอบ จำกัด THB 1,000.00 - 1,000.00 70.00",
].join("\n");

function mockExtractText(text: string) {
  vi.mocked(extractText).mockResolvedValue({ text } as any);
}

describe("extractRowsFromPdf", () => {
  const fakeBuffer = Buffer.from("fake-pdf");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Direct text parsing – PP30 standard format
  // -------------------------------------------------------------------------
  describe("direct text parsing (standard format)", () => {
    it("parses a valid PP30 line and returns a row", async () => {
      mockExtractText(STANDARD_LINE);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBe("2025-01-01");
      expect(rows[0].baseAmount).toBe(1000);
      expect(rows[0].vatAmount).toBe(70);
      expect(rows[0].totalAmount).toBe(1070);
      expect(rows[0].vendorName).toBeTruthy();
    });

    it("skips 'รวม' / 'total' summary lines", async () => {
      const text = [
        STANDARD_LINE,
        "รวมทั้งสิ้น  10,000.00  700.00  10,700.00",
      ].join("\n");
      mockExtractText(text);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows).toHaveLength(1);
    });

    it("parses multiple rows from multi-line text", async () => {
      const line2 = "2 15/06/2025 20/06/2025 ANOTHER VENDOR LTD  5,000.00   350.00  5,350.00";
      mockExtractText([STANDARD_LINE, line2].join("\n"));

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Date conversion: Buddhist Era → CE
  // -------------------------------------------------------------------------
  describe("Buddhist Era date conversion", () => {
    it("converts พ.ศ. year (> 2400) to CE by subtracting 543", async () => {
      mockExtractText(BUDDHIST_YEAR_LINE);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows[0].date).toBe("2024-01-01"); // 2567 - 543 = 2024
    });

    it("keeps CE year unchanged (< 2400)", async () => {
      mockExtractText(STANDARD_LINE);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows[0].date).toBe("2025-01-01");
    });
  });

  // -------------------------------------------------------------------------
  // PP36 format detection and parsing
  // -------------------------------------------------------------------------
  describe("PP36 format", () => {
    it("detects PP36 format from สกุลเงิน/Ex Rate header", async () => {
      mockExtractText(PP36_TEXT);

      const rows = await extractRowsFromPdf(fakeBuffer);

      // PP36 parsed: base + vat returned
      expect(rows).toHaveLength(1);
      expect(rows[0].baseAmount).toBe(1000);
      expect(rows[0].vatAmount).toBe(70);
      expect(rows[0].totalAmount).toBe(1070);
    });
  });

  // -------------------------------------------------------------------------
  // Money parsing edge cases
  // -------------------------------------------------------------------------
  describe("money parsing", () => {
    it("handles comma-formatted numbers like 1,234.56", async () => {
      const line = "1 01/01/2025 15/01/2025 VENDOR  1,234.56  86.42  1,320.98";
      mockExtractText(line);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows[0].baseAmount).toBeCloseTo(1234.56);
      expect(rows[0].vatAmount).toBeCloseTo(86.42);
    });
  });

  // -------------------------------------------------------------------------
  // Fallback to AI when text extraction fails or is too short
  // -------------------------------------------------------------------------
  describe("AI fallback", () => {
    it("calls generateText AI when extracted text is too short (<= 50 chars)", async () => {
      mockExtractText("short");
      vi.mocked(generateText).mockResolvedValue({ data: "[]", error: null } as any);
      vi.mocked(analyzeImage).mockResolvedValue({ data: "[]", error: null } as any);

      await extractRowsFromPdf(fakeBuffer);

      // Text is too short – must try AI (vision path since text AI returns empty)
      expect(generateText).not.toHaveBeenCalled();
      expect(analyzeImage).toHaveBeenCalledOnce();
    });

    it("uses text AI when direct parse returns no rows", async () => {
      const unparsableText = "A".repeat(100); // long but unparsable
      mockExtractText(unparsableText);

      const aiJson = JSON.stringify([
        { date: "2025-03-01", invoiceNumber: "INV-001", vendorName: "AI Vendor", taxId: "", baseAmount: 500, vatAmount: 35, totalAmount: 535 },
      ]);
      vi.mocked(generateText).mockResolvedValue({ data: aiJson, error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(generateText).toHaveBeenCalledOnce();
      expect(rows).toHaveLength(1);
      expect(rows[0].vendorName).toBe("AI Vendor");
      expect(rows[0].baseAmount).toBe(500);
    });

    it("falls back to vision AI when text AI returns empty array", async () => {
      const unparsableText = "B".repeat(100);
      mockExtractText(unparsableText);
      vi.mocked(generateText).mockResolvedValue({ data: "[]", error: null } as any);

      const visionJson = JSON.stringify([
        { date: "2025-03-15", invoiceNumber: "", vendorName: "Vision Vendor", taxId: "0123456789012", baseAmount: 2000, vatAmount: 140, totalAmount: 2140 },
      ]);
      vi.mocked(analyzeImage).mockResolvedValue({ data: visionJson, error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(analyzeImage).toHaveBeenCalledOnce();
      expect(rows[0].vendorName).toBe("Vision Vendor");
    });

    it("returns empty array when all strategies fail", async () => {
      mockExtractText("C".repeat(100));
      vi.mocked(generateText).mockResolvedValue({ data: "[]", error: null } as any);
      vi.mocked(analyzeImage).mockResolvedValue({ data: "[]", error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows).toHaveLength(0);
    });

    it("returns empty array when unpdf throws", async () => {
      vi.mocked(extractText).mockRejectedValue(new Error("pdf corrupt"));
      vi.mocked(analyzeImage).mockResolvedValue({ data: "[]", error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // AI JSON parser robustness
  // -------------------------------------------------------------------------
  describe("AI JSON parsing", () => {
    it("parses snake_case field names from AI response", async () => {
      mockExtractText("D".repeat(100));
      const aiJson = JSON.stringify([
        { date: "2025-01-01", invoice_number: "INV-X", vendor_name: "Snake Corp", tax_id: "", base_amount: 100, vat_amount: 7, total_amount: 107 },
      ]);
      vi.mocked(generateText).mockResolvedValue({ data: aiJson, error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows[0].invoiceNumber).toBe("INV-X");
      expect(rows[0].vendorName).toBe("Snake Corp");
    });

    it("handles markdown-fenced JSON from AI", async () => {
      mockExtractText("E".repeat(100));
      const aiJson = '```json\n[{"date":"2025-06-01","invoiceNumber":"","vendorName":"Fenced","taxId":"","baseAmount":300,"vatAmount":21,"totalAmount":321}]\n```';
      vi.mocked(generateText).mockResolvedValue({ data: aiJson, error: null } as any);

      const rows = await extractRowsFromPdf(fakeBuffer);

      expect(rows[0].vendorName).toBe("Fenced");
    });
  });
});
