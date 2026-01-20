/**
 * 🧠 AI Receipt Analyzer - ระบบ AI อัจฉริยะ
 * 
 * แนวคิด: AI ฉลาดอยู่แล้ว - ส่ง context ให้มัน แล้วให้มันตัดสินใจเอง
 * 
 * Flow:
 * 1. ดึงข้อมูล: ผังบัญชี + ผู้ติดต่อทั้งหมด
 * 2. ส่งให้ AI พร้อมรูปเอกสาร
 * 3. AI วิเคราะห์และ return ข้อมูลครบ (รวม contact matching)
 */

import { prisma } from "@/lib/db";
import { analyzeImage } from "./gemini";
import { findBestMatchingContact } from "@/lib/utils/string-similarity";

// Import types from centralized location
import type {
  ReceiptAnalysisInput,
  AnalyzedVendor,
  AnalyzedAccount,
  AccountAlternative,
  AnalyzedWHT,
  ConfidenceScores,
  AnalysisWarning,
  ReceiptAnalysisResult,
} from "./types";

// Re-export types for convenience
export type {
  ReceiptAnalysisInput,
  AnalyzedVendor,
  AnalyzedAccount,
  AccountAlternative,
  AnalyzedWHT,
  ConfidenceScores,
  AnalysisWarning,
  ReceiptAnalysisResult,
};

// =============================================================================
// Main Function
// =============================================================================

export async function analyzeReceipt(
  input: ReceiptAnalysisInput
): Promise<ReceiptAnalysisResult | { error: string }> {
  const { imageUrls, companyId, transactionType } = input;

  if (!imageUrls || imageUrls.length === 0) {
    return { error: "ไม่มีรูปภาพ" };
  }

  try {
    // 1. ดึงข้อมูลทั้งหมดที่ AI ต้องใช้
    const [accounts, contacts, company] = await Promise.all([
      fetchAccounts(companyId, transactionType),
      fetchContacts(companyId),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, taxId: true },
      }),
    ]);

    if (accounts.length === 0) {
      return { error: "ไม่มีผังบัญชีในระบบ กรุณา Import จาก Peak ก่อน" };
    }

    // 2. สร้าง Prompt ที่ส่ง context ทั้งหมดให้ AI
    console.log("[AI] Context:", {
      accountsCount: accounts.length,
      contactsCount: contacts.length,
      transactionType,
      company: company?.name,
      sampleAccounts: accounts.slice(0, 3).map(a => `${a.code} - ${a.name}`),
    });
    const prompt = buildSmartPrompt(accounts, contacts, transactionType, company);

    // 3. วิเคราะห์ทุกไฟล์
    const analysisPromises = imageUrls.map(async (url) => {
      const response = await analyzeImage(url, prompt, {
        temperature: 0.1,
        maxTokens: 4096,
      });
      if (response.error) {
        console.error("[analyzeReceipt] AI error for", url, response.error);
        return null;
      }
      return parseAIResponse(response.data, accounts, contacts, company?.taxId);
    });

    const results = await Promise.all(analysisPromises);
    const validResults = results.filter((r): r is ReceiptAnalysisResult => r !== null);

    if (validResults.length === 0) {
      return { error: "AI ไม่สามารถวิเคราะห์ได้" };
    }

    // 4. ถ้ามีหลายไฟล์ → รวมผลลัพธ์
    if (validResults.length === 1) {
      return validResults[0];
    }

    return combineResults(validResults);

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
    where: { companyId },
    select: {
      id: true,
      name: true,
      taxId: true,
    },
    orderBy: { name: "asc" },
  });
}

// =============================================================================
// Smart Prompt - ให้ AI เข้าใจ context และตัดสินใจเอง
// =============================================================================

