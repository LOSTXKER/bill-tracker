/**
 * Document Classification Service
 * AI and keyword-based classification of financial documents
 */

import { analyzeImage } from "./gemini";
import { safeParseAIJsonResponse } from "./utils/parse-ai-json";
import type { ReceiptData } from "./receipt-ocr";

// =============================================================================
// Types
// =============================================================================

export type DocumentCategory = "invoice" | "slip" | "whtCert" | "unknown";

export interface ClassificationResult {
  type: DocumentCategory;
  confidence: number;
  reason: string;
}

// =============================================================================
// AI-Based Classification
// =============================================================================

/**
 * AI-based document classification using Gemini Vision
 * Classifies Thai financial documents into: invoice, slip, whtCert, unknown
 */
export async function classifyDocumentWithAI(imageUrl: string): Promise<ClassificationResult> {
  try {
    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญในการจำแนกประเภทเอกสารทางการเงินไทย

ดูจากภาพที่ให้มา จำแนกว่าเป็นเอกสารประเภทใด:

1. **invoice** - ใบกำกับภาษี, ใบเสร็จรับเงิน, Tax Invoice, Receipt
   - มักมี: ชื่อบริษัท, เลขผู้เสียภาษี 13 หลัก, รายการสินค้า/บริการ, ยอดเงิน, VAT

2. **slip** - สลิปโอนเงิน, Payment Slip, Bank Transfer Slip
   - มักมี: QR Code, เลขบัญชี, ชื่อธนาคาร, วันเวลาที่โอน, จำนวนเงินที่โอน

3. **whtCert** - ใบหัก ณ ที่จ่าย (50 ทวิ), Withholding Tax Certificate
   - มักมี: คำว่า "50 ทวิ", "ภ.ง.ด.", หักภาษี ณ ที่จ่าย, อัตราภาษี 1-5%

4. **unknown** - ไม่ใช่เอกสารทางการเงิน หรือไม่สามารถระบุได้

ตอบเป็น JSON เท่านั้น:
{
  "type": "invoice" | "slip" | "whtCert" | "unknown",
  "confidence": 0-100,
  "reason": "เหตุผลสั้นๆ ที่จำแนกเป็นประเภทนี้"
}`;

    const response = await analyzeImage(imageUrl, prompt, {
      temperature: 0.2,
      maxTokens: 256,
    });

    if (response.error) {
      console.error("AI classification error:", response.error);
      return { type: "unknown", confidence: 0, reason: "AI classification failed" };
    }

    // Parse response using utility
    const result = safeParseAIJsonResponse<{ type: string; confidence: number; reason: string }>(
      response.data,
      (error, rawText) => console.error("Failed to parse AI classification response:", rawText)
    );

    if (!result) {
      return { type: "unknown", confidence: 0, reason: "Failed to parse response" };
    }

    const validTypes: DocumentCategory[] = ["invoice", "slip", "whtCert", "unknown"];
    return {
      type: validTypes.includes(result.type as DocumentCategory) ? (result.type as DocumentCategory) : "unknown",
      confidence: Math.max(0, Math.min(100, result.confidence || 50)),
      reason: result.reason || "",
    };
  } catch (error) {
    console.error("Document classification error:", error);
    return { type: "unknown", confidence: 0, reason: "Classification error" };
  }
}

// =============================================================================
// Keyword-Based Classification (Fallback)
// =============================================================================

/**
 * Classify document type based on OCR content keywords
 * Used as fallback when AI classification confidence is low
 */
export function classifyDocumentByKeywords(data: ReceiptData): {
  type: DocumentCategory;
  confidence: number;
} {
  // Keywords for each document type
  const invoiceKeywords = [
    "ใบกำกับภาษี",
    "tax invoice",
    "ใบเสร็จรับเงิน",
    "receipt",
    "ใบแจ้งหนี้",
    "invoice",
    "เลขผู้เสียภาษี",
    "tax id",
    "vat",
    "ภาษีมูลค่าเพิ่ม",
  ];

  const slipKeywords = [
    "สลิป",
    "slip",
    "โอนเงิน",
    "transfer",
    "promptpay",
    "พร้อมเพย์",
    "ธนาคาร",
    "bank",
    "บัญชี",
    "account",
    "qr code",
    "จำนวนเงินที่โอน",
  ];

  const whtKeywords = [
    "50 ทวิ",
    "ใบหัก ณ ที่จ่าย",
    "withholding tax",
    "ภ.ง.ด.",
    "หักภาษี",
    "ณ ที่จ่าย",
  ];

  // Create searchable text from all fields
  const searchText = [
    data.vendorName || "",
    data.invoiceNumber || "",
    String(data.amount || ""),
  ]
    .join(" ")
    .toLowerCase();

  // Score each type
  let invoiceScore = 0;
  let slipScore = 0;
  let whtScore = 0;

  for (const kw of invoiceKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      invoiceScore += 10;
    }
  }

  for (const kw of slipKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      slipScore += 10;
    }
  }

  for (const kw of whtKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      whtScore += 15; // WHT is more specific
    }
  }

  // Additional signals
  if (data.vendorTaxId) {
    invoiceScore += 20; // Tax ID strongly suggests invoice
  }
  if (data.vatRate || data.vatAmount) {
    invoiceScore += 15;
  }

  // Determine winner
  const maxScore = Math.max(invoiceScore, slipScore, whtScore);

  if (maxScore === 0) {
    return { type: "unknown", confidence: 30 };
  }

  if (whtScore === maxScore && whtScore >= 15) {
    return { type: "whtCert", confidence: Math.min(95, 50 + whtScore) };
  }

  if (slipScore === maxScore && slipScore > invoiceScore) {
    return { type: "slip", confidence: Math.min(95, 50 + slipScore) };
  }

  if (invoiceScore >= 20) {
    return { type: "invoice", confidence: Math.min(95, 50 + invoiceScore) };
  }

  // Default to invoice if we have amount/vendor info
  if (data.amount || data.vendorName) {
    return { type: "invoice", confidence: 60 };
  }

  return { type: "unknown", confidence: 40 };
}
