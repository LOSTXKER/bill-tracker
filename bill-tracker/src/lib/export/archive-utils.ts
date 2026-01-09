/**
 * Utilities for export archive functionality
 * Handles file naming, folder structure, and Thai date formatting
 */

/**
 * Convert Date to Thai Buddhist Era (พ.ศ.) format
 * @param date - Date object
 * @returns Formatted date string: YYYY-MM-DD (พ.ศ.)
 */
export function formatThaiDate(date: Date): string {
  const year = date.getFullYear() + 543; // Convert to Buddhist Era
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get Thai month name abbreviation
 * @param month - Month number (0-11)
 * @returns Thai month abbreviation
 */
export function getThaiMonthName(month: number): string {
  const thaiMonths = [
    "มค", "กพ", "มีค", "เมย", "พค", "มิย",
    "กค", "สค", "กย", "ตค", "พย", "ธค",
  ];
  return thaiMonths[month] || "มค";
}

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename safe for file systems
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters for Windows/Unix file systems
  return filename
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/\.{2,}/g, ".") // Replace multiple dots with single dot
    .trim();
}

/**
 * Generate filename according to accounting standards
 * Format: {date}-{contactName}-{type}.{extension}
 * Example: 2568-01-15-บริษัทABC-invoice.pdf
 * 
 * @param date - Transaction date
 * @param contactName - Name of vendor/customer
 * @param type - Document type (slip, invoice, wht, bill)
 * @param extension - File extension (pdf, jpg, png)
 * @param index - Optional index for duplicate names
 * @returns Formatted filename
 */
export function generateFilename(
  date: Date,
  contactName: string | null,
  type: "slip" | "invoice" | "wht" | "bill",
  extension: string,
  index?: number
): string {
  const formattedDate = formatThaiDate(date);
  const safeName = sanitizeFilename(contactName || "ไม่ระบุ");
  const suffix = index && index > 1 ? `-${index}` : "";
  
  return `${formattedDate}-${safeName}-${type}${suffix}.${extension}`;
}

/**
 * Get folder path for document type (Expense side)
 * @param type - Document type
 * @returns Folder path in Thai
 */
export function getExpenseFolderPath(type: "slip" | "invoice" | "wht"): string {
  const folderMap = {
    slip: "รายจ่าย/สลิปโอนเงิน",
    invoice: "รายจ่าย/ใบกำกับภาษี",
    wht: "รายจ่าย/หนังสือรับรองหัก ณ ที่จ่าย",
  };
  return folderMap[type];
}

/**
 * Get folder path for document type (Income side)
 * @param type - Document type
 * @returns Folder path in Thai
 */
export function getIncomeFolderPath(type: "slip" | "bill" | "wht"): string {
  const folderMap = {
    slip: "รายรับ/สลิปที่ลูกค้าโอน",
    bill: "รายรับ/สำเนาบิลที่ออก",
    wht: "รายรับ/ใบ 50 ทวิที่ได้รับ",
  };
  return folderMap[type];
}

/**
 * Extract file extension from URL or filename
 * @param url - File URL or filename
 * @returns File extension without dot
 */
export function getFileExtension(url: string | undefined | null): string {
  if (!url) return "jpg";
  
  const filename = url.split("/").pop() || "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop() || "jpg" : "jpg";
}

/**
 * Format company name and period for archive filename
 * @param companyCode - Company code (e.g., "ANJ")
 * @param month - Month number (0-11)
 * @param year - Year in Buddhist Era
 * @returns Archive filename
 */
export function formatArchiveFilename(
  companyCode: string,
  month: number,
  year: number
): string {
  const monthName = getThaiMonthName(month);
  return `${companyCode}-${monthName}-${year}.zip`;
}

/**
 * Generate README content for the archive
 * @param companyName - Company name
 * @param period - Period string (e.g., "มกราคม 2568")
 * @param stats - Statistics about the export
 * @returns README text content
 */
export function generateReadmeContent(
  companyName: string,
  period: string,
  stats: {
    expenseCount: number;
    incomeCount: number;
    totalFiles: number;
  }
): string {
  return `รายงานการส่งออกข้อมูล
====================================

บริษัท: ${companyName}
ช่วงเวลา: ${period}
วันที่สร้างไฟล์: ${new Date().toLocaleString("th-TH")}

สถิติ
------------------------------------
- รายจ่าย: ${stats.expenseCount} รายการ
- รายรับ: ${stats.incomeCount} รายการ
- ไฟล์เอกสารทั้งหมด: ${stats.totalFiles} ไฟล์

โครงสร้างโฟลเดอร์
------------------------------------
รายจ่าย/
  ├── ใบกำกับภาษี/          - ใบกำกับภาษีจากผู้ขาย
  ├── สลิปโอนเงิน/          - หลักฐานการโอนเงิน
  └── หนังสือรับรองหัก ณ ที่จ่าย/ - ภ.ง.ด.3, 53, 54

รายรับ/
  ├── สำเนาบิลที่ออก/       - บิล/ใบกำกับภาษีที่เราออกให้ลูกค้า
  ├── สลิปที่ลูกค้าโอน/     - หลักฐานการรับเงินจากลูกค้า
  └── ใบ 50 ทวิที่ได้รับ/   - หนังสือรับรองการหักภาษี ณ ที่จ่าย

รายงานสรุป/
  - ไฟล์ Excel สรุปรายรับ-รายจ่าย
  - รายงาน VAT
  - รายงานหัก ณ ที่จ่าย

รูปแบบการตั้งชื่อไฟล์
------------------------------------
รูปแบบ: {ปี พ.ศ.}-{เดือน}-{วัน}-{ชื่อผู้ติดต่อ}-{ประเภท}.{นามสกุล}
ตัวอย่าง: 2568-01-15-บริษัทABC-invoice.pdf

หมายเหตุ
------------------------------------
- ไฟล์ทั้งหมดจัดเรียงตามวันที่และประเภทเอกสาร
- หากมีชื่อซ้ำกันจะเพิ่มหมายเลขต่อท้าย (-2, -3, ...)
- ไฟล์ที่ไม่สามารถดาวน์โหลดได้จะถูกข้ามไป

====================================
สร้างโดย Bill Tracker System
`;
}
