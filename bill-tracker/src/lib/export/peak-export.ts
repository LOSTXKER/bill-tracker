// PEAK Export - Generate Excel file for importing expenses into PEAK accounting software
import ExcelJS from "exceljs";

interface PEAKExpenseData {
  billDate: Date;
  referenceNo?: string | null;
  invoiceNumber?: string | null;
  taxInvoiceDate?: Date;
  
  // Vendor/Contact Info
  vendorName?: string | null;
  vendorTaxId?: string | null;
  vendorBranchCode?: string | null;
  vendorContactType?: "INDIVIDUAL" | "COMPANY"; // For ภ.ง.ด. column
  
  // Financial Data
  amount: number;         // Before VAT
  vatRate: number;        // 0 or 7
  vatAmount: number | null;
  whtRate: number | null; // 0, 1, 2, 3, 5, etc.
  whtAmount: number | null;
  whtType?: string | null;
  netPaid: number;
  
  // Account Info
  accountCode?: string | null;
  description?: string | null;
  notes?: string | null;
  
  // Payment info
  paymentMethod?: string | null;
}

/**
 * Export expenses to PEAK format Excel
 * PEAK Import Format (as per PEAK_ImportExpense.xlsx):
 * - Column A: ลำดับที่ (Running number)
 * - Column B: วันที่เอกสาร (Document date) - YYYYMMDD
 * - Column C: อ้างอิง (Reference) - 32 chars max
 * - Column D: ผู้รับเงิน/คู่ค้า (Payee) - Leave blank
 * - Column E: เลขทะเบียน 13 หลัก (Tax ID)
 * - Column F: เลขสาขา 5 หลัก (Branch code) - Default "00000"
 * - Column G: เลขที่ใบกำกับฯ (Tax invoice number) - 35 chars max
 * - Column H: วันที่ใบกำกับฯ (Tax invoice date) - YYYYMMDD
 * - Column I: วันที่บันทึกภาษีซื้อ (Tax record date) - YYYYMMDD
 * - Column J: ประเภทราคา (Price type) - 1 = แยกภาษี
 * - Column K: บัญชี (Account code) - e.g., "530306"
 * - Column L: คำอธิบาย (Description) - 1000 chars max
 * - Column M: จำนวน (Quantity) - Default 1
 * - Column N: ราคาต่อหน่วย (Unit price) - Amount before VAT
 * - Column O: อัตราภาษี (VAT rate) - "7%" or "NO"
 * - Column P: หัก ณ ที่จ่าย (WHT rate) - e.g., "3%"
 * - Column Q: ชำระโดย (Payment method) - Leave blank
 * - Column R: จำนวนเงินที่ชำระ (Amount paid)
 * - Column S: ภ.ง.ด. (PND form) - 3 or 53
 * - Column T: หมายเหตุ (Notes) - 500 chars max
 * - Column U: กลุ่มจัดประเภท (Category group) - Leave blank
 */
