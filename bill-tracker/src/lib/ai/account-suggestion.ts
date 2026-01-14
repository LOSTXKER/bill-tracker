/**
 * Account Suggestion Service - SIMPLIFIED
 * AI เลือก account ให้ทุกครั้ง ไม่ต้อง learn อะไร
 */

import { prisma } from "@/lib/db";
import { analyzeImage } from "./gemini";

// =============================================================================
// Types
// =============================================================================

export interface AccountSuggestion {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  confidence: number;
  reason: string;
}

export interface SuggestAccountContext {
  vendorName?: string | null;
  description?: string | null;
  items?: string[];
  imageUrls?: string[];
}

// =============================================================================
// Main Function - Simple AI Selection
// =============================================================================

/**
 * AI เลือก account ที่เหมาะสมที่สุด
 * ไม่มี learned mappings ไม่มี VendorMapping
 * AI ฉลาดพอ ให้มันทำงาน
 */
export async function suggestAccount(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  context: SuggestAccountContext
): Promise<AccountSuggestion> {
  try {
    // Get company info
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
      };
    }

    // Build simple prompt
    const prompt = buildPrompt(accounts, transactionType, context, company?.businessDescription);
    
    if (!prompt) {
      return {
        accountId: null,
        accountCode: null,
        accountName: null,
        confidence: 0,
        reason: "ไม่มีข้อมูลเพียงพอ",
      };
    }

    // Call AI
    let response;
    if (context.imageUrls && context.imageUrls.length > 0) {
      response = await analyzeImage(context.imageUrls[0], prompt, {
        temperature: 0.1,
        maxTokens: 512,
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
      };
    }

    // Parse response
    return parseResponse(response.data, accounts);

  } catch (error) {
    console.error("[suggestAccount] Error:", error);
    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "เกิดข้อผิดพลาด",
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildPrompt(
  accounts: { id: string; code: string; name: string; description: string | null }[],
  transactionType: "EXPENSE" | "INCOME",
  context: SuggestAccountContext,
  businessDescription?: string | null
): string | null {
  // Build content description
  let content = "";
  if (context.vendorName) content += `ร้าน: ${context.vendorName}\n`;
  if (context.description) content += `รายละเอียด: ${context.description}\n`;
  if (context.items?.length) content += `สินค้า: ${context.items.join(", ")}\n`;

  if (!content.trim()) return null;

  // Build account list
  const accountList = accounts
    .map((a) => `[${a.code}] ${a.name} → ${a.id}`)
    .join("\n");

  const type = transactionType === "EXPENSE" ? "รายจ่าย" : "รายรับ";

  return `เลือกบัญชีที่เหมาะสมที่สุดสำหรับ${type}นี้

${businessDescription ? `ธุรกิจ: ${businessDescription}\n` : ""}
${content}
## บัญชีที่มี
${accountList}

## ตอบ JSON เท่านั้น
{"accountId":"ID ที่เหมาะสม","confidence":85,"reason":"เหตุผลสั้นๆ"}`;
}

function parseResponse(
  rawResponse: string,
  accounts: { id: string; code: string; name: string }[]
): AccountSuggestion {
  try {
    let jsonText = rawResponse.trim();
    
    // Remove markdown code blocks
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    const parsed = JSON.parse(jsonText);
    
    // Find matching account
    const account = accounts.find((a) => a.id === parsed.accountId);
    
    if (account) {
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        confidence: parsed.confidence || 80,
        reason: parsed.reason || "AI แนะนำ",
      };
    }

    // Fallback: try matching by code
    const byCode = accounts.find((a) => parsed.accountId?.includes(a.code));
    if (byCode) {
      return {
        accountId: byCode.id,
        accountCode: byCode.code,
        accountName: byCode.name,
        confidence: parsed.confidence || 70,
        reason: parsed.reason || "AI แนะนำ",
      };
    }

    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "ไม่พบบัญชีที่ตรงกัน",
    };

  } catch (error) {
    console.error("[parseResponse] Error:", error, rawResponse);
    return {
      accountId: null,
      accountCode: null,
      accountName: null,
      confidence: 0,
      reason: "ไม่สามารถแปลผล AI ได้",
    };
  }
}
