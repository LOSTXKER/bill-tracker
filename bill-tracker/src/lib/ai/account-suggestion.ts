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

export interface AccountSuggestionItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
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
  // Multiple suggestions for user to choose
  alternatives?: AccountSuggestionItem[];
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

## บัญชีที่มี
${accountListText}

## กฎ
- **เลือก 3 บัญชีที่เหมาะสมที่สุด** เรียงจากดีที่สุดไปน้อยที่สุด
- **ดูจากธุรกิจ** - ถ้าไม่ใช่ธุรกิจซื้อมาขายไป อย่าเลือกบัญชีต้นทุนสินค้า
- **Copy ID ให้ถูกต้อง** - เอา ID หลัง "→ ID:" มาใส่

## ตอบ JSON (array ของ 3 ตัวเลือก)
{"suggestions":[{"accountId":"ID","accountCode":"รหัส","accountName":"ชื่อ","confidence":95,"reason":"เหตุผล"},{"accountId":"ID2","accountCode":"รหัส2","accountName":"ชื่อ2","confidence":80,"reason":"เหตุผล2"},{"accountId":"ID3","accountCode":"รหัส3","accountName":"ชื่อ3","confidence":60,"reason":"เหตุผล3"}]}`;
}

function matchAccount(
  suggestion: { accountId?: string; accountCode?: string; accountName?: string },
  accounts: { id: string; code: string; name: string }[]
): { id: string; code: string; name: string } | null {
  // 1. Match by exact accountId
  let matched = accounts.find((a) => a.id === suggestion.accountId);
  
  // 2. Match by accountCode if accountId didn't work
  if (!matched && suggestion.accountCode) {
    matched = accounts.find((a) => a.code === suggestion.accountCode);
  }
  
  // 3. Match by accountName if still no match
  if (!matched && suggestion.accountName) {
    matched = accounts.find((a) => 
      a.name === suggestion.accountName || 
      a.name.includes(suggestion.accountName || "") ||
      (suggestion.accountName || "").includes(a.name)
    );
  }
  
  // 4. Fuzzy match by name similarity
  if (!matched && suggestion.accountName) {
    const nameWords = suggestion.accountName.toLowerCase().split(/[\s/]+/);
    for (const account of accounts) {
      const accountWords = account.name.toLowerCase().split(/[\s/]+/);
      const overlap = nameWords.filter((w: string) => accountWords.some((aw: string) => aw.includes(w) || w.includes(aw)));
      if (overlap.length >= 1) {
        matched = account;
        break;
      }
    }
  }
  
  return matched || null;
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
    
    // Handle new format with multiple suggestions
    const suggestions = result.suggestions || [result];
    const validSuggestions: AccountSuggestionItem[] = [];
    
    for (const suggestion of suggestions) {
      const matched = matchAccount(suggestion, accounts);
      if (matched) {
        validSuggestions.push({
          accountId: matched.id,
          accountCode: matched.code,
          accountName: matched.name,
          confidence: Math.max(0, Math.min(100, suggestion.confidence || 85)),
          reason: suggestion.reason || "AI วิเคราะห์",
        });
      }
    }
    
    // Remove duplicates
    const uniqueSuggestions = validSuggestions.filter(
      (s, i, arr) => arr.findIndex(x => x.accountId === s.accountId) === i
    );
    
    if (uniqueSuggestions.length > 0) {
      const primary = uniqueSuggestions[0];
      return {
        accountId: primary.accountId,
        accountCode: primary.accountCode,
        accountName: primary.accountName,
        confidence: primary.confidence,
        reason: primary.reason,
        source: "ai",
        alternatives: uniqueSuggestions.slice(1), // Other options
        suggestNewAccount: result.suggestNewAccount || undefined,
      };
    }

    // No valid account found
    console.log("[parseAIResponse] AI response did not match any account:", {
      suggestions: suggestions.slice(0, 3),
      availableAccounts: accounts.map(a => `${a.code}: ${a.name}`).slice(0, 5),
    });

    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "ไม่พบบัญชีที่เหมาะสม",
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
