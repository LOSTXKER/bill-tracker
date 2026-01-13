/**
 * 🧠 Vendor Memory - ระบบจำร้านค้าแบบง่าย
 * 
 * หลักการ:
 * - จำร้านค้าที่เคยบันทึก
 * - ถ้าเจอร้านเดิม → ใช้ค่าที่จำไว้ (Confidence 100%)
 * - Auto learn เมื่อบันทึกรายการ
 */

import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface VendorMemory {
  id: string;
  vendorName: string | null;
  vendorTaxId: string | null;
  contactId: string | null;
  contactName: string | null;
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  defaultVatRate: number | null;
  defaultWhtRate: number | null;
  defaultWhtType: string | null;
  paymentMethod: string | null;
  useCount: number;
}

export interface LearnInput {
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
  vendorName: string | null;
  vendorTaxId: string | null;
  contactId: string | null;
  accountId: string | null;
  vatRate: number | null;
  whtRate: number | null;
  whtType: string | null;
  paymentMethod: string | null;
}

// =============================================================================
// Find Memory - หาข้อมูลที่จำไว้
// =============================================================================

/**
 * หาข้อมูลร้านค้าที่จำไว้
 * ลำดับการค้นหา: Tax ID (แม่นที่สุด) → ชื่อร้าน
 */
export async function findVendorMemory(
  companyId: string,
  vendorName: string | null,
  vendorTaxId: string | null,
  transactionType: "EXPENSE" | "INCOME"
): Promise<VendorMemory | null> {
  if (!vendorName && !vendorTaxId) {
    return null;
  }

  // 1. หาจาก Tax ID ก่อน (แม่นที่สุด)
  if (vendorTaxId) {
    const byTaxId = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        transactionType,
        vendorTaxId,
      },
      include: {
        contact: { select: { id: true, name: true } },
        account: { select: { id: true, code: true, name: true } },
      },
    });

    if (byTaxId) {
      return formatMemory(byTaxId);
    }
  }

  // 2. หาจากชื่อร้าน (fuzzy match)
  if (vendorName) {
    const normalizedName = normalizeVendorName(vendorName);
    
    const byName = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        transactionType,
        OR: [
          { vendorName: { contains: normalizedName } },
          { namePattern: { contains: normalizedName } },
        ],
      },
      include: {
        contact: { select: { id: true, name: true } },
        account: { select: { id: true, code: true, name: true } },
      },
      orderBy: { useCount: "desc" },
    });

    if (byName) {
      return formatMemory(byName);
    }
  }

  return null;
}

// =============================================================================
// Learn - เรียนรู้จากการบันทึก
// =============================================================================

/**
 * เรียนรู้จากการบันทึกรายการ
 * - ถ้าไม่เคยมี → สร้างใหม่
 * - ถ้ามีแล้ว → อัปเดต useCount
 */
export async function learnFromTransaction(input: LearnInput): Promise<void> {
  const {
    companyId,
    transactionType,
    vendorName,
    vendorTaxId,
    contactId,
    accountId,
    vatRate,
    whtRate,
    whtType,
    paymentMethod,
  } = input;

  // ต้องมีอย่างน้อย vendorName หรือ vendorTaxId
  if (!vendorName && !vendorTaxId) {
    return;
  }

  const normalizedName = vendorName ? normalizeVendorName(vendorName) : null;

  try {
    // หา existing mapping
    const existing = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        transactionType,
        OR: [
          vendorTaxId ? { vendorTaxId } : {},
          normalizedName ? { namePattern: normalizedName } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    });

    if (existing) {
      // อัปเดต existing
      await prisma.vendorMapping.update({
        where: { id: existing.id },
        data: {
          vendorName: vendorName || existing.vendorName,
          vendorTaxId: vendorTaxId || existing.vendorTaxId,
          contactId: contactId || existing.contactId,
          accountId: accountId || existing.accountId,
          defaultVatRate: vatRate ?? existing.defaultVatRate,
          defaultWhtRate: whtRate ?? existing.defaultWhtRate,
          defaultWhtType: whtType || existing.defaultWhtType,
          paymentMethod: (paymentMethod || existing.paymentMethod) as PaymentMethod | null,
          useCount: { increment: 1 },
          learnSource: existing.learnSource === "MANUAL" ? "MANUAL" : "AUTO",
        },
      });
    } else {
      // สร้างใหม่
      await prisma.vendorMapping.create({
        data: {
          companyId,
          transactionType,
          vendorName,
          vendorTaxId,
          namePattern: normalizedName,
          contactId,
          accountId,
          defaultVatRate: vatRate,
          defaultWhtRate: whtRate,
          defaultWhtType: whtType,
          paymentMethod: paymentMethod as PaymentMethod | null,
          useCount: 1,
          learnSource: "AUTO",
        },
      });
    }
  } catch (error) {
    console.error("[learnFromTransaction] Error:", error);
    // ไม่ throw เพราะไม่อยากให้ block การบันทึกหลัก
  }
}

