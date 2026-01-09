/**
 * Receipt OCR Engine using Gemini Vision
 * Specialized for Thai receipts and tax invoices
 */

import { analyzeImage, generateJSON } from "./gemini";

/**
 * Extracted receipt data structure
 */
export interface ReceiptData {
  // Vendor Information
  vendorName: string | null;
  vendorTaxId: string | null;
  vendorAddress: string | null;
  vendorPhone: string | null;

  // Financial Data
  amount: number | null; // Amount before VAT
  vatRate: number | null; // 0 or 7
  vatAmount: number | null;
  totalAmount: number | null; // Amount + VAT

  // Document Details
  invoiceNumber: string | null;
  date: string | null; // ISO date string or null
  paymentMethod: string | null; // CASH, BANK_TRANSFER, CREDIT_CARD, PROMPTPAY, etc.

  // Additional Info
  items: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  
  // Confidence and validation
  confidence: {
    overall: number; // 0-100
    amount: number;
    vendor: number;
    date: number;
  };
  
  // Raw text (for debugging)
  rawText?: string;
}

/**
 * Build OCR prompt for Thai receipts
 */
function buildReceiptPrompt(): string {
  return `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านและวิเคราะห์ใบเสร็จรับเงิน ใบกำกับภาษี สลิปโอนเงิน และเอกสารทางการเงินภาษาไทย

โปรดวิเคราะห์ภาพที่ให้มาและดึงข้อมูลต่อไปนี้:

**การระบุ VENDOR ขึ้นอยู่กับประเภทเอกสาร:**

1. **ใบเสร็จ/ใบกำกับภาษี (Invoice/Receipt):**
   - VENDOR = ผู้ออกใบเสร็จ (ชื่อบริษัท/ร้านค้าที่อยู่ด้านบนสุดของเอกสาร)
   - ห้ามใช้ข้อมูลจาก "Bill to" หรือ "ลูกค้า"

2. **สลิปโอนเงิน (Bank Transfer Slip):**
   - VENDOR = **ผู้รับเงิน** (ข้อมูลในช่อง "ไปยัง" หรือ "To" หรือ "ผู้รับ")
   - ห้ามใช้ข้อมูลจาก "จาก" หรือ "From" (นั่นคือผู้จ่าย ไม่ใช่ vendor)
   - ห้ามใช้ชื่อธนาคาร (เช่น SCB, KBank) เป็น vendor

**ข้อมูลผู้ขาย/ผู้รับเงิน (VENDOR):**
- ชื่อบุคคล/ร้าน/บริษัท (ดูจากคำอธิบายด้านบน)
- เลขประจำตัวผู้เสียภาษี (13 หลักสำหรับไทย หรือ EIN สำหรับสหรัฐ)
- ที่อยู่ (ถ้ามี)
- เบอร์โทรศัพท์ (ถ้ามี)

**ข้อมูลทางการเงิน:**
- ยอดเงินก่อน VAT (จำนวนเงินไม่รวมภาษี)
- อัตรา VAT (มักเป็น 0% หรือ 7%)
- ยอด VAT (ภาษีมูลค่าเพิ่ม)
- ยอดรวมทั้งหมด (รวม VAT แล้ว)

**รายละเอียดเอกสาร:**
- เลขที่ใบเสร็จ/ใบกำกับภาษี
- วันที่ออกเอกสาร (รูปแบบ YYYY-MM-DD)
- วิธีชำระเงิน (เงินสด, โอนเงิน, บัตรเครดิต, พร้อมเพย์, ฯลฯ)

**รายการสินค้า/บริการ:**
- รายการสินค้า/บริการที่ซื้อ (ชื่อ, จำนวน, ราคา)

**ระดับความมั่นใจ:**
- ประเมินความมั่นใจในข้อมูลที่ดึงมา (0-100%) สำหรับ:
  - ความมั่นใจโดยรวม
  - ยอดเงิน
  - ชื่อผู้ขาย
  - วันที่

**หมายเหตุสำคัญ:**
- ถ้าข้อมูลใดไม่พบหรือไม่ชัดเจน ให้ใช้ null (ห้ามใช้ undefined)
- ยอดเงินให้ระบุเป็นตัวเลขอย่างเดียว ไม่ต้องมีสกุลเงิน
- วันที่ให้แปลงเป็นรูปแบบ YYYY-MM-DD (ปี ค.ศ.)
- ถ้าเป็นวันที่ไทย (พ.ศ.) ให้แปลงเป็น ค.ศ. โดยลบ 543
- เลขผู้เสียภาษีไทยมี 13 หลัก
- สำหรับบริษัทต่างประเทศ อาจใช้ EIN (9 หลัก) หรือ VAT number แทน
- วิธีชำระเงินให้ใช้ภาษาอังกฤษ: CASH, BANK_TRANSFER, CREDIT_CARD, PROMPTPAY, CHEQUE
- ใน items ถ้าไม่รู้ quantity หรือ unitPrice ให้ใส่ null ไม่ใช่ undefined
- **สำหรับสลิปโอนเงิน:** vendor คือผู้รับเงิน (ไปยัง/To) ไม่ใช่ผู้โอน (จาก/From) และไม่ใช่ชื่อธนาคาร

ตอบกลับด้วย JSON เท่านั้น ตามโครงสร้างนี้:

{
  "vendorName": "string or null",
  "vendorTaxId": "string or null",
  "vendorAddress": "string or null",
  "vendorPhone": "string or null",
  "amount": number or null,
  "vatRate": number or null,
  "vatAmount": number or null,
  "totalAmount": number or null,
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "paymentMethod": "CASH | BANK_TRANSFER | CREDIT_CARD | PROMPTPAY | CHEQUE or null",
  "items": [
    {
      "description": "string",
      "quantity": number or undefined,
      "unitPrice": number or undefined,
      "amount": number
    }
  ],
  "confidence": {
    "overall": number (0-100),
    "amount": number (0-100),
    "vendor": number (0-100),
    "date": number (0-100)
  }
}`;
}