function buildSmartPrompt(
  accounts: { id: string; code: string; name: string; description: string | null }[],
  contacts: { id: string; name: string; taxId: string | null }[],
  transactionType: "EXPENSE" | "INCOME",
  company: { name: string; taxId: string | null } | null
): string {
  // สร้างรายการบัญชี
  const accountList = accounts
    .map(a => `- ${a.code} | ${a.name} | ID: ${a.id}`)
    .join("\n");

  // สร้างรายการผู้ติดต่อ
  const contactList = contacts.length > 0
    ? contacts.map(c => `- ${c.name}${c.taxId ? ` (${c.taxId})` : ""} | ID: ${c.id}`).join("\n")
    : "(ไม่มีผู้ติดต่อในระบบ)";

  return `คุณเป็นนักบัญชีผู้เชี่ยวชาญ วิเคราะห์เอกสารนี้แล้วตอบเป็น JSON

## ข้อมูลบริษัทของเรา
- ชื่อ: ${company?.name || "ไม่ระบุ"}
- เลขภาษี: ${company?.taxId || "ไม่ระบุ"}

## ประเภทรายการ: ${transactionType === "EXPENSE" ? "รายจ่าย (เราเป็นผู้ซื้อ)" : "รายรับ (เราเป็นผู้ขาย)"}

## ผังบัญชีที่มี
${accountList}

## รายชื่อผู้ติดต่อที่มีในระบบ
${contactList}

## สิ่งที่ต้องทำ

1. **จำแนกประเภทเอกสาร** (สำคัญมาก!)
   - **TAX_INVOICE**: ใบกำกับภาษี (มีเลขผู้เสียภาษี, รายการสินค้า, VAT)
   - **RECEIPT**: ใบเสร็จรับเงิน (มียอดเงิน, วันที่, ชื่อร้าน)
   - **BANK_SLIP**: สลิปโอนเงิน (มีผู้โอน, ผู้รับ, จำนวนเงิน, ธนาคาร)
   - **WHT_CERT**: ใบหัก ณ ที่จ่าย (50 ทวิ)
   - **OTHER**: เอกสารอื่นๆ ที่ไม่ใช่ด้านบน เช่น:
     - ใบสั่งผลิต, ใบงาน, ใบเสนอราคา
     - ใบส่งของ, ใบรับสินค้า
     - สัญญา, ข้อตกลง
     - รายงาน, screenshot, เอกสารอ้างอิง
   - ⚠️ **ถ้าไม่ใช่เอกสารทางการเงินที่มียอดเงินชัดเจน → ใช้ OTHER**

2. **หาผู้ขาย/ผู้ติดต่อ** 
   ${transactionType === "EXPENSE" 
     ? `- **ใบกำกับภาษี/ใบเสร็จ**: หาชื่อ ผู้ขาย (ร้านที่ออกบิล ไม่ใช่ชื่อบริษัทเรา)
   - **สลิปโอนเงิน (BANK_SLIP)**: 
     - ผู้ติดต่อคือ "ผู้รับเงิน" หรือดูจาก "หมายเหตุ/ข้อมูลเพิ่มเติม" ที่มักเป็นชื่อร้านค้า/คนที่เรารับเงิน
     - ⚠️ "ผู้โอน" มักเป็นเจ้าของ/พนักงานของบริษัทเรา ไม่ใช่ผู้ติดต่อ!
     - ถ้าเห็นชื่อบุคคลเป็นผู้โอน และมีชื่อร้าน/บริษัทในหมายเหตุ → ใช้ชื่อร้าน/บริษัทนั้น
     - ถ้าไม่มีข้อมูลผู้รับที่ชัดเจน → ใส่ null (อย่าเดา)`
     : `- **ใบกำกับภาษี/ใบเสร็จ**: หาชื่อ ลูกค้า
   - **สลิปโอนเงิน (BANK_SLIP)**:
     - ผู้ติดต่อคือ "ผู้โอน" (ลูกค้าที่จ่ายเงินให้เรา)
     - ⚠️ "ผู้รับ" คือบริษัทเรา ไม่ใช่ผู้ติดต่อ!
     - ถ้ามีหมายเหตุที่ระบุชื่อลูกค้า/บริษัท → ใช้ข้อมูลนั้น
     - ถ้าไม่มีข้อมูลผู้โอนที่ชัดเจน → ใส่ null (อย่าเดา)`}
   - ดึงเลขประจำตัวผู้เสียภาษี (ถ้ามี)
   - **สำคัญ: ตรวจสอบว่าผู้ขาย/ผู้ติดต่อนี้มีในรายชื่อข้างบนหรือไม่**
   - ถ้าพบตรงกัน (ชื่อคล้ายกัน หรือ เลขภาษีตรงกัน) → ใส่ matchedContactId
   - ถ้าไม่พบ → matchedContactId = null
   - **⚠️ ถ้าไม่แน่ใจว่าใครคือผู้ติดต่อ → ใส่ vendor.name = null และ matchedContactId = null (อย่าเดามัว)**

3. **ดึงข้อมูลการเงิน**
   - **สกุลเงิน** (currency) - ตรวจดูว่าเป็นสกุลเงินอะไร (THB, USD, AED, EUR, GBP, JPY, CNY, SGD, HKD, MYR)
   - ยอดก่อน VAT (amount) - ในสกุลเงินต้นฉบับ
   - VAT (vatAmount, vatRate)
   - หัก ณ ที่จ่าย (whtRate, whtAmount, whtType)
   - ยอดสุทธิที่ต้องจ่าย/รับจริง (netAmount)

4. **เลือกบัญชี** (สำคัญมาก!)
   - **ต้องเลือกบัญชีเสมอ** - แม้ไม่แน่ใจ 100% ก็ต้องเลือกที่เหมาะสมที่สุด
   - เลือกจากผังบัญชีที่ให้ไว้ข้างบนเท่านั้น
   - ใส่ทั้ง id, code, name ของบัญชีที่เลือก
   - ถ้าเป็นสลิปโอนเงิน: ดูจากหมายเหตุ/รายละเอียดว่าค่าอะไร แล้วเลือกบัญชีที่เกี่ยวข้อง
   - เลือกทางเลือกอื่นอีก 2 บัญชี พร้อมเหตุผล

## ตอบ JSON เท่านั้น (ห้ามมี text อื่น)
{
  "vendor": {
    "name": "ชื่อผู้ขาย/ผู้ติดต่อ",
    "taxId": "เลขภาษี 13 หลัก หรือ null",
    "address": "ที่อยู่ หรือ null",
    "phone": "เบอร์โทร หรือ null",
    "branchNumber": "รหัสสาขา เช่น 00000 หรือ null",
    "matchedContactId": "ID ของผู้ติดต่อที่ match (จากรายชื่อข้างบน) หรือ null ถ้าไม่พบ",
    "matchedContactName": "ชื่อผู้ติดต่อที่ match หรือ null"
  },
  "date": "YYYY-MM-DD",
  "currency": "THB",
  "amount": 8000.00,
  "vatAmount": 560.00,
  "vatRate": 7,
  "wht": {
    "rate": 3,
    "amount": 240.00,
    "type": "ค่าบริการ"
  },
  "netAmount": 8320.00,
  "account": {
    "id": "ID ของบัญชีที่เลือก",
    "code": "รหัสบัญชี",
    "name": "ชื่อบัญชี",
    "confidence": 90,
    "reason": "เหตุผลสั้นๆ ที่เลือกบัญชีนี้"
  },
  "accountAlternatives": [
    { "id": "ID", "code": "รหัส", "name": "ชื่อ", "confidence": 75, "reason": "เหตุผล" },
    { "id": "ID", "code": "รหัส", "name": "ชื่อ", "confidence": 60, "reason": "เหตุผล" }
  ],
  "documentType": "TAX_INVOICE | RECEIPT | BANK_SLIP | WHT_CERT | OTHER",
  "invoiceNumber": "เลขที่เอกสาร หรือ null",
  "items": ["รายการที่ 1", "รายการที่ 2"],
  "description": "สรุปสั้นๆ ว่าค่าใช้จ่าย/รายรับนี้คืออะไร",
  "confidence": {
    "overall": 90,
    "vendor": 95,
    "amount": 100,
    "date": 95,
    "account": 85
  }
}

## หมายเหตุสำคัญ
- ถ้าเอกสารมีชื่อบริษัทเรา (${company?.name || ""}) ให้ข้ามไป มองหาชื่ออีกฝั่ง
- เลขภาษีของบริษัทเรา (${company?.taxId || ""}) ไม่ใช่ของผู้ขาย
- VAT rate ในไทยคือ 0% หรือ 7%
- WHT rate ทั่วไป: 1%, 2%, 3%, 5%
- ถ้าวันที่เป็น พ.ศ. ให้แปลงเป็น ค.ศ. (ลบ 543)
- **สกุลเงิน**: ดูสัญลักษณ์หรือตัวอักษรในเอกสาร เช่น $, USD (ดอลลาร์สหรัฐ), AED, د.إ (เดอร์แฮม), €, EUR (ยูโร), £, GBP (ปอนด์), ¥, JPY (เยน), ฿, THB, บาท (บาท) ถ้าไม่แน่ใจให้ใส่ "THB"

## ⚠️ กฎสำคัญสำหรับสลิปโอนเงิน (BANK_SLIP)
- สลิปโอนเงินจะมี "ผู้โอน" และ "ผู้รับ" 
- **รายจ่าย**: ผู้ติดต่อคือร้าน/คนที่เรา**รับเงินให้** → ดูจากชื่อผู้รับหรือหมายเหตุ (เช่น "อินดี้ ทีเชิ้ต" คือร้านค้า)
- **รายรับ**: ผู้ติดต่อคือคน/บริษัทที่**โอนเงินให้เรา** → ดูจากชื่อผู้โอน
- ถ้าผู้โอนเป็นชื่อบุคคลทั่วไป (ไม่ใช่ร้าน/บริษัท) และเป็นรายจ่าย → น่าจะเป็นพนักงานเราที่โอนจ่าย
- **⚠️ ห้ามเดา! ถ้าไม่แน่ใจว่าใครคือผู้ติดต่อ → vendor.name = null**`;
}

