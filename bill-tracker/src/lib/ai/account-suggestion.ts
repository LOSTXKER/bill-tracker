/**
 * Account Suggestion Service
 * Single unified function for AI-powered account suggestions
 */

import { prisma } from "@/lib/db";
import { findMapping, normalizeVendorName } from "./vendor-mapping";
import { analyzeImage } from "./gemini";

// =============================================================================
// Types
// =============================================================================

export interface SuggestNewAccount {
  code: string;
  name: string;
  class: string;
  description: string;
  keywords: string[];
  reason: string;
}

export interface AccountSuggestion {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  confidence: number;
  reason: string;
  source: "learned" | "ai" | "none";
  useCount?: number;
  suggestNewAccount?: SuggestNewAccount;
}

export interface SuggestAccountContext {
  vendorName?: string | null;
  vendorTaxId?: string | null;
  description?: string | null;
  items?: string[];
  imageUrls?: string[];
}

// =============================================================================
// Main Function - One Smart Entry Point
// =============================================================================

/**
 * Suggest the best account for a transaction
 * 
 * Flow:
 * 1. Check learned mappings first (highest confidence)
 * 2. If not found, use AI to analyze (medium-high confidence)
 * 3. If no good match, suggest creating new account
 */
export async function suggestAccount(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  context: SuggestAccountContext
): Promise<AccountSuggestion> {
  // Step 1: Check learned mappings (user-taught)
  const mappingResult = await checkLearnedMappings(
    companyId,
    context.vendorName,
    context.vendorTaxId,
    transactionType
  );
  
  if (mappingResult) {
    return mappingResult;
  }

  // Step 2: Use AI to analyze
  const aiResult = await analyzeWithAI(companyId, transactionType, context);
  
  return aiResult;
}

// =============================================================================
// Step 1: Check Learned Mappings
// =============================================================================

async function checkLearnedMappings(
  companyId: string,
  vendorName: string | null | undefined,
  vendorTaxId: string | null | undefined,
  transactionType: "EXPENSE" | "INCOME"
): Promise<AccountSuggestion | null> {
  if (!vendorName && !vendorTaxId) {
    return null;
  }

  const mapping = await findMapping(
    companyId,
    vendorName || null,
    vendorTaxId || null,
    transactionType
  );

  if (mapping && mapping.accountId && mapping.account) {
    return {
      accountId: mapping.accountId,
      accountCode: mapping.account.code,
      accountName: mapping.account.name,
      confidence: 100, // Learned mappings are always 100% confident
      reason: `จดจำจาก "${mapping.vendorName || vendorName}" (ใช้งาน ${mapping.useCount} ครั้ง)`,
      source: "learned",
      useCount: mapping.useCount,
    };
  }

  return null;
}

// =============================================================================
// Step 2: AI Analysis
// =============================================================================

