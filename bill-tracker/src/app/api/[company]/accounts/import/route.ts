import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { AccountClass, DataSource } from "@prisma/client";
import * as XLSX from "xlsx";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  return pathParts[2];
};

// Map Peak account code (6 digits) to AccountClass
function mapCodeToAccountClass(code: string): AccountClass | null {
  const prefix = code.substring(0, 2);
  
  switch (prefix) {
    case "41":
      return "REVENUE";
    case "42":
      return "OTHER_INCOME";
    case "51":
      return "COST_OF_SALES";
    case "52":
    case "53":
    case "58":
      return "EXPENSE";
    case "54":
      return "OTHER_EXPENSE";
    default:
      return null; // Skip non-income/expense accounts
  }
}

interface ParsedAccount {
  code: string;
  nameTh: string;
  nameEn: string;
  class: AccountClass;
}

// POST /api/[company]/accounts/import
// Import accounts from Peak Excel file
// mode: "replace" = ลบเฉพาะ source=PEAK แล้ว import ใหม่, "merge" = upsert (default)
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = (formData.get("mode") as string) || "merge";
    
    if (!file) {
      return apiResponse.badRequest("กรุณาเลือกไฟล์ Excel");
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON (skip header rows)
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { 
      header: 1,
      defval: ""
    });
    
    // Find header row (contains "รหัสบัญชี")
    let startRow = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some(cell => 
        typeof cell === "string" && cell.includes("รหัสบัญชี")
      )) {
        startRow = i + 1; // Start from next row after header
        break;
      }
    }
    
    // Parse accounts
    const parsedAccounts: ParsedAccount[] = [];
    
    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 4) continue;
      
      const code = String(row[1]).trim();
      const nameTh = String(row[2]).trim();
      const nameEn = String(row[3]).trim();
      
      // Skip if no code or name
      if (!code || !nameTh) continue;
      
      // Map to AccountClass
      const accountClass = mapCodeToAccountClass(code);
      if (!accountClass) continue; // Skip non-income/expense
      
      parsedAccounts.push({
        code,
        nameTh,
        nameEn,
        class: accountClass,
      });
    }
    
    if (parsedAccounts.length === 0) {
      return apiResponse.badRequest("ไม่พบบัญชีรายได้/ค่าใช้จ่ายในไฟล์");
    }

    const parsedCodes = new Set(parsedAccounts.map(a => a.code));
    
    // Replace Mode: ลบเฉพาะบัญชีที่มาจาก Peak (source = PEAK) แล้ว import ใหม่
    // ไม่แตะบัญชีที่สร้างเอง (source = MANUAL)
    if (mode === "replace") {
      const result = await prisma.$transaction(async (tx) => {
        // หาบัญชีที่ถูกใช้ใน Expense หรือ Income หรือ VendorMapping
        const usedAccountIds = await tx.account.findMany({
          where: {
            companyId: context.company.id,
            OR: [
              { Expense: { some: {} } },
              { Income: { some: {} } },
              { VendorMapping: { some: {} } },
            ],
          },
          select: { id: true, code: true, source: true },
        });
        
        const usedCodes = new Set(usedAccountIds.map(a => a.code));
        
        // ลบเฉพาะบัญชีที่มาจาก Peak และไม่ได้ใช้งาน และไม่มีใน file ที่ import
        const deleteResult = await tx.account.deleteMany({
          where: {
            companyId: context.company.id,
            source: DataSource.PEAK, // ลบเฉพาะที่มาจาก Peak
            id: { notIn: usedAccountIds.map(a => a.id) }, // ไม่ลบที่ใช้งานอยู่
            code: { notIn: Array.from(parsedCodes) }, // ไม่ลบที่มีใน file ใหม่
          },
        });
        
        // หาบัญชีที่มีอยู่แล้ว
        const existingAccounts = await tx.account.findMany({
          where: {
            companyId: context.company.id,
            code: { in: Array.from(parsedCodes) },
          },
          select: { code: true, source: true },
        });
        
        const existingCodesMap = new Map(
          existingAccounts.map(a => [a.code, a.source])
        );
        
        // แยกบัญชีที่ต้องสร้างใหม่และอัปเดต
        const accountsToCreate = parsedAccounts.filter(a => !existingCodesMap.has(a.code));
        const accountsToUpdate = parsedAccounts.filter(a => existingCodesMap.has(a.code));
        
        let created = 0;
        let updated = 0;
        
        // สร้างบัญชีใหม่ (source = PEAK)
        if (accountsToCreate.length > 0) {
          const now = new Date();
          await tx.account.createMany({
            data: accountsToCreate.map(a => ({
              id: crypto.randomUUID(),
              companyId: context.company.id,
              code: a.code,
              name: a.nameTh,
              nameTh: a.nameTh,
              class: a.class,
              keywords: [],
              isSystem: false,
              isActive: true,
              source: DataSource.PEAK, // ระบุว่ามาจาก Peak
              updatedAt: now,
            })),
            skipDuplicates: true,
          });
          created = accountsToCreate.length;
        }
        
        // อัปเดตบัญชีที่มีอยู่แล้ว (set source = PEAK ด้วย)
        for (const account of accountsToUpdate) {
          await tx.account.updateMany({
            where: {
              companyId: context.company.id,
              code: account.code,
            },
            data: {
              name: account.nameTh,
              nameTh: account.nameTh,
              class: account.class,
              source: DataSource.PEAK, // อัปเดต source เป็น PEAK
            },
          });
          updated++;
        }
        
        return { deleted: deleteResult.count, created, updated };
      }, { timeout: 60000 }); // 60 seconds timeout
      
      // อัปเดตวันที่ import ล่าสุด (optional - ไม่ให้ import fail ถ้า column ยังไม่มี)
      try {
        await prisma.company.update({
          where: { id: context.company.id },
          data: { lastAccountImportAt: new Date() },
        });
      } catch (updateError) {
        console.warn("Could not update lastAccountImportAt:", updateError);
      }
      
      return apiResponse.success({
        message: `Import สำเร็จ: ลบบัญชี Peak เดิม ${result.deleted} รายการ, สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
        deleted: result.deleted,
        created: result.created,
        updated: result.updated,
        total: parsedAccounts.length,
        mode: "replace",
      });
    }
    
    // Merge Mode (default): Upsert
    // Get existing accounts for comparison
    const existingAccounts = await prisma.account.findMany({
      where: {
        companyId: context.company.id,
        code: { in: parsedAccounts.map(a => a.code) }
      },
      select: { code: true, name: true }
    });
    
    const existingCodesMap = new Map(
      existingAccounts.map(a => [a.code, a.name])
    );
    
    // Categorize accounts
    const toCreate: ParsedAccount[] = [];
    const toUpdate: ParsedAccount[] = [];
    
    for (const account of parsedAccounts) {
      const existingName = existingCodesMap.get(account.code);
      if (existingName === undefined) {
        toCreate.push(account);
      } else if (existingName !== account.nameTh) {
        toUpdate.push(account);
      }
      // Skip if name is the same
    }
    
    // Perform upsert in transaction
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      
      // Create new accounts (source = PEAK)
      if (toCreate.length > 0) {
        const now = new Date();
        await tx.account.createMany({
          data: toCreate.map(a => ({
            id: crypto.randomUUID(),
            companyId: context.company.id,
            code: a.code,
            name: a.nameTh,
            nameTh: a.nameTh,
            class: a.class,
            keywords: [],
            isSystem: false,
            isActive: true,
            source: DataSource.PEAK, // ระบุว่ามาจาก Peak
            updatedAt: now,
          })),
          skipDuplicates: true,
        });
        created = toCreate.length;
      }
      
      // Update existing accounts (set source = PEAK)
      for (const account of toUpdate) {
        await tx.account.updateMany({
          where: {
            companyId: context.company.id,
            code: account.code,
          },
          data: {
            name: account.nameTh,
            nameTh: account.nameTh,
            source: DataSource.PEAK, // อัปเดต source เป็น PEAK
          },
        });
        updated++;
      }
      
      return { created, updated };
    }, { timeout: 60000 }); // 60 seconds timeout
    
    // อัปเดตวันที่ import ล่าสุด (optional - ไม่ให้ import fail ถ้า column ยังไม่มี)
    try {
      await prisma.company.update({
        where: { id: context.company.id },
        data: { lastAccountImportAt: new Date() },
      });
    } catch (updateError) {
      console.warn("Could not update lastAccountImportAt:", updateError);
    }
    
    return apiResponse.success({
      message: `Import สำเร็จ: สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
      created: result.created,
      updated: result.updated,
      total: parsedAccounts.length,
      mode: "merge",
    });
    
  } catch (error) {
    console.error("Account import error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการ Import ผังบัญชี")
    );
  }
}

