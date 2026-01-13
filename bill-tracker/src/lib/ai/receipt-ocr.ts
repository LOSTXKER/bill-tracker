/**
 * Receipt OCR Engine using Gemini Vision
 * Specialized for Thai receipts and tax invoices
 */

import { analyzeImage, generateJSON } from "./gemini";

/**
 * Document type enum
 */
export type DocumentType = 
  | "TAX_INVOICE"      // ใบกำกับภาษี
  | "RECEIPT"          // ใบเสร็จรับเงิน
  | "INVOICE"          // ใบแจ้งหนี้
  | "BANK_SLIP"        // สลิปโอนเงิน
  | "WHT_CERT"         // ใบหัก ณ ที่จ่าย (50 ทวิ)
  | "QUOTATION"        // ใบเสนอราคา
  | "PURCHASE_ORDER"   // ใบสั่งซื้อ
  | "DELIVERY_NOTE"    // ใบส่งของ
  | "OTHER";           // อื่นๆ

/**
 * Extracted receipt data structure
 */
export interface ReceiptData {
  // Document Classification
  documentType: DocumentType | null;
  documentTypeConfidence: number; // 0-100

  // Vendor Information
  vendorName: string | null;
  vendorTaxId: string | null;
  vendorBranchNumber: string | null; // สาขาที่ (00000 = สำนักงานใหญ่)
  vendorAddress: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;

  // Financial Data
  amount: number | null; // Amount before VAT
  vatRate: number | null; // 0 or 7
  vatAmount: number | null;
  totalAmount: number | null; // Amount + VAT

  // Withholding Tax (หัก ณ ที่จ่าย)
  whtRate: number | null; // 1, 2, 3, 5, 10, 15 etc.
  whtAmount: number | null;
  whtType: string | null; // ประเภทเงินได้ เช่น "ค่าบริการ", "ค่าเช่า"

  // Net amount after WHT
  netAmount: number | null; // totalAmount - whtAmount

  // Document Details
  invoiceNumber: string | null;
  date: string | null; // ISO date string or null
  dueDate: string | null; // วันครบกำหนดชำระ
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
    wht: number; // confidence for WHT extraction
  };
  
  // Raw text (for debugging)
  rawText?: string;
}

/**
 * Build OCR prompt for Thai receipts
 */
