/**
 * AI Category Suggestion - lightweight category-only analysis
 *
 * Use case: bulk categorize page needs only a category suggestion,
 * not the full receipt/text analysis pipeline.
 */

import { prisma } from "@/lib/db";
import { generateText } from "./gemini";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("ai-category");

export interface SuggestCategoryInput {
  descriptions: string[];
  companyId: string;
  transactionType: "EXPENSE" | "INCOME";
  companyName?: string;
  businessDescription?: string;
}

export interface SuggestCategoryResult {
  categoryId: string | null;
  categoryName: string;
  groupName: string;
  isNew: boolean;
  reason: string;
  confidence: number;
  suggestNewName?: string;
  suggestNewParent?: string;
}

interface AIResponse {
  categoryId?: string | null;
  categoryName?: string;
  groupName?: string;
  confidence?: number;
  isNew?: boolean;
  newCategoryName?: string | null;
  newCategoryParentName?: string | null;
  reason?: string;
}

/**
 * Extract JSON object from AI response that may contain markdown fences,
 * thinking output, or other surrounding text.
 */
function extractJson(raw: string): AIResponse | null {
  // Strip markdown code fences if present
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const text = fenceMatch ? fenceMatch[1] : raw;

  // Find the first { and its matching } using depth tracking
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as AIResponse;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

interface RecentPattern {
  description: string;
  categoryName: string;
  groupName: string;
}

function buildBusinessContext(companyName?: string, businessDescription?: string): string {
  if (!companyName && !businessDescription) return "";
  const parts = ["## ข้อมูลธุรกิจ"];
  if (companyName) parts.push(`ชื่อบริษัท: ${companyName}`);
  if (businessDescription) parts.push(`ลักษณะธุรกิจ: ${businessDescription}`);
  return "\n" + parts.join("\n") + "\n";
}

function buildHistoryContext(patterns: RecentPattern[]): string {
  if (!patterns.length) return "";
  const lines = patterns.map((p) => `- "${p.description}" → ${p.groupName} > ${p.categoryName}`);
  return `\n## ตัวอย่างการจัดหมวดเดิมของบริษัทนี้ (ให้ใช้เป็นแนวทาง)\n${lines.join("\n")}\n`;
}

async function fetchRecentPatterns(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME"
): Promise<RecentPattern[]> {
  try {
    const where = { companyId, categoryId: { not: null } as const, deletedAt: null };
    const catSelect = { select: { name: true, Parent: { select: { name: true } } } } as const;

    type Row = { desc: string | null; Category: { name: string; Parent: { name: string } | null } | null };

    let rows: Row[];
    if (transactionType === "EXPENSE") {
      const r = await prisma.expense.findMany({
        where, orderBy: { billDate: "desc" }, take: 50,
        select: { description: true, Category: catSelect },
      });
      rows = r.map((x) => ({ desc: x.description, Category: x.Category }));
    } else {
      const r = await prisma.income.findMany({
        where, orderBy: { receiveDate: "desc" }, take: 50,
        select: { source: true, Category: catSelect },
      });
      rows = r.map((x) => ({ desc: x.source, Category: x.Category }));
    }

    const seen = new Set<string>();
    const patterns: RecentPattern[] = [];
    for (const tx of rows) {
      if (!tx.desc || !tx.Category) continue;
      const key = tx.desc.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      patterns.push({
        description: tx.desc,
        categoryName: tx.Category.name,
        groupName: tx.Category.Parent?.name || tx.Category.name,
      });
      if (patterns.length >= 20) break;
    }
    return patterns;
  } catch (err) {
    log.error("fetchRecentPatterns error", err);
    return [];
  }
}

export async function suggestCategory(
  input: SuggestCategoryInput
): Promise<SuggestCategoryResult | { error: string }> {
  const { descriptions, companyId, transactionType, companyName, businessDescription } = input;

  if (!descriptions.length) {
    return { error: "ไม่มีรายการ" };
  }

  try {
    const [categories, recentPatterns] = await Promise.all([
      prisma.transactionCategory.findMany({
        where: { companyId, type: transactionType, parentId: null, isActive: true },
        include: {
          Children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }],
            select: { id: true, name: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }],
      }),
      fetchRecentPatterns(companyId, transactionType),
    ]);

    const categoryList = categories
      .map(
        (g) =>
          `[${g.name}]\n${g.Children.map((c) => `  - ${c.name} | ID: ${c.id}`).join("\n")}`
      )
      .join("\n");

    const descList = descriptions.slice(0, 15).join("\n");

    const businessContext = buildBusinessContext(companyName, businessDescription);
    const historyContext = buildHistoryContext(recentPatterns);

    const txLabel = transactionType === "EXPENSE" ? "ค่าใช้จ่าย" : "รายรับ";

    const prompt = `จัดหมวดหมู่รายการ${txLabel}ด้านล่าง ตอบเป็น JSON เท่านั้น
${businessContext}
## รายการที่ต้องจัดหมวด
${descList}

## หมวดหมู่ที่มี (กลุ่ม > หมวดย่อย)
${categoryList}
${historyContext}
## กฎสำคัญ (ปฏิบัติตามอย่างเคร่งครัด)
1. เลือกได้เฉพาะหมวดย่อย (ที่มี ID) เท่านั้น ห้ามเลือกกลุ่ม
2. เลือกเฉพาะหมวดที่ตรงกับรายการจริงๆ -- ห้ามเดา ห้ามเลือกหมวดที่ "พอใกล้เคียง" หรือ "กว้างกว่า"
3. ให้คะแนน confidence (0-100):
   - 90-100 = ตรงแน่นอน (เช่น มีประวัติเดิมตรงเป๊ะ หรือชื่อรายการบ่งบอกชัดเจน)
   - 70-89 = น่าจะตรง
   - ต่ำกว่า 70 = ไม่มั่นใจ → ต้องใส่ categoryId = null และแนะนำหมวดใหม่แทน
4. ถ้าไม่มีหมวดไหนตรงจริงๆ (confidence < 70) → ใส่ categoryId = null, isNew = true, แนะนำชื่อหมวดใหม่ที่เหมาะสมใน newCategoryName พร้อมระบุ newCategoryParentName (ต้องตรงกับชื่อกลุ่มที่มีอยู่)
5. ถ้ามีประวัติการจัดหมวดเดิม ให้ยึดตามประวัติเป็นหลัก

## ตอบ JSON เท่านั้น
{
  "categoryId": "ID ของหมวดย่อยที่เลือก หรือ null ถ้าไม่มีหมวดตรง",
  "categoryName": "ชื่อหมวดที่เลือก",
  "groupName": "ชื่อกลุ่ม",
  "confidence": 0,
  "isNew": false,
  "newCategoryName": "ชื่อหมวดใหม่ที่แนะนำ หรือ null",
  "newCategoryParentName": "ชื่อกลุ่มที่ควรอยู่ หรือ null",
  "reason": "เหตุผลสั้นๆ"
}`;

    const response = await generateText(prompt, {
      temperature: 0,
      maxTokens: 16384,
      responseMimeType: "application/json",
    });

    if (response.error) {
      log.error("AI error", response.error);
      return { error: "AI ไม่สามารถวิเคราะห์ได้: " + response.error };
    }

    log.debug("AI raw response", { text: response.data.slice(0, 800), length: response.data.length });

    let parsed: AIResponse | null = null;
    try {
      parsed = JSON.parse(response.data) as AIResponse;
    } catch {
      parsed = extractJson(response.data);
    }

    if (!parsed) {
      log.error("Failed to parse AI response", { raw: response.data.slice(0, 800) });
      return { error: "AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง" };
    }
    log.debug("AI category suggestion", parsed);

    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    const allChildren = categories.flatMap((g) =>
      g.Children.map((c) => ({ ...c, groupName: g.name, groupId: g.id }))
    );

    // AI says no good match → suggest creating new
    if (!parsed.categoryId || parsed.isNew || confidence < 70) {
      log.debug("AI suggests new category", { confidence, parsed });
      return {
        categoryId: null,
        categoryName: parsed.newCategoryName || parsed.categoryName || "",
        groupName: parsed.newCategoryParentName || parsed.groupName || "",
        isNew: true,
        reason: parsed.reason || "ไม่มีหมวดที่ตรง",
        confidence,
        suggestNewName: parsed.newCategoryName || undefined,
        suggestNewParent: parsed.newCategoryParentName || undefined,
      };
    }

    // Strict match by exact ID only
    const found = allChildren.find((c) => c.id === parsed.categoryId);
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        groupName: found.groupName,
        isNew: false,
        reason: parsed.reason || "AI จำแนก",
        confidence,
      };
    }

    // ID didn't match any child — don't guess, treat as no match
    log.debug("AI returned unknown categoryId, treating as no match", {
      categoryId: parsed.categoryId,
      confidence,
    });
    return {
      categoryId: null,
      categoryName: parsed.newCategoryName || parsed.categoryName || "",
      groupName: parsed.newCategoryParentName || parsed.groupName || "",
      isNew: true,
      reason: parsed.reason || "ไม่พบหมวดที่ตรง",
      confidence: 0,
      suggestNewName: parsed.newCategoryName || undefined,
      suggestNewParent: parsed.newCategoryParentName || undefined,
    };
  } catch (error) {
    log.error("suggestCategory error", error);
    return { error: "เกิดข้อผิดพลาดในการวิเคราะห์หมวดหมู่" };
  }
}
