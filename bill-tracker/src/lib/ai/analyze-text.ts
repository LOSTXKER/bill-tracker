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
import { parseAIJsonResponse } from "./utils/parse-ai-json";
import { findBestMatchingContact } from "@/lib/utils/string-similarity";
import { createLogger } from "@/lib/utils/logger";
import { autoCreateAccount } from "./receipt-matcher";
import type {
  AccountAlternative,
  AnalyzedAccount,
  ReceiptAnalysisResult,
} from "./types";

/** Shape of JSON returned by the text-analysis prompt (best-effort; validated at runtime). */
interface TextAnalysisAIResponse {
  vendor?: {
    name?: string;
    taxId?: string;
    matchedContactId?: string;
    matchedContactName?: string;
  };
  account?: {
    id?: string;
    code?: string;
    name?: string;
    confidence?: number;
    reason?: string;
  } | null;
  newAccount?: {
    code?: string;
    name?: string;
    class?: string;
    reason?: string;
  } | null;
  category?: {
    id?: string;
    name?: string;
    groupName?: string;
    confidence?: number;
    reason?: string;
  } | null;
  newCategory?: {
    name: string;
    parentName: string;
    reason?: string;
  };
  accountAlternatives?: Array<{
    id?: string;
    code?: string;
    name?: string;
    confidence?: number;
    reason?: string;
  }>;
  date?: string | null;
  amount?: number;
  vatRate?: number | null;
  vatAmount?: number;
  wht?: { rate?: number | null; amount?: number | null; type?: string | null };
  netAmount?: number;
  invoiceNumber?: string | null;
  currency?: string;
  items?: unknown[];
  description?: string;
  confidence?: {
    overall?: number;
    vendor?: number;
    amount?: number;
    date?: number;
    account?: number;
  };
}