// =============================================================================
// Response Parsing
// =============================================================================

function parseAIResponse(
  rawResponse: string,
  accounts: { id: string; code: string; name: string }[],
  contacts: { id: string; name: string; taxId: string | null }[],
  companyTaxId: string | null = null
): ReceiptAnalysisResult {
  let jsonText = rawResponse.trim();

  // ลบ markdown code blocks
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Helper: Find account by ID, code, or name (fallback)
    const findAccount = (aiAccount: { id?: string; code?: string; name?: string } | null) => {
      if (!aiAccount) return null;
      
      // 1. Try match by ID first
      if (aiAccount.id) {
        const byId = accounts.find(a => a.id === aiAccount.id);
        if (byId) return byId;
      }
      
      // 2. Fallback: match by code
      if (aiAccount.code) {
        const byCode = accounts.find(a => a.code === aiAccount.code);
        if (byCode) return byCode;
      }
      
      // 3. Fallback: match by name (fuzzy - contains)
      if (aiAccount.name) {
        const normalizedName = aiAccount.name.toLowerCase().trim();
        const byName = accounts.find(a => 
          a.name.toLowerCase().includes(normalizedName) || 
          normalizedName.includes(a.name.toLowerCase())
        );
        if (byName) return byName;
      }
      
      return null;
    };

    // Validate account
    let account: AnalyzedAccount = { id: null, code: null, name: null };
    const matchedAccount = findAccount(parsed.account);
    
    if (matchedAccount) {
      account = {
        id: matchedAccount.id,
        code: matchedAccount.code,
        name: matchedAccount.name,
        confidence: parsed.account?.confidence || parsed.confidence?.account || 0,
        reason: parsed.account?.reason || "AI วิเคราะห์จากเอกสาร",
      };
    } else if (parsed.account) {
      // Log what AI sent that didn't match
      console.log("[AI] Account NOT MATCHED - AI sent:", {
        id: parsed.account.id,
        code: parsed.account.code,
        name: parsed.account.name,
      });
      console.log("[AI] Available accounts:", accounts.slice(0, 5).map(a => ({ id: a.id, code: a.code, name: a.name })));
    }

    // Parse account alternatives
    const accountAlternatives: AccountAlternative[] = [];
    if (parsed.accountAlternatives && Array.isArray(parsed.accountAlternatives)) {
      for (const alt of parsed.accountAlternatives) {
        const matchedAlt = findAccount(alt);
        if (matchedAlt && matchedAlt.id !== account.id) {
          accountAlternatives.push({
            id: matchedAlt.id,
            code: matchedAlt.code,
            name: matchedAlt.name,
            confidence: alt.confidence || 50,
            reason: alt.reason || "ทางเลือกอื่น",
          });
        }
      }
    }
    console.log("[AI] Account:", account.code || "NONE", "| Alternatives:", accountAlternatives.map(a => a.code).join(", ") || "none");

    // Validate contact (AI อาจ match ผิด ต้องเช็คอีกที)
    let matchedContactId: string | null = null;
    let matchedContactName: string | null = null;
    
    if (parsed.vendor?.matchedContactId) {
      const matchedContact = contacts.find(c => c.id === parsed.vendor.matchedContactId);
      if (matchedContact) {
        matchedContactId = matchedContact.id;
        matchedContactName = matchedContact.name;
      }
    }

    // ถ้า AI ไม่ match แต่เรามี taxId → ลองหาเอง
    if (!matchedContactId && parsed.vendor?.taxId) {
      const normalizedTaxId = parsed.vendor.taxId.replace(/[^0-9]/g, "");
      const foundByTaxId = contacts.find(c => 
        c.taxId?.replace(/[^0-9]/g, "") === normalizedTaxId
      );
      if (foundByTaxId) {
        matchedContactId = foundByTaxId.id;
        matchedContactName = foundByTaxId.name;
        console.log("[AI] Contact matched by taxId verification:", foundByTaxId.name);
      }
    }

    // ถ้ายังไม่ match และมีชื่อ vendor → ลองหาด้วย fuzzy name matching
    // (รองรับกรณีชื่อมี/ไม่มีคำนำหน้า เช่น "น.ส.กฤติกา ดวงใจ" vs "กฤติกา ดวงใจ")
    if (!matchedContactId && parsed.vendor?.name) {
      const foundByName = findBestMatchingContact(parsed.vendor.name, contacts, 0.85);
      if (foundByName) {
        matchedContactId = foundByName.id;
        matchedContactName = foundByName.name;
        console.log("[AI] Contact matched by fuzzy name:", parsed.vendor.name, "→", foundByName.name);
      }
    }

    // Validate vendor tax ID - ไม่ใช่ tax ID ของบริษัทเรา
    let vendorTaxId = parsed.vendor?.taxId || null;
    if (vendorTaxId && companyTaxId) {
      const normalizedVendorTaxId = vendorTaxId.replace(/[^0-9]/g, "");
      const normalizedCompanyTaxId = companyTaxId.replace(/[^0-9]/g, "");
      if (normalizedVendorTaxId === normalizedCompanyTaxId) {
        console.log("[AI] Rejected vendor tax ID - matches company tax ID");
        vendorTaxId = null;
      }
    }

    // Normalize date (พ.ศ. → ค.ศ.)
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
      if (whtRate < 2) whtRate = 1;
      else if (whtRate < 4) whtRate = 3;
      else if (whtRate < 7) whtRate = 5;
      else whtRate = null;
    }

    // Normalize currency
    const validCurrencies = ["THB", "USD", "AED", "EUR", "GBP", "JPY", "CNY", "SGD", "HKD", "MYR"];
    let currency = parsed.currency?.toUpperCase() || "THB";
    if (!validCurrencies.includes(currency)) {
      currency = "THB";
    }

    return {
      vendor: {
        name: parsed.vendor?.name || null,
        taxId: vendorTaxId,
        address: parsed.vendor?.address || null,
        phone: parsed.vendor?.phone || null,
        branchNumber: parsed.vendor?.branchNumber || null,
        matchedContactId,
        matchedContactName,
      },
      date: normalizedDate || null,
      currency,
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
      accountAlternatives: accountAlternatives.slice(0, 2),  // Max 2 alternatives
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
      warnings: [],
      rawText: rawResponse,
    };

  } catch (error) {
    console.error("[parseAIResponse] Parse error:", error);
    console.error("[parseAIResponse] Raw:", rawResponse);

    return createEmptyResult(rawResponse);
  }
}

