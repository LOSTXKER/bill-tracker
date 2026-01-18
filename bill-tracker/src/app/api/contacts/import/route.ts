import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate, logUpdate } from "@/lib/audit/logger";
import * as XLSX from "xlsx";
import { ContactCategory, EntityType, DataSource } from "@prisma/client";

interface ParsedContact {
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

interface PreviewContact extends ParsedContact {
  status: "new" | "update" | "skip";
  existingName: string | null;
  existingSource: DataSource | null;
}

/**
 * Parse Excel file and extract contacts
 */
function parseExcelFile(buffer: ArrayBuffer): ParsedContact[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON - Peak format has header row 1, data starts from row 2
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: "",
    header: 1, // Get as array of arrays
    raw: false // Get formatted values
  });
  
  // Detect if this is Peak export format (has grouped headers)
  const isPeakExport = rawData.length > 1 && 
    (rawData[0] as any[]).some((cell: any) => 
      cell && (cell.includes("ข้อมูลผู้ติดต่อ") || cell.includes("รหัสผู้ติดต่อ"))
    );
  
  let processedData: any[];
  
  if (isPeakExport) {
    // Peak export format: Row 0 is grouped headers, Row 1 is actual headers, Row 2+ is data
    const dataRows = rawData.slice(1) as any[][];
    
    // Map Peak column positions to our fields
    processedData = dataRows.map((row: any[]) => {
      // Skip empty rows or header rows
      if (!row || row.length === 0 || !row[1] || row[1] === "รหัสผู้ติดต่อ") return null;
      
      return {
        "รหัสผู้ติดต่อ": row[1],           // Column B
        "ประเภทผู้ติดต่อ": row[2],        // Column C
        "สัญชาติ": row[3],                 // Column D
        "เลขทะเบียนภาษี": row[4],         // Column E
        "สาขา": row[5],                    // Column F
        "บุคคล/นิติบุคคล": row[6],        // Column G
        "ประเภทกิจการ": row[7],           // Column H
        "คำนำหน้า": row[8],                // Column I
        "ชื่อ": row[9],                    // Column J
        "นามสกุล": row[10],                // Column K
        "ผู้ติดต่อ": row[11],              // Column L (ของที่อยู่)
        "ที่อยู่": row[12],                // Column M
        "แขวง/ตำบล": row[13],             // Column N
        "เขต/อำเภอ": row[14],             // Column O
        "จังหวัด": row[15],                // Column P
        "ประเทศ": row[16],                 // Column Q
        "รหัสไปรษณีย์": row[17],          // Column R
        "เบอร์โทร": row[26],               // Column AA (ช่องทางติดต่อ)
        "อีเมล": row[27],                  // Column AB
      };
    }).filter(Boolean);
  } else {
    // Standard Excel format with headers in first row
    processedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  }
  
  // Parse contacts
  const parsedContacts: ParsedContact[] = [];
  
  for (const row of processedData) {
    const peakCode = row["รหัสผู้ติดต่อ"]?.toString().trim();
    const firstName = row["ชื่อ"]?.toString().trim() || null;
    const lastName = row["นามสกุล"]?.toString().trim() || null;
    
    // Skip if no peak code or name
    if (!peakCode || (!firstName && !lastName)) continue;
    
    // Build full name
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

/**
 * Map Peak contact category to ContactCategory enum
 */
function mapContactCategory(value: string | undefined): ContactCategory {
  if (!value) return ContactCategory.VENDOR;
  
  const normalized = value.toLowerCase().trim();
  
  // Both customer and vendor
  if (
    (normalized.includes("ลูกค้า") && normalized.includes("ผู้จำหน่าย")) ||
    (normalized.includes("customer") && normalized.includes("vendor")) ||
    normalized.includes("both") ||
    normalized.includes("ทั้งสอง")
  ) {
    return ContactCategory.BOTH;
  }
  
  // Customer
  if (
    normalized.includes("ลูกค้า") ||
    normalized.includes("customer") ||
    normalized.includes("ลค")
  ) {
    return ContactCategory.CUSTOMER;
  }
  
  // Vendor/Supplier
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
  
  // Default to VENDOR for business contacts (most common in accounting)
  // Only return OTHER if explicitly specified
  if (
    normalized.includes("อื่น") ||
    normalized.includes("other") ||
    normalized === "o"
  ) {
    return ContactCategory.OTHER;
  }
  
  // Default to VENDOR since most Peak contacts are vendors
  return ContactCategory.VENDOR;
}

/**
 * Map Peak entity type to EntityType enum
 */
function mapEntityType(value: string | undefined): EntityType {
  if (!value) return EntityType.COMPANY;
  
  const normalized = value.toLowerCase().trim();
  if (normalized.includes("บุคคล") || normalized.includes("individual")) {
    return EntityType.INDIVIDUAL;
  }
  return EntityType.COMPANY;
}

/**
 * POST /api/contacts/import?preview=true
 * Preview contacts from Excel file
 */
async function handlePreview(
  request: Request,
  company: { id: string; code: string; name: string }
) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return apiResponse.badRequest("ไม่พบไฟล์");
  }

  // Read Excel file
  const buffer = await file.arrayBuffer();
  const parsedContacts = parseExcelFile(buffer);

  if (parsedContacts.length === 0) {
    return apiResponse.badRequest("ไม่พบข้อมูลผู้ติดต่อในไฟล์");
  }

  // Get existing contacts
  const existingContacts = await prisma.contact.findMany({
    where: {
      companyId: company.id,
      peakCode: { in: parsedContacts.map(c => c.peakCode) },
    },
    select: { peakCode: true, name: true, source: true },
  });

  const existingCodesMap = new Map(
    existingContacts.map(c => [c.peakCode, { name: c.name, source: c.source }])
  );

  // Categorize and add status
  const previewContacts: PreviewContact[] = parsedContacts.map(contact => {
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

  const stats = {
    total: previewContacts.length,
    new: previewContacts.filter(c => c.status === "new").length,
    update: previewContacts.filter(c => c.status === "update").length,
    skip: previewContacts.filter(c => c.status === "skip").length,
  };

  return apiResponse.success({
    contacts: previewContacts,
    stats,
  });
}

/**
 * POST /api/contacts/import
 * Import contacts from Excel file
 * mode: "replace" = ลบเฉพาะ source=PEAK แล้ว import ใหม่, "merge" = upsert (default)
 */
async function handleImport(
  request: Request,
  company: { id: string; code: string; name: string },
  session: { user: { id: string } }
) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const mode = (formData.get("mode") as string) || "merge";

  if (!file) {
    return apiResponse.badRequest("ไม่พบไฟล์");
  }

  // Read Excel file
  const buffer = await file.arrayBuffer();
  const parsedContacts = parseExcelFile(buffer);

  if (parsedContacts.length === 0) {
    return apiResponse.badRequest("ไม่พบข้อมูลผู้ติดต่อในไฟล์");
  }

  const parsedPeakCodes = new Set(parsedContacts.map(c => c.peakCode));

  // Replace Mode: ลบเฉพาะผู้ติดต่อที่มาจาก Peak (source = PEAK) แล้ว import ใหม่
  // ไม่แตะผู้ติดต่อที่สร้างเอง (source = MANUAL)
  if (mode === "replace") {
    const result = await prisma.$transaction(async (tx) => {
      // หาผู้ติดต่อที่ถูกใช้ใน Expense หรือ Income
      const usedContactIds = await tx.contact.findMany({
        where: {
          companyId: company.id,
          OR: [
            { Expense: { some: {} } },
            { Income: { some: {} } },
          ],
        },
        select: { id: true, peakCode: true, source: true },
      });

      // ลบเฉพาะผู้ติดต่อที่มาจาก Peak และไม่ได้ใช้งาน และไม่มีใน file ที่ import
      const deleteResult = await tx.contact.deleteMany({
        where: {
          companyId: company.id,
          source: DataSource.PEAK, // ลบเฉพาะที่มาจาก Peak
          id: { notIn: usedContactIds.map(c => c.id) }, // ไม่ลบที่ใช้งานอยู่
          OR: [
            { peakCode: null },
            { peakCode: { notIn: Array.from(parsedPeakCodes) } }, // ไม่ลบที่มีใน file ใหม่
          ],
        },
      });

      // หาผู้ติดต่อที่มีอยู่แล้ว
      const existingContacts = await tx.contact.findMany({
        where: {
          companyId: company.id,
          peakCode: { in: Array.from(parsedPeakCodes) },
        },
        select: { id: true, peakCode: true, source: true },
      });

      const existingCodesMap = new Map(
        existingContacts.map(c => [c.peakCode, { id: c.id, source: c.source }])
      );

      // แยกผู้ติดต่อที่ต้องสร้างใหม่และอัปเดต
      const contactsToCreate = parsedContacts.filter(c => !existingCodesMap.has(c.peakCode));
      const contactsToUpdate = parsedContacts.filter(c => existingCodesMap.has(c.peakCode));

      let created = 0;
      let updated = 0;

      // สร้างผู้ติดต่อใหม่ (source = PEAK)
      for (const contact of contactsToCreate) {
        await tx.contact.create({
          data: {
            id: crypto.randomUUID(),
            companyId: company.id,
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
            source: DataSource.PEAK, // ระบุว่ามาจาก Peak
            updatedAt: new Date(),
          },
        });
        created++;
      }

      // อัปเดตผู้ติดต่อที่มีอยู่แล้ว (set source = PEAK)
      for (const contact of contactsToUpdate) {
        await tx.contact.updateMany({
          where: {
            companyId: company.id,
            peakCode: contact.peakCode,
          },
          data: {
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
            source: DataSource.PEAK, // อัปเดต source เป็น PEAK
          },
        });
        updated++;
      }

      return { deleted: deleteResult.count, created, updated };
    }, { timeout: 60000 }); // 60 วินาที timeout สำหรับการ import จำนวนมาก

    // อัปเดตวันที่ import ล่าสุด (optional - ไม่ให้ import fail ถ้า column ยังไม่มี)
    try {
      await prisma.company.update({
        where: { id: company.id },
        data: { lastContactImportAt: new Date() },
      });
    } catch (updateError) {
      console.warn("Could not update lastContactImportAt:", updateError);
    }

    return apiResponse.success({
      message: `Import สำเร็จ: ลบผู้ติดต่อ Peak เดิม ${result.deleted} รายการ, สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
      deleted: result.deleted,
      created: result.created,
      updated: result.updated,
      total: parsedContacts.length,
      mode: "replace",
    });
  }

  // Merge Mode (default): Upsert
  // Get existing contacts for comparison
  const existingContacts = await prisma.contact.findMany({
    where: {
      companyId: company.id,
      peakCode: { in: parsedContacts.map(c => c.peakCode) },
    },
    select: { id: true, peakCode: true, name: true },
  });

  const existingCodesMap = new Map(
    existingContacts.map(c => [c.peakCode, { id: c.id, name: c.name }])
  );

  // Categorize contacts
  const toCreate: ParsedContact[] = [];
  const toUpdate: { contact: ParsedContact; existingId: string }[] = [];

  for (const contact of parsedContacts) {
    const existing = existingCodesMap.get(contact.peakCode);
    if (existing === undefined) {
      toCreate.push(contact);
    } else if (existing.name !== contact.name) {
      toUpdate.push({ contact, existingId: existing.id });
    }
  }

  // Perform upsert in transaction (เพิ่ม timeout สำหรับการ import จำนวนมาก)
  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    // Create new contacts (source = PEAK)
    for (const contact of toCreate) {
      const newContact = await tx.contact.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
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
          source: DataSource.PEAK, // ระบุว่ามาจาก Peak
          updatedAt: new Date(),
        },
      });

      await logCreate("Contact", newContact, session.user.id, company.id);
      created++;
    }

    // Update existing contacts (set source = PEAK)
    for (const { contact, existingId } of toUpdate) {
      const existing = await tx.contact.findUnique({ where: { id: existingId } });
      const updatedContact = await tx.contact.update({
        where: { id: existingId },
        data: {
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
          source: DataSource.PEAK, // อัปเดต source เป็น PEAK
        },
      });

      if (existing) {
        await logUpdate("Contact", updatedContact.id, existing, updatedContact, session.user.id, company.id);
      }
      updated++;
    }

    return { created, updated };
  }, { timeout: 60000 }); // 60 วินาที timeout สำหรับการ import จำนวนมาก

  // อัปเดตวันที่ import ล่าสุด (optional - ไม่ให้ import fail ถ้า column ยังไม่มี)
  try {
    await prisma.company.update({
      where: { id: company.id },
      data: { lastContactImportAt: new Date() },
    });
  } catch (updateError) {
    console.warn("Could not update lastContactImportAt:", updateError);
  }

  return apiResponse.success({
    message: `Import สำเร็จ: สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
    created: result.created,
    updated: result.updated,
    total: parsedContacts.length,
    mode: "merge",
  });
}

/**
 * POST /api/contacts/import
 * Import contacts from Excel file
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    try {
      const { searchParams } = new URL(request.url);
      const isPreview = searchParams.get("preview") === "true";

      if (isPreview) {
        return handlePreview(request, company);
      }

      return handleImport(request, company, session);
    } catch (error: any) {
      console.error("Contact import error:", error);
      return apiResponse.error(error);
    }
  },
  {
    permission: "contacts:create",
    rateLimit: { maxRequests: 10, windowMs: 60000 },
  }
);