function buildReceiptPrompt(): string {
  return `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านและวิเคราะห์ใบเสร็จรับเงิน ใบกำกับภาษี สลิปโอนเงิน ใบหัก ณ ที่จ่าย และเอกสารทางการเงินภาษาไทย

โปรดวิเคราะห์ภาพที่ให้มาและดึงข้อมูลต่อไปนี้:

**ขั้นตอนที่ 1: ระบุประเภทเอกสาร**
ให้ระบุประเภทเอกสารจากตัวเลือกต่อไปนี้:
- TAX_INVOICE: ใบกำกับภาษี (มีคำว่า "ใบกำกับภาษี" หรือ "Tax Invoice")
- RECEIPT: ใบเสร็จรับเงิน (มีคำว่า "ใบเสร็จ" หรือ "Receipt")
- INVOICE: ใบแจ้งหนี้ (มีคำว่า "ใบแจ้งหนี้" หรือ "Invoice" โดยไม่มี Tax)
- BANK_SLIP: สลิปโอนเงิน (สลิปจากธนาคาร, PromptPay, โอนเงิน)
- WHT_CERT: ใบหัก ณ ที่จ่าย (50 ทวิ, หนังสือรับรองการหักภาษี)
- QUOTATION: ใบเสนอราคา
- PURCHASE_ORDER: ใบสั่งซื้อ
- DELIVERY_NOTE: ใบส่งของ
- OTHER: อื่นๆ

**ขั้นตอนที่ 2: ระบุ VENDOR ตามประเภทเอกสาร**

1. **ใบเสร็จ/ใบกำกับภาษี/ใบแจ้งหนี้:**
   - VENDOR = ผู้ออกเอกสาร (ชื่อบริษัท/ร้านค้าที่อยู่ด้านบนสุด)
   - ห้ามใช้ข้อมูลจาก "Bill to" หรือ "ลูกค้า"

2. **สลิปโอนเงิน (Bank Transfer Slip):**
   - VENDOR = **ผู้รับเงิน** (ข้อมูลในช่อง "ไปยัง" หรือ "To" หรือ "ผู้รับ")
   - ห้ามใช้ข้อมูลจาก "จาก" หรือ "From" (นั่นคือผู้จ่าย ไม่ใช่ vendor)
   - ห้ามใช้ชื่อธนาคาร (เช่น SCB, KBank) เป็น vendor

3. **ใบหัก ณ ที่จ่าย (50 ทวิ):**
   - VENDOR = ผู้ถูกหักภาษี (ผู้มีเงินได้)
   - ไม่ใช่ผู้จ่ายเงิน

**ข้อมูลผู้ขาย/ผู้รับเงิน (VENDOR):**
- ชื่อบุคคล/ร้าน/บริษัท
- เลขประจำตัวผู้เสียภาษี (13 หลักสำหรับไทย)
- **สาขาที่ (Branch Number)**: มักเป็น 5 หลัก เช่น 00000 = สำนักงานใหญ่, 00001 = สาขา 1
- ที่อยู่ (ถ้ามี)
- เบอร์โทรศัพท์ (ถ้ามี)
- อีเมล (ถ้ามี)

**ข้อมูลทางการเงิน:**
- ยอดเงินก่อน VAT (จำนวนเงินไม่รวมภาษี)
- อัตรา VAT (มักเป็น 0% หรือ 7%)
- ยอด VAT (ภาษีมูลค่าเพิ่ม)
- ยอดรวมทั้งหมด (รวม VAT แล้ว)

**ภาษีหัก ณ ที่จ่าย (Withholding Tax - WHT):**
- อัตราหัก ณ ที่จ่าย: มักเป็น 1%, 2%, 3%, 5%, 10%, 15%
  - ค่าขนส่ง/โฆษณา: 1%
  - ค่าจ้างทำของ: 2%, 3%
  - ค่าบริการ/ค่าเช่า: 3%, 5%
  - ค่านายหน้า: 5%
- จำนวนเงินที่หัก
- ประเภทเงินได้ (เช่น "ค่าบริการ", "ค่าเช่า", "ค่าจ้างทำของ", "ค่าขนส่ง")
- ยอดสุทธิหลังหัก (totalAmount - whtAmount)

**รายละเอียดเอกสาร:**
- เลขที่ใบเสร็จ/ใบกำกับภาษี
- วันที่ออกเอกสาร (รูปแบบ YYYY-MM-DD)
- วันครบกำหนดชำระ (ถ้ามี)
- วิธีชำระเงิน (เงินสด, โอนเงิน, บัตรเครดิต, พร้อมเพย์, ฯลฯ)

**รายการสินค้า/บริการ:**
- รายการสินค้า/บริการที่ซื้อ (ชื่อ, จำนวน, ราคา)

**ระดับความมั่นใจ (0-100%):**
- ความมั่นใจโดยรวม
- ยอดเงิน
- ชื่อผู้ขาย
- วันที่
- ภาษีหัก ณ ที่จ่าย

**หมายเหตุสำคัญ:**
- ถ้าข้อมูลใดไม่พบหรือไม่ชัดเจน ให้ใช้ null (ห้ามใช้ undefined)
- ยอดเงินให้ระบุเป็นตัวเลขอย่างเดียว ไม่ต้องมีสกุลเงิน
- วันที่ให้แปลงเป็นรูปแบบ YYYY-MM-DD (ปี ค.ศ.)
- **สำคัญมาก: วันที่ไทย (พ.ศ.)** อ่านตัวเลขปีให้ถูกต้อง เช่น 2567, 2568, 2569 แล้วลบ 543 ให้เป็น ค.ศ.
  - พ.ศ. 2567 = ค.ศ. 2024
  - พ.ศ. 2568 = ค.ศ. 2025
  - พ.ศ. 2569 = ค.ศ. 2026
  - ระวัง: อย่าอ่าน 2569 เป็น 2559 (ตรวจสอบเลข 6 กับ 5 ให้ดี)
- เลขผู้เสียภาษีไทยมี 13 หลัก
- สาขาที่มี 5 หลัก (00000 = สำนักงานใหญ่)
- วิธีชำระเงินให้ใช้ภาษาอังกฤษ: CASH, BANK_TRANSFER, CREDIT_CARD, PROMPTPAY, CHEQUE
- ใน items ถ้าไม่รู้ quantity หรือ unitPrice ให้ใส่ null ไม่ใช่ undefined
- **สำหรับสลิปโอนเงิน:** vendor คือผู้รับเงิน (ไปยัง/To) ไม่ใช่ผู้โอน (จาก/From) และไม่ใช่ชื่อธนาคาร

ตอบกลับด้วย JSON เท่านั้น ตามโครงสร้างนี้:

{
  "documentType": "TAX_INVOICE | RECEIPT | INVOICE | BANK_SLIP | WHT_CERT | QUOTATION | PURCHASE_ORDER | DELIVERY_NOTE | OTHER",
  "documentTypeConfidence": number (0-100),
  "vendorName": "string or null",
  "vendorTaxId": "string or null",
  "vendorBranchNumber": "string or null (e.g. 00000)",
  "vendorAddress": "string or null",
  "vendorPhone": "string or null",
  "vendorEmail": "string or null",
  "amount": number or null,
  "vatRate": number or null,
  "vatAmount": number or null,
  "totalAmount": number or null,
  "whtRate": number or null,
  "whtAmount": number or null,
  "whtType": "string or null (e.g. ค่าบริการ, ค่าเช่า)",
  "netAmount": number or null,
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "paymentMethod": "CASH | BANK_TRANSFER | CREDIT_CARD | PROMPTPAY | CHEQUE or null",
  "items": [
    {
      "description": "string",
      "quantity": number or null,
      "unitPrice": number or null,
      "amount": number
    }
  ],
  "confidence": {
    "overall": number (0-100),
    "amount": number (0-100),
    "vendor": number (0-100),
    "date": number (0-100),
    "wht": number (0-100)
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
    data.confidence.wht = Math.max(0, Math.min(100, data.confidence.wht || 0));
  } else {
    data.confidence = {
      overall: 50,
      amount: 50,
      vendor: 50,
      date: 50,
      wht: 50,
    };
  }

  // Validate document type
  const validDocTypes: DocumentType[] = [
    "TAX_INVOICE", "RECEIPT", "INVOICE", "BANK_SLIP", 
    "WHT_CERT", "QUOTATION", "PURCHASE_ORDER", "DELIVERY_NOTE", "OTHER"
  ];
  if (data.documentType && !validDocTypes.includes(data.documentType)) {
    data.documentType = "OTHER";
  }
  if (!data.documentType) {
    data.documentType = null;
  }
  if (data.documentTypeConfidence === undefined || data.documentTypeConfidence === null) {
    data.documentTypeConfidence = 50;
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

  // Validate branch number (5 digits)
  if (data.vendorBranchNumber) {
    const cleanBranch = data.vendorBranchNumber.replace(/[^0-9]/g, "");
    if (cleanBranch.length <= 5) {
      data.vendorBranchNumber = cleanBranch.padStart(5, "0");
    } else {
      data.vendorBranchNumber = null;
    }
  }

  // Validate date format (YYYY-MM-DD)
  const validateDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0];
        }
        return null;
      } catch {
        return null;
      }
    }
    return dateStr;
  };

  data.date = validateDate(data.date);
  data.dueDate = validateDate(data.dueDate);

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

  // Validate WHT rate (common rates: 1, 2, 3, 5, 10, 15)
  if (data.whtRate !== null && data.whtRate !== undefined) {
    if (data.whtRate > 0 && data.whtRate < 1) {
      // Convert decimal to percentage (e.g., 0.03 -> 3)
      data.whtRate = Math.round(data.whtRate * 100);
    }
    // Valid WHT rates in Thailand
    const validWhtRates = [0, 1, 2, 3, 5, 10, 15];
    if (!validWhtRates.includes(data.whtRate)) {
      // Round to nearest valid rate
      data.whtRate = validWhtRates.reduce((prev, curr) => 
        Math.abs(curr - data.whtRate!) < Math.abs(prev - data.whtRate!) ? curr : prev
      );
    }
  }

  // Calculate missing values if possible
  if (data.amount !== null && data.vatRate !== null && data.vatAmount === null) {
    data.vatAmount = Math.round((data.amount * data.vatRate) / 100 * 100) / 100;
  }

  if (data.amount !== null && data.vatAmount !== null && data.totalAmount === null) {
    data.totalAmount = data.amount + data.vatAmount;
  }

  // Calculate WHT amount if rate is provided but amount is not
  if (data.whtRate !== null && data.whtAmount === null && data.amount !== null) {
    data.whtAmount = Math.round((data.amount * data.whtRate) / 100 * 100) / 100;
  }

  // Calculate net amount (after WHT deduction)
  if (data.totalAmount !== null && data.whtAmount !== null && data.netAmount === null) {
    data.netAmount = data.totalAmount - data.whtAmount;
  } else if (data.totalAmount !== null && data.netAmount === null) {
    data.netAmount = data.totalAmount;
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

  // Normalize email
  if (data.vendorEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.vendorEmail)) {
      data.vendorEmail = null;
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
  if (!data.amount && !data.totalAmount) missing.push("จำนวนเงิน");
  if (!data.vendorName) missing.push("ชื่อผู้ขาย");
  if (!data.date) missing.push("วันที่");

  // Document type warning
  if (!data.documentType) {
    warnings.push("ไม่สามารถระบุประเภทเอกสารได้");
  } else if (data.documentTypeConfidence < 70) {
    warnings.push(`ความมั่นใจในประเภทเอกสารต่ำ (${data.documentTypeConfidence}%)`);
  }

  // Optional but important fields
  if (!data.invoiceNumber) warnings.push("ไม่มีเลขที่ใบเสร็จ");
  if (!data.vendorTaxId) warnings.push("ไม่มีเลขผู้เสียภาษี");
  if (!data.paymentMethod) warnings.push("ไม่ระบุวิธีชำระเงิน");

  // WHT warnings for WHT certificates
  if (data.documentType === "WHT_CERT") {
    if (!data.whtRate) warnings.push("ไม่มีอัตราหัก ณ ที่จ่าย");
    if (!data.whtAmount) warnings.push("ไม่มีจำนวนเงินที่หัก");
  }

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
 * Get Thai name for document type
 */
export function getDocumentTypeName(type: DocumentType | null): string {
  const names: Record<DocumentType, string> = {
    TAX_INVOICE: "ใบกำกับภาษี",
    RECEIPT: "ใบเสร็จรับเงิน",
    INVOICE: "ใบแจ้งหนี้",
    BANK_SLIP: "สลิปโอนเงิน",
    WHT_CERT: "ใบหัก ณ ที่จ่าย",
    QUOTATION: "ใบเสนอราคา",
    PURCHASE_ORDER: "ใบสั่งซื้อ",
    DELIVERY_NOTE: "ใบส่งของ",
    OTHER: "เอกสารอื่นๆ",
  };
  return type ? names[type] : "ไม่ระบุ";
}

/**
 * Format receipt data for display
 */
export function formatReceiptData(data: ReceiptData): string {
  const lines: string[] = [];

  lines.push("📄 ข้อมูลที่ดึงจากเอกสาร");
  lines.push("");

  // Document type
  if (data.documentType) {
    lines.push(`📑 ประเภท: ${getDocumentTypeName(data.documentType)} (${data.documentTypeConfidence}%)`);
  }

  if (data.vendorName) {
    lines.push(`🏪 ร้าน: ${data.vendorName}`);
  }

  if (data.vendorTaxId) {
    const branchText = data.vendorBranchNumber 
      ? ` (สาขา ${data.vendorBranchNumber === "00000" ? "สำนักงานใหญ่" : data.vendorBranchNumber})`
      : "";
    lines.push(`🆔 เลขผู้เสียภาษี: ${data.vendorTaxId}${branchText}`);
  }

  if (data.vendorEmail) {
    lines.push(`📧 อีเมล: ${data.vendorEmail}`);
  }

  if (data.date) {
    lines.push(`📅 วันที่: ${new Date(data.date).toLocaleDateString("th-TH")}`);
  }

  if (data.dueDate) {
    lines.push(`⏰ ครบกำหนด: ${new Date(data.dueDate).toLocaleDateString("th-TH")}`);
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
    lines.push(`✅ รวม VAT: ฿${data.totalAmount.toLocaleString("th-TH")}`);
  }

  // WHT information
  if (data.whtRate !== null && data.whtRate > 0) {
    lines.push("");
    lines.push("📑 หัก ณ ที่จ่าย:");
    if (data.whtType) {
      lines.push(`   ประเภท: ${data.whtType}`);
    }
    lines.push(`   อัตรา: ${data.whtRate}%`);
    if (data.whtAmount !== null) {
      lines.push(`   จำนวน: ฿${data.whtAmount.toLocaleString("th-TH")}`);
    }
    if (data.netAmount !== null) {
      lines.push(`   ยอดสุทธิ: ฿${data.netAmount.toLocaleString("th-TH")}`);
    }
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