function createEmptyResult(rawText?: string): ReceiptAnalysisResult {
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
    currency: "THB",
    amount: null,
    vatAmount: null,
    vatRate: null,
    wht: { rate: null, amount: null, type: null },
    netAmount: null,
    account: { id: null, code: null, name: null },
    accountAlternatives: [],
    documentType: null,
    invoiceNumber: null,
    items: [],
    confidence: { overall: 0, vendor: 0, amount: 0, date: 0, account: 0 },
    description: null,
    warnings: [],
    rawText,
  };
}

// =============================================================================
// Combine Multiple Results - Priority-Based (Not Sum)
// =============================================================================

/**
 * รวมผลการวิเคราะห์จากหลายเอกสาร
 * 
 * หลักการ: ใช้ลำดับความสำคัญ ไม่ใช่การรวมยอด
 * - ใบกำกับภาษี: แหล่งหลัก (ยอด, ผู้ขาย, วันที่, รายการ)
 * - สลิปโอน: ยืนยันการจ่าย, อาจได้วันจ่ายจริง
 * - ใบหักที่จ่าย: ข้อมูล WHT
 */
function combineResults(results: ReceiptAnalysisResult[]): ReceiptAnalysisResult {
  const warnings: AnalysisWarning[] = [];
  
  // จัดกลุ่มตามประเภทเอกสาร
  const invoices = results.filter(r => 
    r.documentType === "TAX_INVOICE" || r.documentType === "RECEIPT"
  );
  const slips = results.filter(r => r.documentType === "BANK_SLIP");
  const whtCerts = results.filter(r => r.documentType === "WHT_CERT");
  const others = results.filter(r => 
    !["TAX_INVOICE", "RECEIPT", "BANK_SLIP", "WHT_CERT"].includes(r.documentType || "")
  );

  // เลือกเอกสารหลักตามลำดับความสำคัญ
  const primaryDoc = invoices[0] || slips[0] || others[0] || results[0];
  
  if (!primaryDoc) {
    return createEmptyResult();
  }

  // ⚠️ เตือนเฉพาะกรณีเดียว: หลายใบกำกับจากคนละร้าน (ควรแยกรายการ)
  if (invoices.length > 1) {
    const vendorNames = [...new Set(invoices.map(i => i.vendor.name).filter(Boolean))];
    if (vendorNames.length > 1) {
      warnings.push({
        type: "multiple_invoices",
        message: `พบใบกำกับ ${invoices.length} ใบ จากคนละร้าน - ควรสร้างแยกรายการ`,
        severity: "warning",
      });
    }
  }

  // ดึงข้อมูลจากเอกสารหลัก
  const result: ReceiptAnalysisResult = {
    ...primaryDoc,
    invoiceNumber: [...new Set(results.map(r => r.invoiceNumber).filter(Boolean))].join(", ") || null,
    items: [...new Set(results.flatMap(r => r.items))],
    description: [...new Set(results.map(r => r.description).filter(Boolean))].join(" | ") || null,
    warnings, // เพิ่ม warnings
  };

  // เสริมข้อมูล WHT จากใบหักที่จ่าย
  if (whtCerts.length > 0 && !result.wht.rate) {
    const whtDoc = whtCerts[0];
    result.wht = {
      rate: whtDoc.wht.rate,
      amount: whtDoc.wht.amount,
      type: whtDoc.wht.type,
    };
  }

  // ถ้าใบกำกับไม่มียอด แต่สลิปมี → ใช้จากสลิป
  if (!result.amount && slips.length > 0 && slips[0].amount) {
    result.amount = slips[0].amount;
    result.netAmount = slips[0].netAmount;
  }

  // ไม่ตรวจสอบยอดอัตโนมัติ - เพราะมี use case หลากหลาย
  // (จ่ายแบ่งงวด, หัก WHT, มัดจำ, จ่ายรวมหลายบิล ฯลฯ)
  // ให้ user ตรวจสอบเอง

  // เลือกบัญชีที่ดีที่สุด
  const bestAccountDoc = results.reduce((best, current) => {
    if (!current.account.id) return best;
    if (!best) return current;
    return (current.account.confidence || 0) > (best.account.confidence || 0) ? current : best;
  }, null as ReceiptAnalysisResult | null);

  if (bestAccountDoc && bestAccountDoc.account.id) {
    result.account = bestAccountDoc.account;
    result.accountAlternatives = bestAccountDoc.accountAlternatives;
  }

  // คำนวณ confidence เฉลี่ย
  result.confidence = {
    overall: Math.round(results.reduce((sum, r) => sum + r.confidence.overall, 0) / results.length),
    vendor: Math.round(results.reduce((sum, r) => sum + r.confidence.vendor, 0) / results.length),
    amount: Math.round(results.reduce((sum, r) => sum + r.confidence.amount, 0) / results.length),
    date: Math.round(results.reduce((sum, r) => sum + r.confidence.date, 0) / results.length),
    account: Math.round(results.reduce((sum, r) => sum + r.confidence.account, 0) / results.length),
  };

  return result;
}
