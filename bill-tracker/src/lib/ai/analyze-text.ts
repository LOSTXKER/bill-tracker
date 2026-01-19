/**
 * 🧠 AI Text Analyzer - วิเคราะห์ข้อความเพื่อดึงข้อมูลรายการ
 * 
 * Use case:
 * - Copy ข้อความจาก Line/SMS/Email มาวาง
 * - พิมพ์รายละเอียดเอง
 * - ไม่มีเอกสารแต่จำรายละเอียดได้
 */

import { prisma } from "@/lib/db";
import { generateText } from "./gemini";
import { findBestMatchingContact } from "@/lib/utils/string-similarity";
import type { ReceiptAnalysisResult } from "./types";

export interface TextAnalysisInput {
  text: string;
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
}

// =============================================================================
// Main Function
// =============================================================================

export async function analyzeText(
  input: TextAnalysisInput
): Promise<ReceiptAnalysisResult | { error: string }> {
  const { text, companyId, transactionType } = input;

  if (!text || text.trim().length === 0) {
    return { error: "ไม่มีข้อความ" };
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

    // 2. สร้าง Prompt
    const prompt = buildTextAnalysisPrompt(accounts, contacts, transactionType, company, text);

    // 3. วิเคราะห์ข้อความ
    const response = await generateText(prompt, {
      temperature: 0.1,
      maxTokens: 4096,
    });

    if (response.error) {
      console.error("[analyzeText] AI error:", response.error);
      return { error: "AI ไม่สามารถวิเคราะห์ได้: " + response.error };
    }

    return parseAIResponse(response.data, accounts, contacts, company?.taxId);

  } catch (error) {
    console.error("[analyzeText] Error:", error);
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
// Prompt Builder
// =============================================================================

function buildTextAnalysisPrompt(
  accounts: { id: string; code: string; name: string; description: string | null }[],
  contacts: { id: string; name: string; taxId: string | null }[],
  transactionType: "EXPENSE" | "INCOME",
  company: { name: string; taxId: string | null } | null,
  inputText: string
): string {
  // สร้างรายการบัญชี
  const accountList = accounts
    .map(a => `- ${a.code} | ${a.name} | ID: ${a.id}`)
    .join("\n");

  // สร้างรายการผู้ติดต่อ
  const contactList = contacts.length > 0
    ? contacts.map(c => `- ${c.name}${c.taxId ? ` (${c.taxId})` : ""} | ID: ${c.id}`).join("\n")
    : "(ไม่มีผู้ติดต่อในระบบ)";

  return `คุณเป็นนักบัญชีผู้เชี่ยวชาญ วิเคราะห์ข้อความนี้แล้วดึงข้อมูลรายการทางการเงิน ตอบเป็น JSON

## ข้อความที่ต้องวิเคราะห์
"""
${inputText}
"""

## ข้อมูลบริษัทของเรา
- ชื่อ: ${company?.name || "ไม่ระบุ"}
- เลขภาษี: ${company?.taxId || "ไม่ระบุ"}

## ประเภทรายการ: ${transactionType === "EXPENSE" ? "รายจ่าย (เราเป็นผู้ซื้อ/จ่ายเงิน)" : "รายรับ (เราเป็นผู้ขาย/รับเงิน)"}

## ผังบัญชีที่มี
${accountList}

## รายชื่อผู้ติดต่อที่มีในระบบ
${contactList}

## สิ่งที่ต้องทำ

1. **หาผู้ขาย/ผู้ติดต่อ** 
   - ${transactionType === "EXPENSE" ? "หาชื่อร้าน/บริษัท/คนที่เราจ่ายเงินให้" : "หาชื่อลูกค้าที่จ่ายเงินให้เรา"}
   - ตรวจสอบว่ามีในรายชื่อผู้ติดต่อข้างบนหรือไม่
   - ถ้าพบ → ใส่ matchedContactId
   - ถ้าไม่พบ → matchedContactId = null

2. **ดึงข้อมูลการเงิน**
   - ยอดเงิน (amount) - ถ้าเป็นยอดรวม VAT ให้คำนวณแยก
   - VAT (vatAmount, vatRate) - ถ้าไม่ระบุให้ใส่ null
   - หัก ณ ที่จ่าย (whtRate, whtAmount) - ถ้าไม่ระบุให้ใส่ null
   - สกุลเงิน (currency) - default THB
   - วันที่ (date) - ถ้าไม่ระบุให้ใส่ null

3. **เลือกบัญชี**
   - เลือกบัญชีที่เหมาะสมที่สุดจากรายการข้างบน
   - ใส่ทั้ง id, code, name
   - เลือกทางเลือกอื่นอีก 2 บัญชี

4. **สรุปรายการ**
   - เขียน description สั้นๆ ว่าค่าอะไร

## ตอบ JSON เท่านั้น (ห้ามมี text อื่น)
{
  "vendor": {
    "name": "ชื่อผู้ขาย/ผู้ติดต่อ หรือ null ถ้าไม่ทราบ",
    "taxId": "เลขภาษี 13 หลัก หรือ null",
    "matchedContactId": "ID ของผู้ติดต่อที่ match หรือ null",
    "matchedContactName": "ชื่อผู้ติดต่อที่ match หรือ null"
  },
  "date": "YYYY-MM-DD หรือ null",
  "currency": "THB",
  "amount": 1000.00,
  "vatAmount": 70.00,
  "vatRate": 7,
  "wht": {
    "rate": null,
    "amount": null,
    "type": null
  },
  "netAmount": 1070.00,
  "account": {
    "id": "ID ของบัญชีที่เลือก",
    "code": "รหัสบัญชี",
    "name": "ชื่อบัญชี",
    "confidence": 85,
    "reason": "เหตุผลที่เลือก"
  },
  "accountAlternatives": [
    { "id": "ID", "code": "รหัส", "name": "ชื่อ", "confidence": 70, "reason": "เหตุผล" }
  ],
  "invoiceNumber": "เลขที่เอกสาร หรือ null",
  "items": ["รายการที่ 1"],
  "description": "สรุปสั้นๆ ว่าค่าอะไร",
  "confidence": {
    "overall": 80,
    "vendor": 70,
    "amount": 95,
    "date": 50,
    "account": 80
  }
}

## หมายเหตุ
- ถ้าข้อมูลไม่ครบ ให้ใส่ null แทน
- ถ้าวันที่เป็น พ.ศ. ให้แปลงเป็น ค.ศ. (ลบ 543)
- VAT rate ในไทยคือ 0% หรือ 7%
- ถ้าไม่แน่ใจว่าเป็นค่าอะไร ให้ดูจาก context และเลือกบัญชีที่เหมาะสมที่สุด`;
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

    // Helper: Find account by ID, code, or name
    const findAccount = (aiAccount: { id?: string; code?: string; name?: string } | null) => {
      if (!aiAccount) return null;
      
      if (aiAccount.id) {
        const byId = accounts.find(a => a.id === aiAccount.id);
        if (byId) return byId;
      }
      
      if (aiAccount.code) {
        const byCode = accounts.find(a => a.code === aiAccount.code);
        if (byCode) return byCode;
      }
      
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
    let account: any = { id: null, code: null, name: null };
    const matchedAccount = findAccount(parsed.account);
    
    if (matchedAccount) {
      account = {
        id: matchedAccount.id,
        code: matchedAccount.code,
        name: matchedAccount.name,
        confidence: parsed.account?.confidence || 0,
        reason: parsed.account?.reason || "AI วิเคราะห์จากข้อความ",
      };
    }

    // Parse account alternatives
    const accountAlternatives: any[] = [];
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

    // Validate contact
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
        console.log("[AI Text] Contact matched by taxId:", foundByTaxId.name);
      }
    }

    // ถ้ายังไม่ match และมีชื่อ vendor → ลองหาด้วย fuzzy name matching
    // (รองรับกรณีชื่อมี/ไม่มีคำนำหน้า เช่น "น.ส.กฤติกา ดวงใจ" vs "กฤติกา ดวงใจ")
    if (!matchedContactId && parsed.vendor?.name) {
      const foundByName = findBestMatchingContact(parsed.vendor.name, contacts, 0.85);
      if (foundByName) {
        matchedContactId = foundByName.id;
        matchedContactName = foundByName.name;
        console.log("[AI Text] Contact matched by fuzzy name:", parsed.vendor.name, "→", foundByName.name);
      }
    }

    // Normalize date
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
    if (vatRate !== 0 && vatRate !== 7 && vatRate !== null) {
      vatRate = parsed.vatAmount > 0 ? 7 : 0;
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
        taxId: parsed.vendor?.taxId || null,
        address: null,
        phone: null,
        branchNumber: null,
        matchedContactId,
        matchedContactName,
      },
      date: normalizedDate || null,
      currency,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      vatAmount: typeof parsed.vatAmount === "number" ? parsed.vatAmount : null,
      vatRate,
      wht: {
        rate: parsed.wht?.rate || null,
        amount: typeof parsed.wht?.amount === "number" ? parsed.wht.amount : null,
        type: parsed.wht?.type || null,
      },
      netAmount: typeof parsed.netAmount === "number" ? parsed.netAmount : null,
      account,
      accountAlternatives: accountAlternatives.slice(0, 2),
      documentType: "TEXT_INPUT",
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
      rawText: rawResponse,
    };
  }
}