export async function exportExpensesToPEAK(
  expenses: PEAKExpenseData[],
  companyName: string,
  period: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("PEAK Import");

  // Set column definitions (based on PEAK template)
  worksheet.columns = [
    { header: "ลำดับที่*", key: "rowNum", width: 12 },                    // A
    { header: "วันที่เอกสาร", key: "docDate", width: 15 },              // B
    { header: "อ้างอิง", key: "reference", width: 20 },                   // C
    { header: "ผู้รับเงิน/คู่ค้า", key: "payee", width: 25 },            // D
    { header: "เลขทะเบียน 13 หลัก", key: "taxId", width: 18 },          // E
    { header: "เลขสาขา 5 หลัก", key: "branchCode", width: 15 },          // F
    { header: "เลขที่ใบกำกับฯ (ถ้ามี)", key: "invoiceNo", width: 20 },   // G
    { header: "วันที่ใบกำกับฯ (ถ้ามี)", key: "invoiceDate", width: 15 }, // H
    { header: "วันที่บันทึกภาษีซื้อ (ถ้ามี)", key: "taxDate", width: 15 }, // I
    { header: "ประเภทราคา", key: "priceType", width: 12 },               // J
    { header: "บัญชี", key: "account", width: 12 },                      // K
    { header: "คำอธิบาย", key: "description", width: 35 },                // L
    { header: "จำนวน", key: "quantity", width: 10 },                      // M
    { header: "ราคาต่อหน่วย", key: "unitPrice", width: 15 },             // N
    { header: "อัตราภาษี", key: "vatRate", width: 12 },                   // O
    { header: "หัก ณ ที่จ่าย (ถ้ามี)", key: "whtRate", width: 12 },      // P
    { header: "ชำระโดย", key: "paymentMethod", width: 15 },               // Q
    { header: "จำนวนเงินที่ชำระ", key: "amountPaid", width: 18 },         // R
    { header: "ภ.ง.ด. (ถ้ามี)", key: "pndForm", width: 12 },              // S
    { header: "หมายเหตุ", key: "notes", width: 30 },                      // T
    { header: "กลุ่มจัดประเภท", key: "category", width: 15 },            // U
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7E6E6" }, // Light gray background
  };
  worksheet.getRow(1).alignment = { 
    vertical: "middle", 
    horizontal: "center",
    wrapText: true 
  };
  worksheet.getRow(1).height = 40;

  // Add data rows
  expenses.forEach((expense, index) => {
    const docDate = formatDatePEAK(expense.billDate);
    const invoiceDate = expense.taxInvoiceDate 
      ? formatDatePEAK(expense.taxInvoiceDate) 
      : docDate;
    
    // Determine ภ.ง.ด. form based on contact type
    let pndForm = "";
    if (expense.whtRate && expense.whtRate > 0) {
      // If contact type is INDIVIDUAL -> ภ.ง.ด.3
      // If contact type is COMPANY -> ภ.ง.ด.53
      if (expense.vendorContactType === "INDIVIDUAL") {
        pndForm = "3";
      } else if (expense.vendorContactType === "COMPANY" || expense.vendorTaxId) {
        pndForm = "53";
      } else {
        // Default to 53 if no tax ID (safer assumption)
        pndForm = "53";
      }
    }

    worksheet.addRow({
      rowNum: index + 1,                                          // A: Running number
      docDate: docDate,                                           // B: YYYYMMDD
      reference: truncateString(expense.referenceNo, 32),         // C: Max 32 chars
      payee: "",                                                  // D: Leave blank
      taxId: expense.vendorTaxId || "",                           // E: 13-digit tax ID
      branchCode: expense.vendorBranchCode || "00000",            // F: Default 00000
      invoiceNo: truncateString(expense.invoiceNumber, 35),       // G: Max 35 chars
      invoiceDate: invoiceDate,                                   // H: Same as doc date
      taxDate: invoiceDate,                                       // I: Same as invoice date
      priceType: 1,                                               // J: 1 = แยกภาษี
      account: expense.accountCode || "",                         // K: Account code
      description: truncateString(expense.description, 1000),     // L: Max 1000 chars
      quantity: 1,                                                // M: Always 1
      unitPrice: Number(expense.amount),                          // N: Amount before VAT
      vatRate: expense.vatRate > 0 ? `${expense.vatRate}%` : "NO", // O: "7%" or "NO"
      whtRate: expense.whtRate && expense.whtRate > 0 
        ? `${expense.whtRate}%` 
        : "",                                                      // P: e.g., "3%"
      paymentMethod: "",                                           // Q: Leave blank (user fills)
      amountPaid: Number(expense.netPaid),                         // R: Net amount paid
      pndForm: pndForm,                                            // S: 3 or 53
      notes: truncateString(expense.notes, 500),                   // T: Max 500 chars
      category: "",                                                // U: Leave blank
    });
  });

  // Format number columns
  ["unitPrice", "amountPaid"].forEach((key) => {
    const col = worksheet.getColumn(key);
    col.numFmt = "#,##0.00";
    col.alignment = { horizontal: "right" };
  });

  // Center align specific columns
  ["rowNum", "priceType", "quantity", "vatRate", "whtRate", "pndForm"].forEach((key) => {
    const col = worksheet.getColumn(key);
    col.alignment = { horizontal: "center" };
  });

  // Add freeze pane (freeze first row)
  worksheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 1 }
  ];

  // Add auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 21 }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Format date for PEAK (YYYYMMDD format)
 * Example: 2026-01-10 -> "20260110"
 */
