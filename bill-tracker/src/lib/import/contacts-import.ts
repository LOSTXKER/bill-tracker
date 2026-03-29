import { prisma } from "@/lib/db";
import { logCreate } from "@/lib/audit/logger";
import * as XLSX from "xlsx";
import { ContactCategory, EntityType, DataSource } from "@prisma/client";

export interface ParsedContact {
  peakCode: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  prefix: string | null;
  taxId: string | null;
  branchCode: string;
  entityType: EntityType;
  contactCategory: ContactCategory;
  businessType: string | null;
  nationality: string;
  address: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
}

export interface PreviewContact extends ParsedContact {
  status: "new" | "update" | "skip";
  existingName: string | null;
  existingSource: DataSource | null;
}

export interface PreviewResult {
  contacts: PreviewContact[];
  stats: {
    total: number;
    new: number;
    update: number;
    skip: number;
  };
}

export interface ImportResult {
  message: string;
  created: number;
  updated: number;
  deleted?: number;
  total: number;
  mode: string;
}

// ---------------------------------------------------------------------------
// Excel Parsing
// ---------------------------------------------------------------------------

function mapContactCategory(value: string | undefined): ContactCategory {
  if (!value) return ContactCategory.VENDOR;

  const normalized = value.toLowerCase().trim();

  if (
    (normalized.includes("ลูกค้า") && normalized.includes("ผู้จำหน่าย")) ||
    (normalized.includes("customer") && normalized.includes("vendor")) ||
    normalized.includes("both") ||
    normalized.includes("ทั้งสอง")
  ) {
    return ContactCategory.BOTH;
  }

  if (
    normalized.includes("ลูกค้า") ||
    normalized.includes("customer") ||
    normalized.includes("ลค")
  ) {
    return ContactCategory.CUSTOMER;
  }

  if (
    normalized.includes("ผู้จำหน่าย") ||
    normalized.includes("ร้านค้า") ||
    normalized.includes("ผู้ขาย") ||
    normalized.includes("vendor") ||
    normalized.includes("supplier") ||
    normalized.includes("ซัพพลายเออร์") ||
    normalized.includes("ผจ") ||
    normalized === "v" ||
    normalized === "s"
  ) {
    return ContactCategory.VENDOR;
  }

  if (
    normalized.includes("อื่น") ||
    normalized.includes("other") ||
    normalized === "o"
  ) {
    return ContactCategory.OTHER;
  }

  return ContactCategory.VENDOR;
}