/**
 * Analyze receipt image and extract data
 */
export async function analyzeReceipt(
  imageData: string | Buffer,
  mimeType: string = "image/jpeg"
): Promise<ReceiptData | { error: string }> {
  try {
    const prompt = buildReceiptPrompt();

    const response = await analyzeImage(imageData, prompt, {
      mimeType,
      temperature: 0.2, // Low temperature for more consistent extraction
      maxTokens: 2048,
    });

    if (response.error) {
      console.error("Gemini Vision API error:", response.error);
      return { error: response.error };
    }

    // Parse the JSON response
    let jsonText = response.data.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    // Fix invalid JSON: replace undefined with null (AI sometimes returns undefined which is not valid JSON)
    jsonText = jsonText.replace(/:\s*undefined\b/g, ": null");

    try {
      const data = JSON.parse(jsonText) as ReceiptData;

      // Store raw text for debugging
      data.rawText = response.data;

      // Validate and normalize data
      return normalizeReceiptData(data);
    } catch (parseError) {
      console.error("Failed to parse OCR JSON:", parseError);
      console.error("Raw response:", response.data);
      return { error: "Failed to parse AI response" };
    }
  } catch (error) {
    console.error("Receipt OCR error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error during OCR",
    };
  }
}

/**
 * Normalize and validate extracted receipt data
 */
