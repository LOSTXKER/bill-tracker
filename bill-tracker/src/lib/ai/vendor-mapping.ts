/**
 * Vendor Mapping Service
 * Handles all CRUD operations for vendor mappings (AI learning data)
 */

import { prisma } from "@/lib/db";
import type { PaymentMethod, VendorMapping, Contact, Account } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type LearnSource = "MANUAL" | "AUTO" | "FEEDBACK";

export interface VendorMappingWithRelations extends VendorMapping {
  contact: Contact | null;
  account: { id: string; code: string; name: string } | null;
}

export interface MappingCreateData {
  vendorName?: string;
  vendorTaxId?: string;
  contactId?: string;
  accountId?: string;
  defaultVatRate?: number;
  paymentMethod?: PaymentMethod;
  descriptionTemplate?: string;
  namePattern?: string;
  learnSource?: LearnSource;
  originalTxId?: string;
}

export interface MappingUpdateData {
  vendorName?: string;
  vendorTaxId?: string;
  namePattern?: string;
  contactId?: string;
  accountId?: string;
  defaultVatRate?: number;
  paymentMethod?: PaymentMethod;
  descriptionTemplate?: string;
}

export interface MappingSearchOptions {
  search?: string;
  transactionType?: "EXPENSE" | "INCOME";
  learnSource?: LearnSource;
  limit?: number;
  offset?: number;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create or update a vendor mapping
 * If mapping with same tax ID exists, update it instead
 */
export async function createMapping(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  data: MappingCreateData
): Promise<VendorMapping> {
  // Need at least vendor name or tax ID
  if (!data.vendorName && !data.vendorTaxId) {
    throw new Error("ต้องมีชื่อร้านหรือเลขผู้เสียภาษี");
  }

  // Check if mapping with same tax ID exists
  if (data.vendorTaxId) {
    const existing = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        vendorTaxId: data.vendorTaxId,
        transactionType,
      },
    });

    if (existing) {
      // Update existing mapping
      return prisma.vendorMapping.update({
        where: { id: existing.id },
        data: {
          vendorName: data.vendorName || existing.vendorName,
          contactId: data.contactId || existing.contactId,
          accountId: data.accountId || existing.accountId,
          defaultVatRate: data.defaultVatRate ?? existing.defaultVatRate,
          paymentMethod: data.paymentMethod || existing.paymentMethod,
          descriptionTemplate: data.descriptionTemplate || existing.descriptionTemplate,
          namePattern: data.namePattern || existing.namePattern,
          learnSource: data.learnSource || existing.learnSource,
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }
  }

  // Check if mapping with same vendor name exists
  if (data.vendorName) {
    const normalizedName = normalizeVendorName(data.vendorName);
    const existingByName = await findMappingByName(companyId, data.vendorName, transactionType);

    if (existingByName) {
      // Update existing mapping
      return prisma.vendorMapping.update({
        where: { id: existingByName.id },
        data: {
          vendorTaxId: data.vendorTaxId || existingByName.vendorTaxId,
          contactId: data.contactId || existingByName.contactId,
          accountId: data.accountId || existingByName.accountId,
          defaultVatRate: data.defaultVatRate ?? existingByName.defaultVatRate,
          paymentMethod: data.paymentMethod || existingByName.paymentMethod,
          descriptionTemplate: data.descriptionTemplate || existingByName.descriptionTemplate,
          learnSource: data.learnSource || existingByName.learnSource,
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }
  }

  // Create new mapping
  return prisma.vendorMapping.create({
    data: {
      companyId,
      transactionType,
      vendorName: data.vendorName,
      vendorTaxId: data.vendorTaxId,
      contactId: data.contactId,
      accountId: data.accountId,
      defaultVatRate: data.defaultVatRate,
      paymentMethod: data.paymentMethod,
      descriptionTemplate: data.descriptionTemplate,
      namePattern: data.namePattern,
      learnSource: data.learnSource || "MANUAL",
      originalTxId: data.originalTxId,
      useCount: 1,
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Get all vendor mappings for a company with relations
 */
export async function getMappings(
  companyId: string,
  options?: MappingSearchOptions
): Promise<{
  mappings: VendorMappingWithRelations[];
  total: number;
}> {
  const where = {
    companyId,
    ...(options?.transactionType && { transactionType: options.transactionType }),
    ...(options?.learnSource && { learnSource: options.learnSource }),
    ...(options?.search && {
      OR: [
        { vendorName: { contains: options.search, mode: "insensitive" as const } },
        { vendorTaxId: { contains: options.search } },
        { contact: { name: { contains: options.search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [mappings, total] = await Promise.all([
    prisma.vendorMapping.findMany({
      where,
      include: {
        contact: true,
        account: true,
      },
      orderBy: [
        { useCount: "desc" },
        { lastUsedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.vendorMapping.count({ where }),
  ]);

  return { mappings, total };
}

/**
 * Update a vendor mapping
 */
export async function updateMapping(
  mappingId: string,
  companyId: string,
  data: MappingUpdateData
): Promise<VendorMapping | null> {
  // Verify ownership
  const existing = await prisma.vendorMapping.findFirst({
    where: { id: mappingId, companyId },
  });

  if (!existing) {
    return null;
  }

  return prisma.vendorMapping.update({
    where: { id: mappingId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a vendor mapping
 */
export async function deleteMapping(
  mappingId: string,
  companyId: string
): Promise<boolean> {
  const result = await prisma.vendorMapping.deleteMany({
    where: {
      id: mappingId,
      companyId,
    },
  });

  return result.count > 0;
}

/**
 * Record that a mapping was used (increment useCount)
 */
export async function recordUsage(mappingId: string): Promise<void> {
  try {
    await prisma.vendorMapping.update({
      where: { id: mappingId },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[recordUsage] Error:", error);
  }
}

/**
 * Reset all mappings for a company
 */
export async function resetMappings(
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

// =============================================================================
// Find/Match Functions
// =============================================================================

/**
 * Find best matching mapping for a vendor
 */
export async function findMapping(
  companyId: string,
  vendorName: string | null,
  vendorTaxId: string | null,
  transactionType: "EXPENSE" | "INCOME"
): Promise<VendorMappingWithRelations | null> {
  // Priority 1: Match by tax ID (exact match)
  if (vendorTaxId) {
    const byTaxId = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        vendorTaxId,
        transactionType,
      },
      include: {
        contact: true,
        account: true,
      },
    });
    if (byTaxId) return byTaxId;
  }

  // Priority 2: Match by vendor name
  if (vendorName) {
    return findMappingByName(companyId, vendorName, transactionType);
  }

  return null;
}

/**
 * Find mapping by vendor name (with normalization)
 */
async function findMappingByName(
  companyId: string,
  vendorName: string,
  transactionType: "EXPENSE" | "INCOME"
): Promise<VendorMappingWithRelations | null> {
  const normalizedInput = normalizeVendorName(vendorName);

  // First try exact match (case insensitive)
  const exactMatch = await prisma.vendorMapping.findFirst({
    where: {
      companyId,
      transactionType,
      vendorName: {
        equals: vendorName,
        mode: "insensitive",
      },
    },
    include: {
      contact: true,
      account: true,
    },
  });

  if (exactMatch) return exactMatch;

  // Try normalized match
  const allMappings = await prisma.vendorMapping.findMany({
    where: {
      companyId,
      transactionType,
      vendorName: { not: null },
    },
    include: {
      contact: true,
      account: true,
    },
  });

  for (const mapping of allMappings) {
    if (mapping.vendorName) {
      const normalizedMapping = normalizeVendorName(mapping.vendorName);
      
      // Exact normalized match
      if (normalizedInput === normalizedMapping) {
        return mapping;
      }
      
      // Contains match (for partial names)
      if (
        normalizedInput.includes(normalizedMapping) ||
        normalizedMapping.includes(normalizedInput)
      ) {
        return mapping;
      }
    }
  }

  return null;
}

// =============================================================================
// Stats Functions
// =============================================================================

/**
 * Get learning statistics for a company
 */
export async function getStats(companyId: string) {
  const [stats, total, topUsed, recentlyLearned, accountCoverage] = await Promise.all([
    // Group by source
    prisma.vendorMapping.groupBy({
      by: ["learnSource"],
      where: { companyId },
      _count: true,
    }),
    // Total count
    prisma.vendorMapping.count({
      where: { companyId },
    }),
    // Top used mappings
    prisma.vendorMapping.findMany({
      where: { companyId },
      orderBy: { useCount: "desc" },
      take: 10,
      include: {
        contact: { select: { name: true } },
        account: { select: { code: true, name: true } },
      },
    }),
    // Recently learned
    prisma.vendorMapping.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        account: { select: { code: true, name: true } },
      },
    }),
    // Account coverage
    Promise.all([
      prisma.account.count({ where: { companyId, isActive: true } }),
      prisma.vendorMapping.findMany({
        where: { companyId, accountId: { not: null } },
        select: { accountId: true },
        distinct: ["accountId"],
      }),
    ]),
  ]);

  const [totalAccounts, mappedAccounts] = accountCoverage;

  return {
    total,
    bySource: Object.fromEntries(
      stats.map((s) => [s.learnSource || "UNKNOWN", s._count])
    ),
    topVendors: topUsed.map((m) => ({
      id: m.id,
      vendorName: m.vendorName,
      contactName: m.contact?.name,
      accountCode: m.account?.code,
      accountName: m.account?.name,
      useCount: m.useCount,
      lastUsed: m.lastUsedAt,
    })),
    recentlyLearned: recentlyLearned.map((m) => ({
      id: m.id,
      vendorName: m.vendorName,
      accountCode: m.account?.code,
      accountName: m.account?.name,
      learnedAt: m.createdAt,
      source: m.learnSource,
    })),
    accountCoverage: {
      covered: mappedAccounts.length,
      total: totalAccounts,
      percentage: totalAccounts > 0 
        ? Math.round((mappedAccounts.length / totalAccounts) * 100) 
        : 0,
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize vendor name for comparison
 */
export function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/บริษัท|จำกัด|มหาชน|ห้างหุ้นส่วน|หจก\.|บจก\./g, "")
    .replace(/co\.?,?\s*ltd\.?/gi, "")
    .replace(/inc\.?|corp\.?|llc\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
