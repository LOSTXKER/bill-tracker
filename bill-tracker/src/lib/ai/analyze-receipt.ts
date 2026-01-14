/**
 * 🧠 AI Receipt Analyzer - ระบบ AI ใหม่ที่ทำทุกอย่างในครั้งเดียว
 * 
 * Flow:
 * 1. รับรูปใบเสร็จ + ผังบัญชี + ผู้ติดต่อ
 * 2. AI วิเคราะห์ทุกอย่างในคำสั่งเดียว
 * 3. Return ข้อมูลครบ พร้อมใช้งาน
 */

import { prisma } from "@/lib/db";
import { analyzeImage } from "./gemini";

// =============================================================================
// Types
// =============================================================================

export interface ReceiptAnalysisInput {
  imageUrls: string[];
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
}

export interface AnalyzedVendor {
  name: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  branchNumber: string | null;
  matchedContactId: string | null;
  matchedContactName: string | null;
}

export interface AnalyzedAccount {
  id: string | null;
  code: string | null;
  name: string | null;
}

export interface AnalyzedWHT {
  rate: number | null;  // 1, 3, 5
  amount: number | null;
  type: string | null;  // ค่าบริการ, ค่าเช่า, ค่าจ้างทำของ
}

export interface ConfidenceScores {
  overall: number;
  vendor: number;
  amount: number;
  date: number;
  account: number;
}

export interface ReceiptAnalysisResult {
  // ข้อมูลพื้นฐาน
  vendor: AnalyzedVendor;
  date: string | null;  // ISO date string
  amount: number | null;
  vatAmount: number | null;
  vatRate: number | null;  // 0 or 7
  wht: AnalyzedWHT;
  netAmount: number | null;
  
  // บัญชีที่แนะนำ
  account: AnalyzedAccount;
  
  // ประเภทเอกสาร
  documentType: string | null;  // TAX_INVOICE, RECEIPT, SLIP, WHT_CERT
  
  // เลขที่เอกสาร
  invoiceNumber: string | null;  // เลขที่ใบกำกับภาษี/ใบเสร็จ
  
  // รายการ (ถ้ามี)
  items: string[];
  
  // Confidence
  confidence: ConfidenceScores;
  
  // คำอธิบาย
  description: string | null;
  