async function analyzeWithAI(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  context: SuggestAccountContext
): Promise<AccountSuggestion> {
  try {
    // Get company info including business description
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { businessDescription: true },
    });

    // Get accounts for this company
    const accountClasses = transactionType === "EXPENSE"
      ? ["COST_OF_SALES", "EXPENSE", "OTHER_EXPENSE"]
      : ["REVENUE", "OTHER_INCOME"];

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        class: { in: accountClasses as any },
        isActive: true,
      },
      orderBy: { code: "asc" },
    });

    if (accounts.length === 0) {
      return {
        accountId: null,
        accountCode: null,
        accountName: null,
        confidence: 0,
        reason: "ไม่มีบัญชีในระบบ",
        source: "none",
      };
    }

    // Build prompt for AI
    const prompt = buildAIPrompt(accounts, transactionType, context, company?.businessDescription);
    
    if (!prompt) {
      return {
        accountId: null,
        accountCode: null,
        accountName: null,
        confidence: 0,
        reason: "ไม่มีข้อมูลเพียงพอ",
        source: "none",
      };
    }

    // Call AI
    let response;
    if (context.imageUrls && context.imageUrls.length > 0) {
      response = await analyzeImage(context.imageUrls[0], prompt, {
        temperature: 0.2, // Lower temperature for more consistent results
        maxTokens: 1024,
      });
    } else {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      response = { data: result.response.text(), error: null };
    }

    if (response.error) {
      console.error("[suggestAccount] AI error:", response.error);
      return {
        accountId: null,
        accountCode: null,
        accountName: null,
        confidence: 0,
        reason: "AI ไม่สามารถวิเคราะห์ได้",
        source: "none",
      };
    }

    // Parse response
    const parsed = parseAIResponse(response.data, accounts);
    return parsed;

  } catch (error) {
    console.error("[suggestAccount] Error:", error);
    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "เกิดข้อผิดพลาด",
      source: "none",
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildAIPrompt(
  accounts: { id: string; code: string; name: string; description: string | null }[],
  transactionType: "EXPENSE" | "INCOME",
  context: SuggestAccountContext,
  businessDescription?: string | null
): string | null {
  // Build content description
  let contentDescription = "";
  if (context.vendorName) {
    contentDescription += `ร้านค้า/บริษัท: ${context.vendorName}\n`;
  }
  if (context.description) {
    contentDescription += `รายละเอียด: ${context.description}\n`;
  }
  if (context.items && context.items.length > 0) {
    contentDescription += `รายการ: ${context.items.join(", ")}\n`;
  }

  if (!contentDescription.trim()) {
    return null;
  }

  // Build account list as a numbered JSON-like structure for easier AI matching
  const accountList = accounts.map((a, idx) => ({
    index: idx + 1,
    id: a.id,
    code: a.code,
    name: a.name,
    desc: a.description || "",
  }));

  const accountListText = accountList
    .map((a) => `${a.index}. [${a.code}] ${a.name}${a.desc ? ` - ${a.desc}` : ""} → ID: "${a.id}"`)
    .join("\n");

  // Use business description if available, otherwise default context
  const businessInfo = businessDescription 
    ? `ธุรกิจของบริษัท: ${businessDescription}`
    : null;

  const transactionContext = transactionType === "EXPENSE" 
    ? `นี่คือ "รายจ่าย" ของบริษัท`
    : `นี่คือ "รายรับ" ของบริษัท`;

  return `คุณเป็น AI ที่ฉลาดมาก รู้จักแบรนด์ สินค้า และบริการทั่วโลก

## บริบทธุรกิจ
${businessInfo ? businessInfo + "\n" : ""}${transactionContext}

## รายการที่ต้องจัดหมวดหมู่
${contentDescription}

## บัญชีที่มี (ต้องเลือก 1 รายการ)
${accountListText}

## กฎ
- **ต้องเลือกบัญชีเสมอ** - ใช้ความรู้ของคุณตัดสินว่ารายการนี้ควรอยู่บัญชีไหน
- **ดูจากธุรกิจ** - ถ้าไม่ใช่ธุรกิจซื้อมาขายไป อย่าเลือกบัญชีต้นทุนสินค้า
- **Copy ID ให้ถูกต้อง** - เอา ID หลัง "→ ID:" มาใส่

## ตอบ JSON
{"accountId":"ID_จากรายการ","accountCode":"รหัส","accountName":"ชื่อ","confidence":90,"reason":"เหตุผลสั้นๆ"}`;
}

function parseAIResponse(
  rawResponse: string,
  accounts: { id: string; code: string; name: string }[]
): AccountSuggestion {
  let jsonText = rawResponse.trim();
  
  // Remove markdown code blocks
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
  }
  
  // Also handle trailing text after JSON
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    const result = JSON.parse(jsonText);
    
    // Try multiple matching strategies:
    // 1. Match by exact accountId
    let matchedAccount = accounts.find((a) => a.id === result.accountId);
    
    // 2. Match by accountCode if accountId didn't work
    if (!matchedAccount && result.accountCode) {
      matchedAccount = accounts.find((a) => a.code === result.accountCode);
    }
    
    // 3. Match by accountName if still no match
    if (!matchedAccount && result.accountName) {
      matchedAccount = accounts.find((a) => 
        a.name === result.accountName || 
        a.name.includes(result.accountName) ||
        result.accountName.includes(a.name)
      );
    }
    
    // 4. Fuzzy match by name similarity
    if (!matchedAccount && result.accountName) {
      const nameWords = result.accountName.toLowerCase().split(/[\s/]+/);
      for (const account of accounts) {
        const accountWords = account.name.toLowerCase().split(/[\s/]+/);
        const overlap = nameWords.filter((w: string) => accountWords.some((aw: string) => aw.includes(w) || w.includes(aw)));
        if (overlap.length >= 1) {
          matchedAccount = account;
          break;
        }
      }
    }
    
    if (matchedAccount) {
      return {
        accountId: matchedAccount.id,
        accountCode: matchedAccount.code,
        accountName: matchedAccount.name,
        confidence: Math.max(0, Math.min(100, result.confidence || 85)),
        reason: result.reason || "AI วิเคราะห์",
        source: "ai",
        suggestNewAccount: result.suggestNewAccount || undefined,
      };
    }

    // No valid account found - but log what AI said for debugging
    console.log("[parseAIResponse] AI response did not match any account:", {
      aiAccountId: result.accountId,
      aiAccountCode: result.accountCode,
      aiAccountName: result.accountName,
      availableAccounts: accounts.map(a => `${a.code}: ${a.name}`).slice(0, 5),
    });

    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: result.confidence || 0,
      reason: result.reason || "ไม่พบบัญชีที่เหมาะสม",
      source: "ai",
      suggestNewAccount: result.suggestNewAccount || undefined,
    };

  } catch (e) {
    console.error("[parseAIResponse] Failed to parse:", jsonText, e);
    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "ไม่สามารถวิเคราะห์ได้",
      source: "none",
    };
  }
}