function formatDatePEAK(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Truncate string to max length
 */
function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Map payment method enum to PEAK format
 * Note: Currently leaving blank as per user preference
 */
function mapPaymentMethod(method: string | null | undefined): string {
  // User requested to leave blank for manual entry
  return "";
  
  // If needed later:
  // const mapping: Record<string, string> = {
  //   CASH: "CSH001",
  //   BANK_TRANSFER: "BNK001",
  //   CREDIT_CARD: "CCD001",
  //   PROMPTPAY: "BNK001",
  //   CHEQUE: "CHQ001",
  // };
  // return mapping[method || ""] || "";
}

// =============================================================================
// PEAK Contacts Export
// =============================================================================

interface PEAKContactData {
  peakCode?: string | null;
  contactCategory?: string; // CUSTOMER, VENDOR, BOTH, OTHER
  entityType?: string; // INDIVIDUAL, COMPANY
  businessType?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  taxId?: string | null;
  branchCode?: string | null;
  address?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
}

/**
 * Export contacts to PEAK format Excel
 * Simplified format that matches Peak's column structure
 */
export async function exportContactsToPEAK(
  contacts: PEAKContactData[],
  companyName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ผู้ติดต่อ");

  // Set column definitions (based on Peak export format)
  // Using same column order as Peak export for easy import back
  worksheet.columns = [
    { header: "รหัสผู้ติดต่อ", key: "peakCode", width: 15 },
    { header: "ประเภทผู้ติดต่อ", key: "contactCategory", width: 15 },
    { header: "สัญชาติ", key: "nationality", width: 12 },
    { header: "เลขทะเบียนภาษี", key: "taxId", width: 18 },
    { header: "สาขา", key: "branchCode", width: 10 },
    { header: "บุคคล/นิติบุคคล", key: "entityType", width: 15 },
    { header: "ประเภทกิจการ", key: "businessType", width: 20 },
    { header: "คำนำหน้า", key: "prefix", width: 10 },
    { header: "ชื่อ", key: "name", width: 30 },
    { header: "นามสกุล", key: "lastName", width: 20 },
    { header: "ผู้ติดต่อ", key: "contactPerson", width: 25 },
    { header: "ที่อยู่", key: "address", width: 40 },
    { header: "แขวง/ตำบล", key: "subDistrict", width: 15 },
    { header: "เขต/อำเภอ", key: "district", width: 15 },
    { header: "จังหวัด", key: "province", width: 15 },
    { header: "ประเทศ", key: "country", width: 15 },
    { header: "รหัสไปรษณีย์", key: "postalCode", width: 12 },
    { header: "เบอร์โทร", key: "phone", width: 15 },
    { header: "อีเมล", key: "email", width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 11, name: "TH Sarabun New" };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" }, // Light blue background (Peak style)
  };
  worksheet.getRow(1).alignment = { 
    vertical: "middle", 
    horizontal: "center",
    wrapText: true 
  };
  worksheet.getRow(1).height = 25;
  
  // Add border to header
  worksheet.getRow(1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };

  // Map contact category to Thai
  const categoryMap: Record<string, string> = {
    CUSTOMER: "ลูกค้า",
    VENDOR: "ผู้จำหน่าย",
    BOTH: "ทั้งลูกค้าและผู้จำหน่าย",
    OTHER: "ไม่ระบุ",
  };

  // Map entity type to Thai
  const entityTypeMap: Record<string, string> = {
    INDIVIDUAL: "บุคคลธรรมดา",
    COMPANY: "นิติบุคคล",
  };

  // Add data rows
  contacts.forEach((contact, index) => {
    const row = worksheet.addRow({
      peakCode: contact.peakCode || "",
      contactCategory: categoryMap[contact.contactCategory || "VENDOR"] || "ไม่ระบุ",
      nationality: contact.nationality || "ไทย",
      taxId: contact.taxId || "",
      branchCode: contact.branchCode || "00000",
      entityType: entityTypeMap[contact.entityType || "COMPANY"] || "นิติบุคคล",
      businessType: contact.businessType || "",
      prefix: contact.prefix || "",
      name: contact.firstName || contact.name,
      lastName: contact.lastName || "",
      contactPerson: contact.contactPerson || "",
      address: contact.address || "",
      subDistrict: contact.subDistrict || "",
      district: contact.district || "",
      province: contact.province || "",
      country: contact.country || "Thailand",
      postalCode: contact.postalCode || "",
      phone: contact.phone || "",
      email: contact.email || "",
    });
    
    // Add alternating row colors (like Peak)
    if (index % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" }
      };
    }
    
    // Add border to data rows
    row.border = {
      top: { style: "thin", color: { argb: "FFD0D0D0" } },
      left: { style: "thin", color: { argb: "FFD0D0D0" } },
      bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
      right: { style: "thin", color: { argb: "FFD0D0D0" } }
    };
  });

  // Add freeze pane (freeze first row)
  worksheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 1 }
  ];

  // Add auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 19 }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}