function mapEntityType(value: string | undefined): EntityType {
  if (!value) return EntityType.COMPANY;

  const normalized = value.toLowerCase().trim();
  if (normalized.includes("บุคคล") || normalized.includes("individual")) {
    return EntityType.INDIVIDUAL;
  }
  return EntityType.COMPANY;
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedContact[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    header: 1,
    raw: false,
  });

  const isPeakExport =
    rawData.length > 1 &&
    (rawData[0] as unknown[]).some(
      (cell: unknown) =>
        cell &&
        typeof cell === "string" &&
        (cell.includes("ข้อมูลผู้ติดต่อ") || cell.includes("รหัสผู้ติดต่อ"))
    );

  let processedData: Record<string, unknown>[];

  if (isPeakExport) {
    const dataRows = rawData.slice(1) as unknown[][];

    processedData = (dataRows
      .map((row: unknown[]) => {
        if (!row || row.length === 0 || !row[1] || row[1] === "รหัสผู้ติดต่อ")
          return null;

        return {
          "รหัสผู้ติดต่อ": row[1],
          "ประเภทผู้ติดต่อ": row[2],
          "สัญชาติ": row[3],
          "เลขทะเบียนภาษี": row[4],
          "สาขา": row[5],
          "บุคคล/นิติบุคคล": row[6],
          "ประเภทกิจการ": row[7],
          "คำนำหน้า": row[8],
          "ชื่อ": row[9],
          "นามสกุล": row[10],
          "ผู้ติดต่อ": row[11],
          "ที่อยู่": row[12],
          "แขวง/ตำบล": row[13],
          "เขต/อำเภอ": row[14],
          "จังหวัด": row[15],
          "ประเทศ": row[16],
          "รหัสไปรษณีย์": row[17],
          "เบอร์โทร": row[26],
          "อีเมล": row[27],
        };
      })
      .filter((item) => item !== null)) as Record<string, unknown>[];
  } else {
    processedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];
  }

  const parsedContacts: ParsedContact[] = [];

  for (const row of processedData as Record<string, string | undefined>[]) {
    const peakCode = row["รหัสผู้ติดต่อ"]?.toString().trim();
    const firstName = row["ชื่อ"]?.toString().trim() || null;
    const lastName = row["นามสกุล"]?.toString().trim() || null;

    if (!peakCode || (!firstName && !lastName)) continue;

    let name = firstName || "";
    if (lastName) {
      name = name ? `${name} ${lastName}` : lastName;
    }

    parsedContacts.push({
      peakCode,
      name,
      firstName,
      lastName,
      prefix: row["คำนำหน้า"]?.toString().trim() || null,
      taxId: row["เลขทะเบียนภาษี"]?.toString().trim() || null,
      branchCode: row["สาขา"]?.toString().trim() || "00000",
      entityType: mapEntityType(row["บุคคล/นิติบุคคล"]?.toString()),
      contactCategory: mapContactCategory(row["ประเภทผู้ติดต่อ"]?.toString()),
      businessType: row["ประเภทกิจการ"]?.toString().trim() || null,
      nationality: row["สัญชาติ"]?.toString().trim() || "ไทย",
      address: row["ที่อยู่"]?.toString().trim() || null,
      subDistrict: row["แขวง/ตำบล"]?.toString().trim() || null,
      district: row["เขต/อำเภอ"]?.toString().trim() || null,
      province: row["จังหวัด"]?.toString().trim() || null,
      postalCode: row["รหัสไปรษณีย์"]?.toString().trim() || null,
      country: row["ประเทศ"]?.toString().trim() || "Thailand",
      phone: row["เบอร์โทร"]?.toString().trim() || null,
      email: row["อีเมล"]?.toString().trim() || null,
      contactPerson: row["ผู้ติดต่อ"]?.toString().trim() || null,
    });
  }

  return parsedContacts;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export async function buildContactPreview(
  parsedContacts: ParsedContact[],
  companyId: string
): Promise<PreviewResult> {
  const existingContacts = await prisma.contact.findMany({
    where: {
      companyId,
      peakCode: { in: parsedContacts.map((c) => c.peakCode) },
    },
    select: { peakCode: true, name: true, source: true },
  });

  const existingCodesMap = new Map(
    existingContacts.map((c) => [c.peakCode, { name: c.name, source: c.source }])
  );

  const contacts: PreviewContact[] = parsedContacts.map((contact) => {
    const existing = existingCodesMap.get(contact.peakCode);
    let status: "new" | "update" | "skip" = "new";

    if (existing !== undefined) {
      status = existing.name !== contact.name ? "update" : "skip";
    }

    return {
      ...contact,
      status,
      existingName: existing?.name || null,
      existingSource: existing?.source || null,
    };
  });

  return {
    contacts,
    stats: {
      total: contacts.length,
      new: contacts.filter((c) => c.status === "new").length,
      update: contacts.filter((c) => c.status === "update").length,
      skip: contacts.filter((c) => c.status === "skip").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function contactToDbFields(contact: ParsedContact, companyId: string, now: Date) {
  return {
    companyId,
    peakCode: contact.peakCode,
    name: contact.name,
    firstName: contact.firstName,
    lastName: contact.lastName,
    prefix: contact.prefix,
    taxId: contact.taxId,
    branchCode: contact.branchCode,
    entityType: contact.entityType,
    contactCategory: contact.contactCategory,
    businessType: contact.businessType,
    nationality: contact.nationality,
    address: contact.address,
    subDistrict: contact.subDistrict,
    district: contact.district,
    province: contact.province,
    postalCode: contact.postalCode,
    country: contact.country,
    phone: contact.phone,
    email: contact.email,
    contactPerson: contact.contactPerson,
    source: DataSource.PEAK,
    updatedAt: now,
  };
}

const BATCH_SIZE = 50;

async function batchUpdate(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  contacts: ParsedContact[],
  companyId: string,
  now: Date
): Promise<number> {
  let updated = 0;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    for (const contact of batch) {
      const { companyId: _cid, ...data } = contactToDbFields(contact, companyId, now);
      await tx.contact.updateMany({
        where: { companyId, peakCode: contact.peakCode },
        data,
      });
    }
    updated += batch.length;
  }
  return updated;
}

async function replaceImport(
  parsedContacts: ParsedContact[],
  companyId: string
): Promise<ImportResult> {
  const parsedPeakCodes = [...new Set(parsedContacts.map((c) => c.peakCode))];
  const now = new Date();

  const usedContactIds = await prisma.contact.findMany({
    where: {
      companyId,
      OR: [{ Expense: { some: {} } }, { Income: { some: {} } }],
    },
    select: { id: true },
  });

  const existingContacts = await prisma.contact.findMany({
    where: { companyId, peakCode: { in: parsedPeakCodes } },
    select: { id: true, peakCode: true },
  });

  const existingCodesMap = new Map(existingContacts.map((c) => [c.peakCode, c.id]));

  const contactsToCreate = parsedContacts.filter((c) => !existingCodesMap.has(c.peakCode));
  const contactsToUpdate = parsedContacts.filter((c) => existingCodesMap.has(c.peakCode));

  const result = await prisma.$transaction(
    async (tx) => {
      const deleteResult = await tx.contact.deleteMany({
        where: {
          companyId,
          source: DataSource.PEAK,
          id: { notIn: usedContactIds.map((c) => c.id) },
          OR: [{ peakCode: null }, { peakCode: { notIn: parsedPeakCodes } }],
        },
      });

      let created = 0;
      if (contactsToCreate.length > 0) {
        const createResult = await tx.contact.createMany({
          data: contactsToCreate.map((contact) => ({
            id: crypto.randomUUID(),
            ...contactToDbFields(contact, companyId, now),
          })),
          skipDuplicates: true,
        });
        created = createResult.count;
      }

      const updated = await batchUpdate(tx, contactsToUpdate, companyId, now);

      return { deleted: deleteResult.count, created, updated };
    },
    { timeout: 120000 }
  );

  await updateLastImportTimestamp(companyId, now);

  return {
    message: `Import สำเร็จ: ลบผู้ติดต่อ Peak เดิม ${result.deleted} รายการ, สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
    deleted: result.deleted,
    created: result.created,
    updated: result.updated,
    total: parsedContacts.length,
    mode: "replace",
  };
}

async function mergeImport(
  parsedContacts: ParsedContact[],
  companyId: string,
  userId: string
): Promise<ImportResult> {
  const parsedPeakCodes = [...new Set(parsedContacts.map((c) => c.peakCode))];
  const now = new Date();

  const existingContacts = await prisma.contact.findMany({
    where: { companyId, peakCode: { in: parsedPeakCodes } },
    select: { id: true, peakCode: true, name: true },
  });

  const existingCodesMap = new Map(
    existingContacts.map((c) => [c.peakCode, { id: c.id, name: c.name }])
  );

  const toCreate: ParsedContact[] = [];
  const toUpdate: ParsedContact[] = [];

  for (const contact of parsedContacts) {
    const existing = existingCodesMap.get(contact.peakCode);
    if (existing === undefined) {
      toCreate.push(contact);
    } else if (existing.name !== contact.name) {
      toUpdate.push(contact);
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      let created = 0;
      if (toCreate.length > 0) {
        const createResult = await tx.contact.createMany({
          data: toCreate.map((contact) => ({
            id: crypto.randomUUID(),
            ...contactToDbFields(contact, companyId, now),
          })),
          skipDuplicates: true,
        });
        created = createResult.count;
      }

      const updated = await batchUpdate(tx, toUpdate, companyId, now);

      return { created, updated };
    },
    { timeout: 120000 }
  );

  if (result.created > 0 || result.updated > 0) {
    try {
      await logCreate(
        "Contact",
        {
          id: companyId,
          action: "BULK_IMPORT",
          created: result.created,
          updated: result.updated,
          mode: "merge",
        },
        userId,
        companyId
      );
    } catch {
      // Ignore audit log errors
    }
  }

  await updateLastImportTimestamp(companyId, now);

  return {
    message: `Import สำเร็จ: สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
    created: result.created,
    updated: result.updated,
    total: parsedContacts.length,
    mode: "merge",
  };
}

async function updateLastImportTimestamp(companyId: string, now: Date) {
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: { lastContactImportAt: now },
    });
  } catch (updateError) {
    console.warn("Could not update lastContactImportAt:", updateError);
  }
}

export async function importContacts(
  parsedContacts: ParsedContact[],
  companyId: string,
  mode: string,
  userId: string
): Promise<ImportResult> {
  if (mode === "replace") {
    return replaceImport(parsedContacts, companyId);
  }
  return mergeImport(parsedContacts, companyId, userId);
}
