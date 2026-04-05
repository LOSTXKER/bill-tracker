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
}

export interface SuggestCategoryResult {
  categoryId: string;
  categoryName: string;
  groupName: string;
  isNew: boolean;
  reason: string;
}

interface AIResponse {
  categoryId?: string | null;
  categoryName?: string;
  groupName?: string;
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

export async function suggestCategory(
  input: SuggestCategoryInput
): Promise<SuggestCategoryResult | { error: string }> {
  const { descriptions, companyId, transactionType } = input;

  if (!descriptions.length) {
    return { error: "ไม่มีรายการ" };
  }

  try {
    const categories = await prisma.transactionCategory.findMany({
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

    const categoryList = categories
      .map(
        (g) =>
          `[${g.name}]\n${g.Children.map((c) => `  - ${c.name} | ID: ${c.id}`).join("\n")}`
      )
      .join("\n");

    const descList = descriptions.slice(0, 15).join("\n");

    const prompt = `เลือกหมวดหมู่ที่เหมาะสมที่สุดสำหรับรายการค่าใช้จ่ายด้านล่าง ตอบเป็น JSON เท่านั้น

## รายการ
${descList}

## หมวดหมู่ที่มี (กลุ่ม > หมวดย่อย)
${categoryList}

## กฎ
- เลือกหมวดย่อย (ไม่ใช่กลุ่ม) ที่เหมาะสมที่สุด 1 อัน
- ใส่ categoryId ของหมวดย่อยที่เลือก
- ถ้าไม่มีหมวดย่อยไหนเหมาะสมเลย → ใส่ categoryId = null และแนะนำชื่อหมวดใหม่ใน newCategoryName พร้อมระบุ newCategoryParentName (ต้องตรงกับชื่อกลุ่มที่มีอยู่)

## ตอบ JSON เท่านั้น
{
  "categoryId": "ID หรือ null",
  "categoryName": "ชื่อหมวด",
  "groupName": "ชื่อกลุ่ม",
  "isNew": false,
  "newCategoryName": null,
  "newCategoryParentName": null,
  "reason": "เหตุผลสั้นๆ"
}`;

    const response = await generateText(prompt, {
      temperature: 0.1,
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

    const allChildren = categories.flatMap((g) =>
      g.Children.map((c) => ({ ...c, groupName: g.name, groupId: g.id }))
    );

    // 1) Match by ID
    if (parsed.categoryId) {
      const found = allChildren.find((c) => c.id === parsed.categoryId);
      if (found) {
        return {
          categoryId: found.id,
          categoryName: found.name,
          groupName: found.groupName,
          isNew: false,
          reason: parsed.reason || "AI จำแนก",
        };
      }

      // AI might have returned a parent group ID
      const parentGroup = categories.find((g) => g.id === parsed.categoryId);
      if (parentGroup && parentGroup.Children.length > 0) {
        const child = parentGroup.Children[0];
        return {
          categoryId: child.id,
          categoryName: child.name,
          groupName: parentGroup.name,
          isNew: false,
          reason: parsed.reason || "AI จำแนก (กลุ่ม)",
        };
      }
    }

    // 2) Match by name
    if (parsed.categoryName) {
      const norm = parsed.categoryName.toLowerCase().trim();
      const found = allChildren.find(
        (c) =>
          c.name.toLowerCase().includes(norm) ||
          norm.includes(c.name.toLowerCase())
      );
      if (found) {
        return {
          categoryId: found.id,
          categoryName: found.name,
          groupName: found.groupName,
          isNew: false,
          reason: parsed.reason || "AI จำแนก",
        };
      }
    }

    // 3) Match by groupName + categoryName against parent groups
    if (parsed.groupName) {
      const groupNorm = parsed.groupName.toLowerCase().trim();
      const catNorm = (parsed.categoryName || "").toLowerCase().trim();
      const parentGroup = categories.find(
        (g) =>
          g.name.toLowerCase().includes(groupNorm) ||
          groupNorm.includes(g.name.toLowerCase())
      );
      if (parentGroup) {
        const childMatch = catNorm
          ? parentGroup.Children.find(
              (c) =>
                c.name.toLowerCase().includes(catNorm) ||
                catNorm.includes(c.name.toLowerCase())
            )
          : null;
        const child = childMatch || parentGroup.Children[0];
        if (child) {
          return {
            categoryId: child.id,
            categoryName: child.name,
            groupName: parentGroup.name,
            isNew: false,
            reason: parsed.reason || "AI จำแนก",
          };
        }
      }
    }

    // 4) Auto-create new subcategory
    if (parsed.isNew && parsed.newCategoryName && parsed.newCategoryParentName) {
      const parentGroup = categories.find(
        (g) =>
          g.name.toLowerCase().includes(parsed.newCategoryParentName!.toLowerCase()) ||
          parsed.newCategoryParentName!.toLowerCase().includes(g.name.toLowerCase())
      );
      if (parentGroup) {
        const newCat = await prisma.transactionCategory.create({
          data: {
            companyId,
            name: parsed.newCategoryName,
            type: transactionType,
            parentId: parentGroup.id,
            sortOrder: parentGroup.Children.length,
          },
        });
        log.debug("Auto-created category", {
          name: newCat.name,
          group: parentGroup.name,
        });
        return {
          categoryId: newCat.id,
          categoryName: newCat.name,
          groupName: parentGroup.name,
          isNew: true,
          reason: parsed.reason || "AI สร้างหมวดใหม่",
        };
      }
    }

    log.debug("Category resolution failed", {
      parsed,
      childrenCount: allChildren.length,
    });
    return { error: "AI ไม่สามารถระบุหมวดหมู่ที่เหมาะสมได้" };
  } catch (error) {
    log.error("suggestCategory error", error);
    return { error: "เกิดข้อผิดพลาดในการวิเคราะห์หมวดหมู่" };
  }
}