function normalizeReceiptData(data: ReceiptData): ReceiptData {
  // Ensure confidence scores are within 0-100
  if (data.confidence) {
    data.confidence.overall = Math.max(0, Math.min(100, data.confidence.overall || 0));
    data.confidence.amount = Math.max(0, Math.min(100, data.confidence.amount || 0));
    data.confidence.vendor = Math.max(0, Math.min(100, data.confidence.vendor || 0));
    data.confidence.date = Math.max(0, Math.min(100, data.confidence.date || 0));
  } else {
    data.confidence = {
      overall: 50,
      amount: 50,
      vendor: 50,
      date: 50,
    };
  }

  // Validate and clean tax ID (13 digits for Thai tax ID)
  if (data.vendorTaxId) {
    const cleanTaxId = data.vendorTaxId.replace(/[^0-9]/g, "");
    if (cleanTaxId.length === 13) {
      data.vendorTaxId = cleanTaxId;
    } else if (cleanTaxId.length > 0) {
      // Keep it but mark as potentially invalid
      data.vendorTaxId = cleanTaxId;
    } else {
      data.vendorTaxId = null;
    }
  }

  // Validate date format (YYYY-MM-DD)
  if (data.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      // Try to parse and reformat
      try {
        const parsed = new Date(data.date);
        if (!isNaN(parsed.getTime())) {
          data.date = parsed.toISOString().split("T")[0];
        } else {
          data.date = null;
        }
      } catch {
        data.date = null;
      }
    }
  }

  // Ensure VAT rate is 0 or 7
  if (data.vatRate !== null && data.vatRate !== undefined) {
    if (data.vatRate > 0 && data.vatRate < 1) {
      // Convert decimal to percentage (e.g., 0.07 -> 7)
      data.vatRate = Math.round(data.vatRate * 100);
    }
    if (data.vatRate !== 0 && data.vatRate !== 7) {
      // Round to nearest valid rate
      data.vatRate = data.vatRate > 3.5 ? 7 : 0;
    }
  }

  // Calculate missing values if possible
  if (data.amount !== null && data.vatRate !== null && data.vatAmount === null) {
    data.vatAmount = Math.round((data.amount * data.vatRate) / 100 * 100) / 100;
  }

  if (data.amount !== null && data.vatAmount !== null && data.totalAmount === null) {
    data.totalAmount = data.amount + data.vatAmount;
  }

  // Ensure items is an array
  if (!Array.isArray(data.items)) {
    data.items = [];
  }

  // Normalize payment method
  if (data.paymentMethod) {
    const method = data.paymentMethod.toUpperCase();
    const validMethods = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "PROMPTPAY", "CHEQUE"];
    if (!validMethods.includes(method)) {
      // Try to map common Thai terms
      const methodMap: Record<string, string> = {
        "เงินสด": "CASH",
        "สด": "CASH",
        "โอน": "BANK_TRANSFER",
        "โอนเงิน": "BANK_TRANSFER",
        "บัตรเครดิต": "CREDIT_CARD",
        "บัตร": "CREDIT_CARD",
        "พร้อมเพย์": "PROMPTPAY",
        "เช็ค": "CHEQUE",
      };
      data.paymentMethod = methodMap[data.paymentMethod] || null;
    } else {
      data.paymentMethod = method as any;
    }
  }

  return data;
}

/**
 * Quick validation check for receipt data completeness
 */
export function validateReceiptData(data: ReceiptData): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Critical fields
  if (!data.amount) missing.push("จำนวนเงินก่อน VAT");
  if (!data.vendorName) missing.push("ชื่อผู้ขาย");
  if (!data.date) missing.push("วันที่");

  // Optional but important fields
  if (!data.invoiceNumber) warnings.push("ไม่มีเลขที่ใบเสร็จ");
  if (!data.vendorTaxId) warnings.push("ไม่มีเลขผู้เสียภาษี");
  if (!data.paymentMethod) warnings.push("ไม่ระบุวิธีชำระเงิน");

  // Confidence warnings
  if (data.confidence.overall < 60) {
    warnings.push("ความมั่นใจในการดึงข้อมูลต่ำ (< 60%)");
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    warnings,
  };
}

/**
 * Format receipt data for display
 */
export function formatReceiptData(data: ReceiptData): string {
  const lines: string[] = [];

  lines.push("📄 ข้อมูลที่ดึงจากใบเสร็จ");
  lines.push("");

  if (data.vendorName) {
    lines.push(`🏪 ร้าน: ${data.vendorName}`);
  }

  if (data.vendorTaxId) {
    lines.push(`🆔 เลขผู้เสียภาษี: ${data.vendorTaxId}`);
  }

  if (data.date) {
    lines.push(`📅 วันที่: ${new Date(data.date).toLocaleDateString("th-TH")}`);
  }

  if (data.invoiceNumber) {
    lines.push(`📋 เลขที่: ${data.invoiceNumber}`);
  }

  lines.push("");

  if (data.amount !== null) {
    lines.push(`💰 ยอดเงิน: ฿${data.amount.toLocaleString("th-TH")}`);
  }

  if (data.vatAmount !== null && data.vatAmount > 0) {
    lines.push(`📊 VAT ${data.vatRate}%: ฿${data.vatAmount.toLocaleString("th-TH")}`);
  }

  if (data.totalAmount !== null) {
    lines.push(`✅ รวมทั้งหมด: ฿${data.totalAmount.toLocaleString("th-TH")}`);
  }

  if (data.paymentMethod) {
    const methodNames: Record<string, string> = {
      CASH: "เงินสด",
      BANK_TRANSFER: "โอนเงิน",
      CREDIT_CARD: "บัตรเครดิต",
      PROMPTPAY: "พร้อมเพย์",
      CHEQUE: "เช็ค",
    };
    lines.push(`💳 วิธีชำระ: ${methodNames[data.paymentMethod] || data.paymentMethod}`);
  }

  lines.push("");
  lines.push(`🎯 ความมั่นใจ: ${data.confidence.overall}%`);

  return lines.join("\n");
}
