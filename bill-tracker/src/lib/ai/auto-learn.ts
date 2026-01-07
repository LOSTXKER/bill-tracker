/**
 * Auto-Learn Service
 * Handles automatic learning from user transactions
 */

import { prisma } from "@/lib/db";
import type { CategoryType, PaymentMethod } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type LearnSource = "MANUAL" | "AUTO" | "FEEDBACK";

export interface LearnDecision {
  shouldLearn: boolean;
  confidence: number;
  reason: string;
  suggestAsk: boolean;  // ถ้า shouldLearn = true แต่ confidence ไม่สูง → ถามก่อน
}

export interface TransactionData {
  id?: string;
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
  
  // Vendor info
  vendorName: string | null;
  vendorTaxId: string | null;
  
  // Mapped values
  contactId: string | null;
  categoryId: string | null;
  vatRate: number | null;
  paymentMethod: PaymentMethod | null;
  description: string | null;
}

export interface LearnResult {
  success: boolean;
  mappingId?: string;
  isNew: boolean;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const AUTO_LEARN_THRESHOLD = 80;  // Confidence >= 80% → Auto learn
const ASK_THRESHOLD = 50;         // Confidence 50-79% → Ask first
const MIN_LEARN_THRESHOLD = 50;   // Don't learn if confidence < 50%

// =============================================================================
// Decision Logic
// =============================================================================

/**
 * Decide whether to learn from a transaction
 */
export function decideToLearn(
  confidence: number,
  hasVendorIdentifier: boolean,
  existingMappingId: string | null
): LearnDecision {
  // ถ้ามี mapping อยู่แล้ว → ไม่ต้องเรียนใหม่ (แค่ update useCount)
  if (existingMappingId) {
    return {
      shouldLearn: false,
      confidence,
      reason: "มี mapping อยู่แล้ว",
      suggestAsk: false,
    };
  }

  // ถ้าไม่มี vendor identifier → ไม่สามารถเรียนได้
  if (!hasVendorIdentifier) {
    return {
      shouldLearn: false,
      confidence: 0,
      reason: "ไม่มีข้อมูลร้านค้า (ชื่อหรือเลขผู้เสียภาษี)",
      suggestAsk: false,
    };
  }

  // ถ้า confidence ต่ำมาก → ไม่เรียน
  if (confidence < MIN_LEARN_THRESHOLD) {
    return {
      shouldLearn: false,
      confidence,
      reason: "ความมั่นใจต่ำเกินไป",
      suggestAsk: false,
    };
  }

  // ถ้า confidence สูงมาก → Auto learn
  if (confidence >= AUTO_LEARN_THRESHOLD) {
    return {
      shouldLearn: true,
      confidence,
      reason: "ความมั่นใจสูง - เรียนรู้อัตโนมัติ",
      suggestAsk: false,
    };
  }

  // ถ้า confidence ปานกลาง → ถามก่อน
  return {
    shouldLearn: true,
    confidence,
    reason: "ความมั่นใจปานกลาง - ควรถามผู้ใช้ก่อน",
    suggestAsk: true,
  };
}

// =============================================================================
// Learning Functions
// =============================================================================

/**
 * Learn from a saved transaction
 */
export async function learnFromTransaction(
  data: TransactionData,
  source: LearnSource = "AUTO"
): Promise<LearnResult> {
  try {
    // Need at least vendor name or tax ID
    if (!data.vendorName && !data.vendorTaxId) {
      return {
        success: false,
        isNew: false,
        error: "ต้องมีชื่อร้านหรือเลขผู้เสียภาษี",
      };
    }

    // Check for existing mapping
    const existingMapping = await findExistingMapping(
      data.companyId,
      data.vendorTaxId,
      data.vendorName,
      data.transactionType as CategoryType
    );

    if (existingMapping) {
      // Update existing mapping
      await prisma.vendorMapping.update({
        where: { id: existingMapping.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
          // Update values if they were empty before
          contactId: existingMapping.contactId || data.contactId,
          categoryId: existingMapping.categoryId || data.categoryId,
          defaultVatRate: existingMapping.defaultVatRate ?? data.vatRate,
          paymentMethod: existingMapping.paymentMethod || data.paymentMethod,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        mappingId: existingMapping.id,
        isNew: false,
      };
    }

    // Create new mapping
    const newMapping = await prisma.vendorMapping.create({
      data: {
        companyId: data.companyId,
        transactionType: data.transactionType as CategoryType,
        vendorName: data.vendorName,
        vendorTaxId: data.vendorTaxId,
        contactId: data.contactId,
        categoryId: data.categoryId,
        defaultVatRate: data.vatRate,
        paymentMethod: data.paymentMethod,
        descriptionTemplate: data.description 
          ? generateDescriptionTemplate(data.description, data.vendorName)
          : null,
        learnSource: source,
        originalTxId: data.id,
        useCount: 1,
        lastUsedAt: new Date(),
      },
    });

    return {
      success: true,
      mappingId: newMapping.id,
      isNew: true,
    };
  } catch (error) {
    console.error("Error learning from transaction:", error);
    return {
      success: false,
      isNew: false,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
    };
  }
}

/**
 * Update existing mapping from user feedback
 */
export async function learnFromFeedback(
  mappingId: string,
  updates: Partial<{
    contactId: string;
    categoryId: string;
    vatRate: number;
    paymentMethod: PaymentMethod;
    descriptionTemplate: string;
  }>
): Promise<LearnResult> {
  try {
    await prisma.vendorMapping.update({
      where: { id: mappingId },
      data: {
        ...updates,
        defaultVatRate: updates.vatRate,
        learnSource: "FEEDBACK",
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      mappingId,
      isNew: false,
    };
  } catch (error) {
    console.error("Error updating mapping from feedback:", error);
    return {
      success: false,
      isNew: false,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
    };
  }
}

/**
 * Increment use count when mapping is used
 */
export async function recordMappingUsage(mappingId: string): Promise<void> {
  try {
    await prisma.vendorMapping.update({
      where: { id: mappingId },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error recording mapping usage:", error);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find existing mapping by tax ID or vendor name
 */
async function findExistingMapping(
  companyId: string,
  vendorTaxId: string | null,
  vendorName: string | null,
  transactionType: CategoryType
) {
  // Priority 1: Match by tax ID (exact match)
  if (vendorTaxId) {
    const byTaxId = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        vendorTaxId,
        transactionType,
      },
    });
    if (byTaxId) return byTaxId;
  }

  // Priority 2: Match by vendor name (exact match for now)
  if (vendorName) {
    const normalizedName = normalizeVendorName(vendorName);
    
    const byName = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        transactionType,
        vendorName: {
          equals: vendorName,
          mode: "insensitive",
        },
      },
    });
    if (byName) return byName;

    // Try normalized match
    const allMappings = await prisma.vendorMapping.findMany({
      where: {
        companyId,
        transactionType,
        vendorName: { not: null },
      },
    });

    for (const mapping of allMappings) {
      if (mapping.vendorName) {
        const mappingNormalized = normalizeVendorName(mapping.vendorName);
        if (mappingNormalized === normalizedName) {
          return mapping;
        }
      }
    }
  }

  return null;
}

/**
 * Normalize vendor name for comparison
 */
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/บริษัท|จำกัด|มหาชน|ห้างหุ้นส่วน|หจก\.|บจก\./g, "")
    .replace(/co\.?,?\s*ltd\.?/gi, "")
    .replace(/inc\.?|corp\.?|llc\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate description template from actual description
 */
function generateDescriptionTemplate(
  description: string,
  vendorName: string | null
): string {
  if (!vendorName) return description;

  // Replace vendor name with placeholder
  const template = description.replace(vendorName, "{vendorName}");
  
  // If no replacement happened, add prefix
  if (template === description) {
    return `${description} - {vendorName}`;
  }

  return template;
}

/**
 * Get learning statistics for a company
 */
export async function getLearningStats(companyId: string) {
  const stats = await prisma.vendorMapping.groupBy({
    by: ["learnSource"],
    where: { companyId },
    _count: true,
  });

  const total = await prisma.vendorMapping.count({
    where: { companyId },
  });

  const topUsed = await prisma.vendorMapping.findMany({
    where: { companyId },
    orderBy: { useCount: "desc" },
    take: 10,
    include: {
      contact: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return {
    total,
    bySource: Object.fromEntries(
      stats.map((s) => [s.learnSource || "UNKNOWN", s._count])
    ),
    topUsed: topUsed.map((m) => ({
      id: m.id,
      vendorName: m.vendorName,
      contactName: m.contact?.name,
      categoryName: m.category?.name,
      useCount: m.useCount,
      lastUsed: m.lastUsedAt,
    })),
  };
}

/**
 * Reset all learned mappings for a company
 */
export async function resetAllMappings(
  companyId: string,
  source?: LearnSource
): Promise<number> {
  const result = await prisma.vendorMapping.deleteMany({
    where: {
      companyId,
      ...(source ? { learnSource: source } : {}),
    },
  });

  return result.count;
}