// =============================================================================
// Manual Teaching - สอนเอง
// =============================================================================

export interface ManualTeachInput {
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
  vendorName: string;
  vendorTaxId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  defaultVatRate?: number | null;
  defaultWhtRate?: number | null;
  defaultWhtType?: string | null;
  paymentMethod?: string | null;
}

/**
 * สอน AI ด้วยตัวเอง
 */
export async function teachVendor(input: ManualTeachInput): Promise<VendorMemory> {
  const normalizedName = normalizeVendorName(input.vendorName);

  // Try to find existing by vendorTaxId first, then by vendorName
  let existing = null;
  if (input.vendorTaxId) {
    existing = await prisma.vendorMapping.findUnique({
      where: {
        companyId_vendorTaxId_transactionType: {
          companyId: input.companyId,
          vendorTaxId: input.vendorTaxId,
          transactionType: input.transactionType,
        },
      },
    });
  }
  
  if (!existing) {
    existing = await prisma.vendorMapping.findFirst({
      where: {
        companyId: input.companyId,
        transactionType: input.transactionType,
        namePattern: normalizedName,
      },
    });
  }

  let mapping;
  if (existing) {
    mapping = await prisma.vendorMapping.update({
      where: { id: existing.id },
      data: {
        vendorName: input.vendorName,
        vendorTaxId: input.vendorTaxId || existing.vendorTaxId,
        contactId: input.contactId || existing.contactId,
        accountId: input.accountId || existing.accountId,
        defaultVatRate: input.defaultVatRate ?? existing.defaultVatRate,
        defaultWhtRate: input.defaultWhtRate ?? existing.defaultWhtRate,
        defaultWhtType: input.defaultWhtType || existing.defaultWhtType,
        paymentMethod: (input.paymentMethod || existing.paymentMethod) as PaymentMethod | null,
        learnSource: "MANUAL",
      },
      include: {
        contact: { select: { id: true, name: true } },
        account: { select: { id: true, code: true, name: true } },
      },
    });
  } else {
    mapping = await prisma.vendorMapping.create({
      data: {
        companyId: input.companyId,
        transactionType: input.transactionType,
        vendorName: input.vendorName,
        vendorTaxId: input.vendorTaxId || null,
        namePattern: normalizedName,
        contactId: input.contactId || null,
        accountId: input.accountId || null,
        defaultVatRate: input.defaultVatRate ?? null,
        defaultWhtRate: input.defaultWhtRate ?? null,
        defaultWhtType: input.defaultWhtType || null,
        paymentMethod: input.paymentMethod as PaymentMethod | null,
        useCount: 0,
        learnSource: "MANUAL",
      },
      include: {
        contact: { select: { id: true, name: true } },
        account: { select: { id: true, code: true, name: true } },
      },
    });
  }

  return formatMemory(mapping);
}

// =============================================================================
// Delete Memory
// =============================================================================

export async function forgetVendor(mappingId: string): Promise<void> {
  await prisma.vendorMapping.delete({
    where: { id: mappingId },
  });
}

export async function forgetAll(companyId: string): Promise<number> {
  const result = await prisma.vendorMapping.deleteMany({
    where: { companyId },
  });
  return result.count;
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/บริษัท|จำกัด|มหาชน|ห้างหุ้นส่วน|ร้าน|co\.|ltd\.|inc\.|corp\./gi, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function formatMemory(mapping: any): VendorMemory {
  return {
    id: mapping.id,
    vendorName: mapping.vendorName,
    vendorTaxId: mapping.vendorTaxId,
    contactId: mapping.contactId,
    contactName: mapping.contact?.name || null,
    accountId: mapping.accountId,
    accountCode: mapping.account?.code || null,
    accountName: mapping.account?.name || null,
    defaultVatRate: mapping.defaultVatRate,
    defaultWhtRate: mapping.defaultWhtRate,
    defaultWhtType: mapping.defaultWhtType,
    paymentMethod: mapping.paymentMethod,
    useCount: mapping.useCount,
  };
}
