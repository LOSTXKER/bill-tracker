import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate, logUpdate } from "@/lib/audit/logger";
import * as XLSX from "xlsx";
import { ContactCategory, EntityType } from "@prisma/client";

/**
 * POST /api/contacts/import
 * Import contacts from Excel file
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return apiResponse.error(new Error("ไม่พบไฟล์"));
      }

      // Read Excel file
      const buffer = await file.arrayBuffer();
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
        const headers = rawData[0] as any[];
        const dataRows = rawData.slice(1) as any[][];
        
        // Map Peak column positions to our fields
        processedData = dataRows.map((row: any[]) => {
          // Skip empty rows
          if (!row || row.length === 0 || !row[1]) return null;
          
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

      // Parse and validate data
      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>,
      };

      for (let i = 0; i < processedData.length; i++) {
        const row: any = processedData[i];
        const rowNumber = i + 2; // Excel row number (1-based + header)

        try {
          // Map Peak columns to database fields
          const contactData = {
            companyId: company.id,
            peakCode: row["รหัสผู้ติดต่อ"]?.toString().trim() || null,
            name: row["ชื่อ"]?.toString().trim() || `Contact ${i + 1}`,
            taxId: row["เลขทะเบียนภาษี"]?.toString().trim() || null,
            branchCode: row["สาขา"]?.toString().trim() || "00000",
            prefix: row["คำนำหน้า"]?.toString().trim() || null,
            firstName: row["ชื่อ"]?.toString().trim() || null,
            lastName: row["นามสกุล"]?.toString().trim() || null,
            contactPerson: row["ผู้ติดต่อ"]?.toString().trim() || null,
            
            // Address fields
            address: row["ที่อยู่"]?.toString().trim() || null,
            subDistrict: row["แขวง/ตำบล"]?.toString().trim() || null,
            district: row["เขต/อำเภอ"]?.toString().trim() || null,
            province: row["จังหวัด"]?.toString().trim() || null,
            postalCode: row["รหัสไปรษณีย์"]?.toString().trim() || null,
            country: row["ประเทศ"]?.toString().trim() || "Thailand",
            
            // Contact info
            phone: row["เบอร์โทร"]?.toString().trim() || null,
            email: row["อีเมล"]?.toString().trim() || null,
            
            // Business type mapping
            contactCategory: mapContactCategory(row["ประเภทผู้ติดต่อ"]?.toString()),
            entityType: mapEntityType(row["บุคคล/นิติบุคคล"]?.toString()),
            businessType: row["ประเภทกิจการ"]?.toString().trim() || null,
            nationality: row["สัญชาติ"]?.toString().trim() || "ไทย",
          };

          // Check for existing contact by peakCode or taxId
          const existing = contactData.peakCode
            ? await prisma.contact.findFirst({
                where: {
                  companyId: company.id,
                  OR: [
                    { peakCode: contactData.peakCode },
                    ...(contactData.taxId ? [{ taxId: contactData.taxId }] : []),
                  ],
                },
              })
            : contactData.taxId
            ? await prisma.contact.findFirst({
                where: {
                  companyId: company.id,
                  taxId: contactData.taxId,
                },
              })
            : null;

          if (existing) {
            // Update existing contact
            const updated = await prisma.contact.update({
              where: { id: existing.id },
              data: contactData,
            });

            await logUpdate(
              "Contact",
              updated.id,
              existing,
              updated,
              session.user.id,
              company.id
            );

            results.updated++;
          } else {
            // Create new contact
            const created = await prisma.contact.create({
              data: contactData,
            });

            await logCreate("Contact", created, session.user.id, company.id);

            results.created++;
          }
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            error: error.message,
            data: row,
          });
        }
      }

      return apiResponse.success({
        message: `นำเข้าสำเร็จ: สร้างใหม่ ${results.created} รายการ, อัปเดต ${results.updated} รายการ`,
        results,
      });
    } catch (error: any) {
      return apiResponse.error(error);
    }
  },
  {
    permission: "contacts:create",
    rateLimit: { maxRequests: 10, windowMs: 60000 },
  }
);

/**
 * Map Peak contact category to ContactCategory enum
 */
function mapContactCategory(value: string | undefined): ContactCategory {
  if (!value) return ContactCategory.VENDOR;
  
  const normalized = value.toLowerCase().trim();
  if (normalized.includes("ลูกค้า") && normalized.includes("ผู้จำหน่าย")) {
    return ContactCategory.BOTH;
  }
  if (normalized.includes("ลูกค้า")) {
    return ContactCategory.CUSTOMER;
  }
  if (normalized.includes("ผู้จำหน่าย") || normalized.includes("ร้านค้า")) {
    return ContactCategory.VENDOR;
  }
  return ContactCategory.OTHER;
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
