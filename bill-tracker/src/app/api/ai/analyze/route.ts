/**
 * 🧠 AI Analyze API - วิเคราะห์ใบเสร็จด้วย AI
 * 
 * POST /api/ai/analyze
 * - รับรูปภาพ + companyId + transactionType
 * - Return ข้อมูลครบ พร้อม Vendor Memory override
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { analyzeReceipt, ReceiptAnalysisResult } from "@/lib/ai/analyze-receipt";
import { findVendorMemory, VendorMemory } from "@/lib/ai/vendor-memory";
import { apiResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Parse request
    const body = await request.json();
    const { imageUrls, companyId, transactionType } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return apiResponse.badRequest("imageUrls is required");
    }

    if (!companyId) {
      return apiResponse.badRequest("companyId is required");
    }

    if (!transactionType || !["EXPENSE", "INCOME"].includes(transactionType)) {
      return apiResponse.badRequest("transactionType must be EXPENSE or INCOME");
    }

    // 1. เรียก AI วิเคราะห์
    const aiResult = await analyzeReceipt({
      imageUrls,
      companyId,
      transactionType,
    });

    // Check error
    if ("error" in aiResult) {
      return apiResponse.error(aiResult.error);
    }

    // 2. เช็ค Vendor Memory (override ถ้ามี)
    let vendorMemory: VendorMemory | null = null;
    let finalResult = aiResult;

    if (aiResult.vendor.taxId || aiResult.vendor.name) {
      vendorMemory = await findVendorMemory(
        companyId,
        aiResult.vendor.name,
        aiResult.vendor.taxId,
        transactionType
      );

      if (vendorMemory) {
        // Override ค่าจาก memory
        finalResult = applyVendorMemory(aiResult, vendorMemory);
      }
    }

    // 3. Return result
    return apiResponse.success({
      ...finalResult,
      memory: vendorMemory ? {
        found: true,
        id: vendorMemory.id,
        useCount: vendorMemory.useCount,
      } : {
        found: false,
      },
    });

  } catch (error) {
    console.error("[AI Analyze API] Error:", error);
    return apiResponse.error("Internal server error");
  }
}

/**
 * Apply vendor memory to AI result
 * Memory overrides AI suggestions with 100% confidence
 */
function applyVendorMemory(
  aiResult: ReceiptAnalysisResult,
  memory: VendorMemory
): ReceiptAnalysisResult {
  return {
    ...aiResult,
    // Override contact if memory has it
    vendor: {
      ...aiResult.vendor,
      matchedContactId: memory.contactId || aiResult.vendor.matchedContactId,
      matchedContactName: memory.contactName || aiResult.vendor.matchedContactName,
    },
    // Override account if memory has it
    account: memory.accountId ? {
      id: memory.accountId,
      code: memory.accountCode,
      name: memory.accountName,
    } : aiResult.account,
    // Override VAT if memory has it
    vatRate: memory.defaultVatRate ?? aiResult.vatRate,
    // Override WHT if memory has it
    wht: memory.defaultWhtRate ? {
      rate: memory.defaultWhtRate,
      amount: aiResult.amount ? (aiResult.amount * memory.defaultWhtRate / 100) : null,
      type: memory.defaultWhtType || aiResult.wht.type,
    } : aiResult.wht,
    // Update confidence (memory = 100%)
    confidence: {
      ...aiResult.confidence,
      overall: memory.accountId ? 100 : aiResult.confidence.overall,
      account: memory.accountId ? 100 : aiResult.confidence.account,
      vendor: memory.contactId ? 100 : aiResult.confidence.vendor,
    },
    // Add description about memory
    description: memory.accountId
      ? `${aiResult.description || ""} (จำจากการบันทึกครั้งก่อน ${memory.useCount} ครั้ง)`.trim()
      : aiResult.description,
  };
}
