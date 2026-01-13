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
    const prompt = buildAIPrompt(accounts, transactionType, context);
    
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
  context: SuggestAccountContext
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

  // Build account list with clear formatting
  const accountListText = accounts
    .map((a) => `• ${a.code} - ${a.name}${a.description ? ` (${a.description})` : ""} [ID: ${a.id}]`)
    .join("\n");

  return `คุณเป็นนักบัญชีผู้เชี่ยวชาญ มีความรู้กว้างขวางเกี่ยวกับธุรกิจและแบรนด์ทั่วโลก

## งานของคุณ
ดูข้อมูลร้านค้า/รายการ แล้วเลือกบัญชีที่เหมาะสมที่สุดจากรายการด้านล่าง

## ข้อมูลที่ต้องวิเคราะห์
${contentDescription}

## บัญชี${transactionType === "EXPENSE" ? "ค่าใช้จ่าย" : "รายได้"}ที่มี (เลือก 1 รายการ)
${accountListText}

## วิธีเลือก
1. **อ่านชื่อบัญชีทุกตัว** - ดูว่าตัวไหนตรงกับประเภทร้านค้า/รายการมากที่สุด
2. **ใช้ความรู้ทั่วไป** - คุณรู้จักแบรนด์และบริษัทต่างๆ ทั่วโลก
3. **เลือกบัญชีที่ใกล้เคียงที่สุด** - ถ้าไม่มีตรง 100% ให้เลือกที่ใกล้เคียง

## ตัวอย่างการตัดสินใจ
- "Cursor" → ค่าซอฟต์แวร์/ค่าบริการ (confidence 95%)
- "7-Eleven" → ค่าอาหาร/เครื่องดื่ม/วัสดุสิ้นเปลือง (confidence 90%)
- "การไฟฟ้า" → ค่าสาธารณูปโภค/ค่าไฟฟ้า (confidence 98%)
- "บริษัท XXX จำกัด" → ดูจากบริบท ถ้าไม่ชัดเลือก "ค่าบริการ" (confidence 80%)

## กฎสำคัญ
- **ต้องเลือกบัญชีเสมอ** ถ้ามีบัญชีที่พอจะใช้ได้
- **Confidence 85-98%** ถ้าเลือกได้ตรงหรือใกล้เคียง
- **Confidence 70-84%** เฉพาะเมื่อไม่มีบัญชีที่ตรงเลย แต่พอจะใส่ได้
- **suggestNewAccount** ใช้เฉพาะเมื่อไม่มีบัญชีที่เหมาะสมเลยจริงๆ

## ตอบ JSON
{
  "accountId": "ID ของบัญชีที่เลือก",
  "accountCode": "รหัสบัญชี 6 หลัก",
  "accountName": "ชื่อบัญชี",
  "confidence": 85,
  "reason": "เหตุผลสั้นๆ ภาษาไทย",
  "suggestNewAccount": null
}`;
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

  try {
    const result = JSON.parse(jsonText);
    
    // Validate accountId exists
    const matchedAccount = accounts.find((a) => a.id === result.accountId);
    
    if (matchedAccount) {
      return {
        accountId: result.accountId,
        accountCode: matchedAccount.code,
        accountName: matchedAccount.name,
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        reason: result.reason || "AI วิเคราะห์",
        source: "ai",
        suggestNewAccount: result.suggestNewAccount || undefined,
      };
    }

    // No valid account found
    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: result.confidence || 0,
      reason: result.reason || "ไม่พบบัญชีที่เหมาะสม",
      source: "ai",
      suggestNewAccount: result.suggestNewAccount || undefined,
    };

  } catch {
    console.error("[parseAIResponse] Failed to parse:", jsonText);
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
