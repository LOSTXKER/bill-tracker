import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate } from "@/lib/audit/logger";
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
 * 
 * OPTIMIZED: ใช้ createMany และ batch updates แทน loop เพื่อหลีกเลี่ยง timeout
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

  const parsedPeakCodes = Array.from(new Set(parsedContacts.map(c => c.peakCode)));
  const now = new Date();

  // Replace Mode: ลบเฉพาะผู้ติดต่อที่มาจาก Peak (source = PEAK) แล้ว import ใหม่
  // ไม่แตะผู้ติดต่อที่สร้างเอง (source = MANUAL)
  if (mode === "replace") {
    // หาผู้ติดต่อที่ถูกใช้ใน Expense หรือ Income (query นอก transaction)
    const usedContactIds = await prisma.contact.findMany({
      where: {
        companyId: company.id,
        OR: [
          { Expense: { some: {} } },
          { Income: { some: {} } },
        ],
      },
      select: { id: true },
    });

    // หาผู้ติดต่อที่มีอยู่แล้ว (query นอก transaction)
    const existingContacts = await prisma.contact.findMany({
      where: {
        companyId: company.id,
        peakCode: { in: parsedPeakCodes },
      },
      select: { id: true, peakCode: true },
    });

    const existingCodesMap = new Map(
      existingContacts.map(c => [c.peakCode, c.id])
    );

    // แยกผู้ติดต่อที่ต้องสร้างใหม่และอัปเดต
    const contactsToCreate = parsedContacts.filter(c => !existingCodesMap.has(c.peakCode));
    const contactsToUpdate = parsedContacts.filter(c => existingCodesMap.has(c.peakCode));

    const result = await prisma.$transaction(async (tx) => {
      // ลบเฉพาะผู้ติดต่อที่มาจาก Peak และไม่ได้ใช้งาน และไม่มีใน file ที่ import
      const deleteResult = await tx.contact.deleteMany({
        where: {
          companyId: company.id,
          source: DataSource.PEAK,
          id: { notIn: usedContactIds.map(c => c.id) },
          OR: [
            { peakCode: null },
            { peakCode: { notIn: parsedPeakCodes } },
          ],
        },
      });

      // สร้างผู้ติดต่อใหม่แบบ batch (ใช้ createMany)
      let created = 0;
      if (contactsToCreate.length > 0) {
        const createResult = await tx.contact.createMany({
          data: contactsToCreate.map(contact => ({
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
            source: DataSource.PEAK,
            updatedAt: now,
          })),
          skipDuplicates: true,
        });
        created = createResult.count;
      }

      // อัปเดตผู้ติดต่อที่มีอยู่แล้ว - ใช้ raw SQL สำหรับ batch update
      let updated = 0;
      if (contactsToUpdate.length > 0) {
        // Update ทีละ batch เพื่อหลีกเลี่ยง SQL ยาวเกินไป
        const BATCH_SIZE = 50;
        for (let i = 0; i < contactsToUpdate.length; i += BATCH_SIZE) {
          const batch = contactsToUpdate.slice(i, i + BATCH_SIZE);
          for (const contact of batch) {
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
                source: DataSource.PEAK,
                updatedAt: now,
              },
            });
          }
          updated += batch.length;
        }
      }

      return { deleted: deleteResult.count, created, updated };
    }, { timeout: 120000 }); // เพิ่มเป็น 120 วินาที

    // อัปเดตวันที่ import ล่าสุด
    try {
      await prisma.company.update({
        where: { id: company.id },
        data: { lastContactImportAt: now },
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
  // Get existing contacts for comparison (query นอก transaction)
  const existingContacts = await prisma.contact.findMany({
    where: {
      companyId: company.id,
      peakCode: { in: parsedPeakCodes },
    },
    select: { id: true, peakCode: true, name: true },
  });

  const existingCodesMap = new Map(
    existingContacts.map(c => [c.peakCode, { id: c.id, name: c.name }])
  );

  // Categorize contacts
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

  // Perform upsert in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create new contacts แบบ batch (ใช้ createMany)
    let created = 0;
    if (toCreate.length > 0) {
      const createResult = await tx.contact.createMany({
        data: toCreate.map(contact => ({
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
          source: DataSource.PEAK,
          updatedAt: now,
        })),
        skipDuplicates: true,
      });
      created = createResult.count;
    }

    // Update existing contacts - batch update
    let updated = 0;
    if (toUpdate.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        for (const contact of batch) {
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
              source: DataSource.PEAK,
              updatedAt: now,
            },
          });
        }
        updated += batch.length;
      }
    }

    return { created, updated };
  }, { timeout: 120000 }); // เพิ่มเป็น 120 วินาที

  // Log bulk import (สร้าง 1 audit log สำหรับการ import ทั้งหมด แทนที่จะสร้างทีละตัว)
  if (result.created > 0 || result.updated > 0) {
    try {
      await logCreate(
        "Contact",
        { 
          action: "BULK_IMPORT", 
          created: result.created, 
          updated: result.updated,
          mode: "merge",
        },
        session.user.id,
        company.id
      );
    } catch {
      // Ignore audit log errors
    }
  }

  // อัปเดตวันที่ import ล่าสุด
  try {
    await prisma.company.update({
      where: { id: company.id },
      data: { lastContactImportAt: now },
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