  // ข้อมูลดิบจาก AI (สำหรับ debug)
  rawText?: string;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * วิเคราะห์ใบเสร็จด้วย AI - ทำทุกอย่างในครั้งเดียว
 */
export async function analyzeReceipt(
  input: ReceiptAnalysisInput
): Promise<ReceiptAnalysisResult | { error: string }> {
  const { imageUrls, companyId, transactionType } = input;

  if (!imageUrls || imageUrls.length === 0) {
    return { error: "ไม่มีรูปภาพ" };
  }

  try {
    // 1. ดึงข้อมูลที่ต้องใช้ (ทำพร้อมกัน)
    const [accounts, contacts] = await Promise.all([
      fetchAccounts(companyId, transactionType),
      fetchContacts(companyId),
    ]);

    if (accounts.length === 0) {
      return { error: "ไม่มีผังบัญชีในระบบ กรุณา Import จาก Peak ก่อน" };
    }

    // 2. สร้าง Prompt
    const prompt = buildAnalysisPrompt(accounts, contacts, transactionType);

    // 3. วิเคราะห์ทุกไฟล์ (parallel)
    const analysisPromises = imageUrls.map(async (url) => {
      const response = await analyzeImage(url, prompt, {
        temperature: 0.1,
        maxTokens: 2048,
      });
      if (response.error) {
        console.error("[analyzeReceipt] AI error for", url, response.error);
        return null;
      }
      return parseAIResponse(response.data, accounts, contacts);
    });

    const results = await Promise.all(analysisPromises);
    const validResults = results.filter((r): r is ReceiptAnalysisResult => r !== null);

    if (validResults.length === 0) {
      return { error: "AI ไม่สามารถวิเคราะห์ได้" };
    }

    // 4. ถ้ามีแค่ไฟล์เดียว ใช้ผลลัพธ์นั้นเลย
    if (validResults.length === 1) {
      return validResults[0];
    }

    // 5. รวมผลลัพธ์จากหลายไฟล์
    const combinedResult = combineMultipleResults(validResults);
    return combinedResult;

  } catch (error) {
    console.error("[analyzeReceipt] Error:", error);
    return { error: "เกิดข้อผิดพลาดในการวิเคราะห์" };
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchAccounts(companyId: string, transactionType: "EXPENSE" | "INCOME") {
  const accountClasses = transactionType === "EXPENSE"
    ? ["COST_OF_SALES", "EXPENSE", "OTHER_EXPENSE"]
    : ["REVENUE", "OTHER_INCOME"];

  return prisma.account.findMany({
    where: {
      companyId,
      class: { in: accountClasses as any },
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
    orderBy: { code: "asc" },
  });
}

async function fetchContacts(companyId: string) {
  return prisma.contact.findMany({
    where: {
      companyId,
    },
    select: {
      id: true,
      name: true,
      taxId: true,
      peakCode: true,
    },
    orderBy: { name: "asc" },
    take: 500,  // จำกัดไม่ให้ prompt ยาวเกิน
  });
}

// =============================================================================
// Prompt Building
// =============================================================================

function buildAnalysisPrompt(
  accounts: { id: string; code: string; name: string; description: string | null }[],
  contacts: { id: string; name: string; taxId: string | null }[],
  transactionType: "EXPENSE" | "INCOME"
): string {
  // สร้างรายการบัญชี
  const accountList = accounts
    .map(a => `${a.code}|${a.name}|${a.id}`)
    .join("\n");

  // สร้างรายการผู้ติดต่อ (เฉพาะที่มี taxId)
  const contactList = contacts
    .filter(c => c.taxId)
    .slice(0, 200)  // จำกัด 200 รายการ
    .map(c => `${c.taxId}|${c.name}|${c.id}`)
    .join("\n");

  return `คุณเป็นนักบัญชีผู้เชี่ยวชาญ วิเคราะห์ใบเสร็จ/เอกสารนี้แล้วตอบเป็น JSON

## ประเภทรายการ: ${transactionType === "EXPENSE" ? "รายจ่าย" : "รายรับ"}

## ผังบัญชีที่มี (รหัส|ชื่อ|ID)
${accountList}

## ผู้ติดต่อที่มี (เลขภาษี|ชื่อ|ID)
${contactList || "ไม่มีข้อมูล"}

## สิ่งที่ต้องทำ
1. อ่านข้อมูลจากเอกสาร (ชื่อร้าน, เลขภาษี, วันที่, ยอดเงิน, VAT, WHT)
2. จับคู่ผู้ติดต่อจาก Tax ID (ถ้าตรงกัน)
3. เลือกบัญชีที่เหมาะสมที่สุดจากผังบัญชี (ดูจากประเภทร้านค้า/รายการ)
4. ให้ Confidence สูง (85-98%) ถ้าเลือกบัญชีได้

## ความรู้ที่คุณมี (ใช้เลือกบัญชี)
- ซอฟต์แวร์/SaaS: Cursor, GitHub, Notion, Figma, Adobe, Microsoft, Google → ค่าซอฟต์แวร์/ค่าบริการ
- Cloud: AWS, Vercel, Cloudflare, Firebase → ค่าบริการ/ค่าซอฟต์แวร์
- โฆษณา: Facebook Ads, Google Ads, LINE Ads → ค่าโฆษณา
- โทรศัพท์: TRUE, AIS, DTAC → ค่าโทรศัพท์
- สาธารณูปโภค: การไฟฟ้า, การประปา → ค่าสาธารณูปโภค
- ขนส่ง: Kerry, Flash, Grab → ค่าขนส่ง
- น้ำมัน: PTT, Shell, Esso → ค่าน้ำมัน
- อาหาร: 7-Eleven, Starbucks, ร้านอาหาร → ค่าอาหาร/รับรอง
- จ้างทำของ/พัฒนาระบบ → ค่าจ้างทำของ/ค่าบริการ

## ตอบ JSON เท่านั้น (ห้ามมี text อื่น)
{
  "vendor": {
    "name": "ชื่อร้าน/บริษัท",
    "taxId": "เลขประจำตัวผู้เสียภาษี 13 หลัก หรือ null",
    "address": "ที่อยู่ หรือ null",
    "phone": "เบอร์โทร หรือ null",
    "branchNumber": "สาขา เช่น 00000 หรือ null",
    "matchedContactId": "ID ของผู้ติดต่อที่ตรงกัน หรือ null"
  },
  "date": "YYYY-MM-DD",
  "amount": 1000.00,
  "vatAmount": 70.00,
  "vatRate": 7,
  "wht": {
    "rate": 3,
    "amount": 30.00,
    "type": "ค่าบริการ"
  },
  "netAmount": 1040.00,
  "account": {
    "id": "ID จากผังบัญชี",
    "code": "รหัส 6 หลัก",
    "name": "ชื่อบัญชี"
  },
  "documentType": "TAX_INVOICE",
  "invoiceNumber": "เลขที่ใบกำกับภาษี/ใบเสร็จ เช่น 'IV2401-0001' หรือ null ถ้าไม่มี",
  "items": ["รายการที่ 1", "รายการที่ 2"],
  "description": "สรุปสั้นๆ ว่าค่าใช้จ่ายนี้คืออะไร เช่น 'ค่าสมาชิก Cursor Pro รายเดือน' หรือ 'ค่าอาหารเลี้ยงทีม' หรือ 'โอนเงินค่าบริการ' (ถ้าเป็นสลิปโอนเงินให้ระบุว่า 'โอนเงิน [ชื่อผู้รับ]')",
  "confidence": {
    "overall": 90,
    "vendor": 95,
    "amount": 100,
    "date": 95,
    "account": 85
  }
}`;
}

// =============================================================================
// Combine Multiple Results
// =============================================================================

/**
 * รวมผลลัพธ์จากหลายเอกสาร
 * - รวมยอดเงินทั้งหมด
 * - ใช้วันที่ล่าสุด
 * - รวม description
 * - ใช้ vendor จากเอกสารแรกที่มีข้อมูล
 */
function combineMultipleResults(results: ReceiptAnalysisResult[]): ReceiptAnalysisResult {
  // รวมยอดเงิน
  let totalAmount = 0;
  let totalVatAmount = 0;
  let totalNetAmount = 0;
  let totalWhtAmount = 0;

  // เก็บ descriptions
  const descriptions: string[] = [];
  const allItems: string[] = [];
  const invoiceNumbers: string[] = [];

  // หา vendor จากเอกสารแรกที่มีข้อมูล
  let bestVendor: ReceiptAnalysisResult["vendor"] | null = null;
  let bestAccount: ReceiptAnalysisResult["account"] | null = null;
  let latestDate: string | null = null;
  let documentType: string | null = null;
  let whtRate: number | null = null;
  let whtType: string | null = null;
  let vatRate: number | null = null;

  for (const result of results) {
    // รวมยอดเงิน
    if (result.amount) totalAmount += result.amount;
    if (result.vatAmount) totalVatAmount += result.vatAmount;
    if (result.netAmount) totalNetAmount += result.netAmount;
    if (result.wht.amount) totalWhtAmount += result.wht.amount;

    // เก็บ descriptions
    if (result.description) {
      descriptions.push(result.description);
    }

    // เก็บ items
    if (result.items.length > 0) {
      allItems.push(...result.items);
    }

    // เก็บ invoice numbers
    if (result.invoiceNumber) {
      invoiceNumbers.push(result.invoiceNumber);
    }

    // ใช้ vendor จากเอกสารแรกที่มีข้อมูล
    if (!bestVendor && result.vendor.name) {
      bestVendor = result.vendor;
    }

    // ใช้ account จากเอกสารที่มี confidence สูงสุด
    if (result.account.id && (!bestAccount || result.confidence.account > 0)) {
      bestAccount = result.account;
    }

    // ใช้วันที่ล่าสุด
    if (result.date) {
      if (!latestDate || result.date > latestDate) {
        latestDate = result.date;
      }
    }

    // ใช้ document type แรกที่พบ
    if (!documentType && result.documentType) {
      documentType = result.documentType;
    }

    // ใช้ WHT rate แรกที่พบ
    if (!whtRate && result.wht.rate) {
      whtRate = result.wht.rate;
      whtType = result.wht.type;
    }

    // ใช้ VAT rate แรกที่พบ
    if (vatRate === null && result.vatRate !== null) {
      vatRate = result.vatRate;
    }
  }

  // สร้าง combined description
  const uniqueDescriptions = [...new Set(descriptions)];
  const combinedDescription = uniqueDescriptions.length > 0
    ? uniqueDescriptions.join(" + ")
    : null;

  // คำนวณ confidence เฉลี่ย
  const avgConfidence = {
    overall: Math.round(results.reduce((sum, r) => sum + r.confidence.overall, 0) / results.length),
    vendor: Math.round(results.reduce((sum, r) => sum + r.confidence.vendor, 0) / results.length),
    amount: Math.round(results.reduce((sum, r) => sum + r.confidence.amount, 0) / results.length),
    date: Math.round(results.reduce((sum, r) => sum + r.confidence.date, 0) / results.length),
    account: Math.round(results.reduce((sum, r) => sum + r.confidence.account, 0) / results.length),
  };

  return {
    vendor: bestVendor || {
      name: null,
      taxId: null,
      address: null,
      phone: null,
      branchNumber: null,
      matchedContactId: null,
      matchedContactName: null,
    },
    date: latestDate,
    amount: totalAmount > 0 ? totalAmount : null,
    vatAmount: totalVatAmount > 0 ? totalVatAmount : null,
    vatRate: vatRate,
    wht: {
      rate: whtRate,
      amount: totalWhtAmount > 0 ? totalWhtAmount : null,
      type: whtType,
    },
    netAmount: totalNetAmount > 0 ? totalNetAmount : null,
    account: bestAccount || { id: null, code: null, name: null },
    documentType,
    invoiceNumber: invoiceNumbers.length > 0 ? invoiceNumbers.join(", ") : null,
    items: [...new Set(allItems)],
    confidence: avgConfidence,
    description: combinedDescription,
  };
}

// =============================================================================
// Response Parsing
// =============================================================================

function parseAIResponse(
  rawResponse: string,
  accounts: { id: string; code: string; name: string }[],
  contacts: { id: string; name: string; taxId: string | null }[]
): ReceiptAnalysisResult {
  let jsonText = rawResponse.trim();

  // ลบ markdown code blocks
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Validate และ normalize account
    let account: AnalyzedAccount = { id: null, code: null, name: null };
    if (parsed.account?.id) {
      const matchedAccount = accounts.find(a => a.id === parsed.account.id);
      if (matchedAccount) {
        account = {
          id: matchedAccount.id,
          code: matchedAccount.code,
          name: matchedAccount.name,
        };
      }
    }

    // Validate contact match
    let matchedContactId: string | null = null;
    let matchedContactName: string | null = null;
    if (parsed.vendor?.matchedContactId) {
      const matchedContact = contacts.find(c => c.id === parsed.vendor.matchedContactId);
      if (matchedContact) {
        matchedContactId = matchedContact.id;
        matchedContactName = matchedContact.name;
      }
    }

    // Normalize date (แปลง พ.ศ. เป็น ค.ศ. ถ้าจำเป็น)
    let normalizedDate = parsed.date;
    if (normalizedDate) {
      const yearMatch = normalizedDate.match(/^(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year > 2500) {
          normalizedDate = normalizedDate.replace(/^\d{4}/, String(year - 543));
        }
      }
    }

    // Normalize VAT rate
    let vatRate = parsed.vatRate;
    if (vatRate !== 0 && vatRate !== 7) {
      vatRate = parsed.vatAmount > 0 ? 7 : 0;
    }

    // Normalize WHT rate
    let whtRate = parsed.wht?.rate;
    if (whtRate && ![1, 2, 3, 5, 10, 15].includes(whtRate)) {
      // Round to nearest common rate
      if (whtRate < 2) whtRate = 1;
      else if (whtRate < 4) whtRate = 3;
      else if (whtRate < 7) whtRate = 5;
      else whtRate = null;
    }

    return {
      vendor: {
        name: parsed.vendor?.name || null,
        taxId: parsed.vendor?.taxId || null,
        address: parsed.vendor?.address || null,
        phone: parsed.vendor?.phone || null,
        branchNumber: parsed.vendor?.branchNumber || null,
        matchedContactId,
        matchedContactName,
      },
      date: normalizedDate || null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      vatAmount: typeof parsed.vatAmount === "number" ? parsed.vatAmount : null,
      vatRate,
      wht: {
        rate: whtRate || null,
        amount: typeof parsed.wht?.amount === "number" ? parsed.wht.amount : null,
        type: parsed.wht?.type || null,
      },
      netAmount: typeof parsed.netAmount === "number" ? parsed.netAmount : null,
      account,
      documentType: parsed.documentType || null,
      invoiceNumber: parsed.invoiceNumber || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      confidence: {
        overall: parsed.confidence?.overall || 0,
        vendor: parsed.confidence?.vendor || 0,
        amount: parsed.confidence?.amount || 0,
        date: parsed.confidence?.date || 0,
        account: parsed.confidence?.account || 0,
      },
      description: parsed.description || null,
      rawText: rawResponse,
    };

  } catch (error) {
    console.error("[parseAIResponse] Parse error:", error);
    console.error("[parseAIResponse] Raw:", rawResponse);

    // Return empty result
    return {
      vendor: {
        name: null,
        taxId: null,
        address: null,
        phone: null,
        branchNumber: null,
        matchedContactId: null,
        matchedContactName: null,
      },
      date: null,
      amount: null,
      vatAmount: null,
      vatRate: null,
      wht: { rate: null, amount: null, type: null },
      netAmount: null,
      account: { id: null, code: null, name: null },
      documentType: null,
      invoiceNumber: null,
      items: [],
      confidence: { overall: 0, vendor: 0, amount: 0, date: 0, account: 0 },
      description: null,
      rawText: rawResponse,
    };
  }
}