const log = createLogger("ai-text");

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
    const [accounts, contacts, categories, company] = await Promise.all([
      fetchAccounts(companyId, transactionType),
      fetchContacts(companyId),
      fetchCategories(companyId, transactionType),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, taxId: true },
      }),
    ]);

    // 2. สร้าง Prompt
    const prompt = buildTextAnalysisPrompt(accounts, contacts, categories, transactionType, company, text);

    // 3. วิเคราะห์ข้อความ
    const response = await generateText(prompt, {
      temperature: 0.1,
      maxTokens: 4096,
    });

    if (response.error) {
      log.error("AI analysis error", response.error);
      return { error: "AI ไม่สามารถวิเคราะห์ได้: " + response.error };
    }

    return parseAIResponse(response.data, accounts, contacts, company?.taxId, companyId, categories);

  } catch (error) {
    log.error("analyzeText error", error);
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

async function fetchCategories(companyId: string, transactionType: "EXPENSE" | "INCOME") {
  const groups = await prisma.transactionCategory.findMany({
    where: { companyId, type: transactionType, parentId: null, isActive: true },
    include: {
      Children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }],
        select: { id: true, name: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }],
  });
  return groups;
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
  categories: { id: string; name: string; Children: { id: string; name: string }[] }[],
  transactionType: "EXPENSE" | "INCOME",
  company: { name: string; taxId: string | null } | null,
  inputText: string
): string {
  const accountList = accounts
    .map(a => `- ${a.code} | ${a.name} | ID: ${a.id}`)
    .join("\n");

  const categoryList = categories
    .map(g => `[${g.name}]\n${g.Children.map(c => `  - ${c.name} | ID: ${c.id}`).join("\n")}`)
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

## หมวดหมู่ (กลุ่ม > หมวดย่อย)
${categoryList}

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

3. **เลือกหมวดหมู่ (category)**
   - เลือกหมวดย่อยที่เหมาะสมที่สุดจากรายการหมวดหมู่ข้างบน
   - ใส่ id และ name ของหมวดย่อยที่เลือก
   - **⚠️ ถ้าไม่มีหมวดย่อยไหนเหมาะสม** → ใส่ category = null และใส่ newCategory แทน พร้อมชื่อกลุ่ม (parentName) ที่จะสร้างภายใต้

4. **เลือกบัญชี (ถ้ามี)**
   - เลือกบัญชีที่เหมาะสมที่สุดจากผังบัญชี (ไม่บังคับ)
   - ใส่ทั้ง id, code, name
   - เลือกทางเลือกอื่นอีก 2 บัญชี
   - **⚠️ ถ้าไม่มีบัญชีไหนในรายการที่เหมาะสมเลย** → ใส่ account = null และใส่ newAccount แทน พร้อมแนะนำรหัสบัญชี ชื่อ และประเภท (class) ที่เหมาะสม
   - class ที่ใช้ได้: ${transactionType === "EXPENSE" ? "EXPENSE, COST_OF_SALES, OTHER_EXPENSE" : "REVENUE, OTHER_INCOME"}

5. **สรุปรายการ**
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
  "category": {
    "id": "ID ของหมวดย่อยที่เลือก",
    "name": "ชื่อหมวดย่อย",
    "groupName": "ชื่อกลุ่ม",
    "confidence": 85,
    "reason": "เหตุผลที่เลือก"
  },
  "newCategory": null,
  "account": {
    "id": "ID ของบัญชีที่เลือก",
    "code": "รหัสบัญชี",
    "name": "ชื่อบัญชี",
    "confidence": 85,
    "reason": "เหตุผลที่เลือก"
  },
  "newAccount": null,
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

## หมายเหตุเรื่อง newCategory
- ใส่ newCategory เฉพาะเมื่อไม่มีหมวดย่อยในรายการที่เหมาะสมเลย
- ถ้าต้องสร้างหมวดใหม่ ให้ category = null และ:
  "newCategory": { "name": "ชื่อหมวดย่อยใหม่", "parentName": "ชื่อกลุ่มที่จะสร้างภายใต้", "reason": "เหตุผล" }
- parentName ต้องตรงกับชื่อกลุ่มที่มีอยู่แล้วในรายการหมวดหมู่

## หมายเหตุเรื่อง newAccount
- ใส่ newAccount เฉพาะเมื่อไม่มีบัญชีในรายการที่เหมาะสมเลย (ถ้ามีบัญชีที่ใกล้เคียง ให้เลือกบัญชีนั้นแทน)
- ถ้าต้องสร้างบัญชีใหม่ ให้ account = null และ:
  "newAccount": { "code": "5XXX-XX", "name": "ชื่อบัญชีใหม่", "class": "EXPENSE", "reason": "เหตุผล" }
- รหัสบัญชี (code) ควรเป็นรูปแบบเดียวกับที่มีในระบบ (ดูจากรายการข้างบน)

## หมายเหตุอื่นๆ
- ถ้าข้อมูลไม่ครบ ให้ใส่ null แทน
- ถ้าวันที่เป็น พ.ศ. ให้แปลงเป็น ค.ศ. (ลบ 543)
- VAT rate ในไทยคือ 0% หรือ 7%
- ถ้าไม่แน่ใจว่าเป็นค่าอะไร ให้ดูจาก context และเลือกบัญชีที่เหมาะสมที่สุด`;
}

// =============================================================================
// Response Parsing
// =============================================================================

async function parseAIResponse(
  rawResponse: string,
  accounts: { id: string; code: string; name: string }[],
  contacts: { id: string; name: string; taxId: string | null }[],
  companyTaxId: string | null = null,
  companyId: string | null = null,
  categories: { id: string; name: string; Children: { id: string; name: string }[] }[] = []
): Promise<ReceiptAnalysisResult> {
  try {
    let parsed = parseAIJsonResponse(rawResponse) as TextAnalysisAIResponse | TextAnalysisAIResponse[];

    // AI sometimes returns an array when given multiple items; use the first element
    if (Array.isArray(parsed)) {
      log.debug("AI returned array, using first element", { arrayLength: parsed.length });
      parsed = parsed[0] ?? ({} as TextAnalysisAIResponse);
    }

    log.debug("Parsed AI response category", {
      categoryId: parsed.category?.id,
      categoryName: parsed.category?.name,
      groupName: parsed.category?.groupName,
      newCategory: parsed.newCategory,
    });

    // Helper: Find account by ID, code, or name
    const findAccount = (
      aiAccount: { id?: string; code?: string; name?: string } | null | undefined
    ) => {
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
    let account: AnalyzedAccount = { id: null, code: null, name: null };
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

    // If no existing account matched and AI suggested a new one, auto-create it
    if (!account.id && parsed.newAccount?.code && parsed.newAccount?.name && companyId) {
      const created = await autoCreateAccount(companyId, parsed.newAccount);
      if (created) {
        account = {
          id: created.id,
          code: created.code,
          name: created.name,
          confidence: parsed.account?.confidence || parsed.confidence?.account || 70,
          reason: parsed.newAccount.reason || "AI สร้างบัญชีใหม่อัตโนมัติ",
          isNewAccount: true,
        };
        log.debug("Auto-created new account", { code: created.code, name: created.name });
      }
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

    // Resolve category
    let categoryResult: { categoryId: string | null; categoryName: string | null; groupName: string | null; confidence: number; reason: string; isNew?: boolean } = {
      categoryId: null, categoryName: null, groupName: null, confidence: 0, reason: "",
    };

    const allCategoryChildren = categories.flatMap(g =>
      g.Children.map(c => ({ ...c, groupName: g.name, groupId: g.id }))
    );

    // 1) Match by child ID
    if (parsed.category?.id) {
      const found = allCategoryChildren.find(c => c.id === parsed.category!.id);
      if (found) {
        categoryResult = {
          categoryId: found.id, categoryName: found.name, groupName: found.groupName,
          confidence: parsed.category.confidence || 80, reason: parsed.category.reason || "AI จำแนก",
        };
      }
    }

    // 2) AI might return a parent group ID instead of a child ID
    if (!categoryResult.categoryId && parsed.category?.id) {
      const parentGroup = categories.find(g => g.id === parsed.category!.id);
      if (parentGroup && parentGroup.Children.length > 0) {
        const firstChild = parentGroup.Children[0];
        categoryResult = {
          categoryId: firstChild.id, categoryName: firstChild.name, groupName: parentGroup.name,
          confidence: parsed.category.confidence || 70, reason: parsed.category.reason || "AI จำแนก (กลุ่ม)",
        };
        log.debug("Matched parent group ID, using first child", { group: parentGroup.name, child: firstChild.name });
      }
    }

    // 3) Match by child name
    if (!categoryResult.categoryId && parsed.category?.name) {
      const normalized = parsed.category!.name!.toLowerCase().trim();
      const found = allCategoryChildren.find(c =>
        c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase())
      );
      if (found) {
        categoryResult = {
          categoryId: found.id, categoryName: found.name, groupName: found.groupName,
          confidence: parsed.category.confidence || 75, reason: parsed.category.reason || "AI จำแนก",
        };
      }
    }

    // 4) Match by group name (if AI put group name in category.name)
    if (!categoryResult.categoryId && parsed.category?.name) {
      const normalized = parsed.category!.name!.toLowerCase().trim();
      const parentByName = categories.find(g =>
        g.name.toLowerCase().includes(normalized) || normalized.includes(g.name.toLowerCase())
      );
      if (parentByName && parentByName.Children.length > 0) {
        const firstChild = parentByName.Children[0];
        categoryResult = {
          categoryId: firstChild.id, categoryName: firstChild.name, groupName: parentByName.name,
          confidence: parsed.category.confidence || 65, reason: parsed.category.reason || "AI จำแนก (จากกลุ่ม)",
        };
        log.debug("Matched parent group by name, using first child", { group: parentByName.name });
      }
    }

    // 5) Match by groupName field
    if (!categoryResult.categoryId && parsed.category?.groupName) {
      const groupNorm = parsed.category.groupName.toLowerCase().trim();
      const catName = (parsed.category.name || "").toLowerCase().trim();
      const parentByGroupName = categories.find(g =>
        g.name.toLowerCase().includes(groupNorm) || groupNorm.includes(g.name.toLowerCase())
      );
      if (parentByGroupName) {
        const childMatch = catName
          ? parentByGroupName.Children.find(c =>
              c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase())
            )
          : null;
        const child = childMatch || parentByGroupName.Children[0];
        if (child) {
          categoryResult = {
            categoryId: child.id, categoryName: child.name, groupName: parentByGroupName.name,
            confidence: parsed.category.confidence || 60, reason: parsed.category.reason || "AI จำแนก",
          };
        }
      }
    }

    if (!categoryResult.categoryId) {
      log.debug("Category resolution failed", {
        aiCategory: parsed.category ? { id: parsed.category.id, name: parsed.category.name, groupName: parsed.category.groupName } : null,
        aiNewCategory: parsed.newCategory,
        childrenCount: allCategoryChildren.length,
        groupCount: categories.length,
      });
    }

    // Auto-create category if AI suggested a new one
    if (!categoryResult.categoryId && parsed.newCategory?.name && parsed.newCategory?.parentName && companyId) {
      const newCatData = parsed.newCategory!;
      const parentGroup = categories.find(g =>
        g.name.toLowerCase().includes(newCatData.parentName.toLowerCase()) ||
        newCatData.parentName.toLowerCase().includes(g.name.toLowerCase())
      );
      if (parentGroup) {
        try {
          const transactionType = categories.length > 0 ? await prisma.transactionCategory.findUnique({
            where: { id: parentGroup.id },
            select: { type: true },
          }) : null;

          const newCat = await prisma.transactionCategory.create({
            data: {
              companyId,
              name: newCatData.name,
              type: transactionType?.type || "EXPENSE",
              parentId: parentGroup.id,
              sortOrder: parentGroup.Children.length,
            },
          });
          categoryResult = {
            categoryId: newCat.id, categoryName: newCat.name, groupName: parentGroup.name,
            confidence: 70, reason: newCatData.reason || "AI สร้างหมวดใหม่", isNew: true,
          };
          log.debug("Auto-created new category", { name: newCat.name, group: parentGroup.name });
        } catch (err) {
          log.warn("Failed to auto-create category", { error: err });
        }
      }
    }

    // Validate contact
    let matchedContactId: string | null = null;
    let matchedContactName: string | null = null;
    
    const vendorMatchedId = parsed.vendor?.matchedContactId;
    if (vendorMatchedId) {
      const matchedContact = contacts.find(c => c.id === vendorMatchedId);
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
        log.debug("Contact matched by taxId", { name: foundByTaxId.name });
      }
    }

    // ถ้ายังไม่ match และมีชื่อ vendor → ลองหาด้วย fuzzy name matching
    // (รองรับกรณีชื่อมี/ไม่มีคำนำหน้า เช่น "น.ส.กฤติกา ดวงใจ" vs "กฤติกา ดวงใจ")
    if (!matchedContactId && parsed.vendor?.name) {
      const foundByName = findBestMatchingContact(parsed.vendor.name, contacts, 0.85);
      if (foundByName) {
        matchedContactId = foundByName.id;
        matchedContactName = foundByName.name;
        log.debug("Contact matched by fuzzy name", { original: parsed.vendor.name, matched: foundByName.name });
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
      vatRate = (parsed.vatAmount ?? 0) > 0 ? 7 : 0;
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
      category: categoryResult.categoryId ? categoryResult : undefined,
      documentType: "TEXT_INPUT",
      invoiceNumber: parsed.invoiceNumber || null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => (typeof item === "string" ? item : String(item)))
        : [],
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
    log.error("parseAIResponse error", error, { rawPreview: rawResponse?.substring(0, 200) });

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