// POST /api/[company]/accounts/import?preview=true
// Preview accounts from Peak Excel file (no actual import)
async function handlePreview(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return apiResponse.badRequest("กรุณาเลือกไฟล์ Excel");
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { 
      header: 1,
      defval: ""
    });
    
    // Find header row
    let startRow = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some(cell => 
        typeof cell === "string" && cell.includes("รหัสบัญชี")
      )) {
        startRow = i + 1;
        break;
      }
    }
    
    // Parse accounts
    const parsedAccounts: ParsedAccount[] = [];
    
    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 4) continue;
      
      const code = String(row[1]).trim();
      const nameTh = String(row[2]).trim();
      const nameEn = String(row[3]).trim();
      
      if (!code || !nameTh) continue;
      
      const accountClass = mapCodeToAccountClass(code);
      if (!accountClass) continue;
      
      parsedAccounts.push({
        code,
        nameTh,
        nameEn,
        class: accountClass,
      });
    }
    
    if (parsedAccounts.length === 0) {
      return apiResponse.badRequest("ไม่พบบัญชีรายได้/ค่าใช้จ่ายในไฟล์");
    }
    
    // Get existing accounts
    const existingAccounts = await prisma.account.findMany({
      where: {
        companyId: context.company.id,
        code: { in: parsedAccounts.map(a => a.code) }
      },
      select: { code: true, name: true, source: true }
    });
    
    const existingCodesMap = new Map(
      existingAccounts.map(a => [a.code, { name: a.name, source: a.source }])
    );
    
    // Categorize and add status
    const previewAccounts = parsedAccounts.map(account => {
      const existing = existingCodesMap.get(account.code);
      let status: "new" | "update" | "skip" = "new";
      
      if (existing !== undefined) {
        status = existing.name !== account.nameTh ? "update" : "skip";
      }
      
      return {
        ...account,
        status,
        existingName: existing?.name || null,
        existingSource: existing?.source || null,
      };
    });
    
    const stats = {
      total: previewAccounts.length,
      new: previewAccounts.filter(a => a.status === "new").length,
      update: previewAccounts.filter(a => a.status === "update").length,
      skip: previewAccounts.filter(a => a.status === "skip").length,
    };
    
    return apiResponse.success({
      accounts: previewAccounts,
      stats,
    });
    
  } catch (error) {
    console.error("Account preview error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการอ่านไฟล์")
    );
  }
}

// Main POST handler
async function handleRequest(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const { searchParams } = new URL(req.url);
  const isPreview = searchParams.get("preview") === "true";
  
  if (isPreview) {
    return handlePreview(req, context);
  }
  
  return handlePost(req, context);
}

export const POST = withCompanyAccess(handleRequest, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
