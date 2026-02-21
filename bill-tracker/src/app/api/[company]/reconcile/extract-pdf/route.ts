import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeImage } from "@/lib/ai/gemini";

export interface ExtractedRow {
  date: string;
  invoiceNumber: string;
  vendorName: string;
  taxId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

const MAX_PDF_SIZE_MB = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ company: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ PDF" }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_PDF_SIZE_MB} MB)` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const prompt = buildExtractionPrompt();

    const response = await analyzeImage(base64, prompt, {
      mimeType: "application/pdf",
      temperature: 0.1,
      maxTokens: 4096,
    });

    if (response.error || !response.data) {
      return NextResponse.json(
        { error: "AI ไม่สามารถอ่าน PDF ได้: " + (response.error ?? "ไม่มีข้อมูล") },
        { status: 422 }
      );
    }

    const rows = parseAIResponse(response.data);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบตารางข้อมูลภาษีใน PDF นี้ กรุณาตรวจสอบไฟล์" },
        { status: 422 }
      );
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("PDF extraction error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผล PDF" },
      { status: 500 }
    );
  }
}

function buildExtractionPrompt(): string {
  return `คุณเป็นผู้เชี่ยวชาญอ่านรายงานภาษีไทย กรุณาอ่านตารางใน PDF นี้และ extract ข้อมูลทุกแถว

รายงานนี้คือรายงานภาษีซื้อหรือภาษีขาย (VAT report) มีคอลัมน์เช่น:
- วัน/เดือน/ปี (วันที่)
- เลขที่ใบกำกับภาษี
- ชื่อผู้ขาย / ชื่อผู้ให้บริการ / ชื่อลูกค้า / ที่
- เลขประจำตัวผู้เสียภาษีอากร
- มูลค่าสินค้าหรือบริการ (ยอดก่อน VAT)
- จำนวนเงินภาษีมูลค่าเพิ่ม (VAT)
- รวมเงิน / รวมราย

กฎสำคัญ:
- วันที่: แปลงเป็น YYYY-MM-DD เสมอ, ถ้าปีเป็นพุทธศักราช (เช่น 2569) ให้ลบ 543 ก่อน
- ยอดเงิน: เอาเฉพาะตัวเลข ไม่ต้องมีจุลภาค
- ถ้าไม่มีคอลัมน์ใด ให้ใส่ค่าว่างหรือ 0
- ไม่ต้องใส่แถวหัวตาราง แถวรวม (รวม/Total) หรือแถวว่าง

ส่งคืนเฉพาะ JSON array ดังนี้ ไม่ต้องอธิบาย:
[
  {
    "date": "YYYY-MM-DD",
    "invoiceNumber": "เลขที่ใบกำกับ",
    "vendorName": "ชื่อบริษัทหรือบุคคล",
    "taxId": "เลขประจำตัวผู้เสียภาษี 13 หลัก หรือว่าง",
    "baseAmount": 0.00,
    "vatAmount": 0.00,
    "totalAmount": 0.00
  }
]`;
}

function parseAIResponse(text: string): ExtractedRow[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: Record<string, unknown>) => ({
        date: String(item.date ?? "").trim(),
        invoiceNumber: String(item.invoiceNumber ?? "").trim(),
        vendorName: String(item.vendorName ?? "").trim(),
        taxId: String(item.taxId ?? "").replace(/\D/g, ""),
        baseAmount: parseFloat(String(item.baseAmount ?? "0")) || 0,
        vatAmount: parseFloat(String(item.vatAmount ?? "0")) || 0,
        totalAmount: parseFloat(String(item.totalAmount ?? "0")) || 0,
      }))
      .filter((r) => r.vendorName || r.baseAmount > 0);
  } catch {
    return [];
  }
}
