/**
 * Migration Script: Assign categories to all expenses and incomes using AI
 * 
 * Usage: npx tsx --env-file=.env.local prisma/migrate-categories.ts <company-code> [--clear-accounts] [--dry-run]
 * 
 * Steps:
 *   1. Ensure categories are seeded for the company
 *   2. Iterate all expenses/incomes without a category
 *   3. Use AI text analysis to suggest a category for each
 *   4. Optionally clear accountId from all records
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not defined");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const BATCH_SIZE = 20;
const AI_DELAY_MS = 1500;

interface CategoryChild {
  id: string;
  name: string;
  groupName: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getCategories(companyId: string, type: "EXPENSE" | "INCOME"): Promise<CategoryChild[]> {
  const groups = await prisma.transactionCategory.findMany({
    where: { companyId, type, parentId: null, isActive: true },
    include: {
      Children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return groups.flatMap((g) =>
    g.Children.map((c) => ({ id: c.id, name: c.name, groupName: g.name }))
  );
}

function buildCategoryPrompt(categories: CategoryChild[]): string {
  const grouped = new Map<string, string[]>();
  for (const c of categories) {
    if (!grouped.has(c.groupName)) grouped.set(c.groupName, []);
    grouped.get(c.groupName)!.push(`  - ${c.name} (id: ${c.id})`);
  }
  const lines: string[] = [];
  for (const [group, children] of grouped) {
    lines.push(`[${group}]`);
    lines.push(...children);
  }
  return lines.join("\n");
}

async function callAiForCategory(
  description: string,
  contactName: string | null,
  categories: CategoryChild[],
  companyCode: string,
  type: "expense" | "income"
): Promise<{ categoryId: string; isNew: boolean } | null> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const apiKey = process.env.MIGRATION_API_KEY;
  
  const text = [description, contactName].filter(Boolean).join(" - ");
  if (!text.trim()) return null;

  try {
    const res = await fetch(`${baseUrl}/api/ai/analyze-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        Cookie: process.env.MIGRATION_COOKIE || "",
      },
      body: JSON.stringify({ text, companyCode, type }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data?.category?.categoryId) {
      return {
        categoryId: json.data.category.categoryId,
        isNew: json.data.category.isNew || false,
      };
    }
  } catch (err) {
    console.error(`  AI error for "${text.substring(0, 50)}":`, (err as Error).message);
  }
  return null;
}

function matchCategoryByKeywords(
  description: string,
  contactName: string | null,
  categories: CategoryChild[]
): string | null {
  const text = `${description || ""} ${contactName || ""}`.toLowerCase();
  if (!text.trim()) return null;

  // Order matters: more specific patterns first, generic patterns last
  const keywordMap: [string, string[]][] = [
    // Salary & personnel
    ["เงินเดือนพนักงาน", ["เงินเดือน", "salary"]],
    ["ค่าจ้างฟรีแลนซ์", ["ฟรีแลนซ์", "freelance", "ค่าพนักงานฟรีแลนซ์"]],
    ["ค่าตอบแทนพิเศษ/โบนัส", ["โบนัส", "bonus"]],
    ["เงินสมทบประกันสังคม", ["ประกันสังคม"]],

    // Rent & utilities
    ["ค่าเช่าสำนักงาน", ["ค่าเช่า", "rent", "ค่าเช่าตึก"]],
    ["ค่าไฟฟ้า", ["ค่าไฟ", "กฟน", "กฟภ", "การไฟฟ้า", "electric"]],
    ["ค่าน้ำประปา", ["ค่าน้ำ", "ประปา", "water"]],
    ["ค่าอินเทอร์เน็ต", ["อินเทอร์เน็ต", "อินเตอร์เน็ต", "ค่าเน็ต", "3bb", "internet"]],
    ["ค่าโทรศัพท์", ["โทรศัพท์", "phone"]],

    // Transport
    ["ค่าน้ำมัน", ["น้ำมัน", "ปั๊ม", "ptt", "shell", "bangchak", "esso", "fuel", "caltex"]],
    ["ค่าทางด่วน/ที่จอดรถ", ["ทางด่วน", "ที่จอดรถ", "expressway", "parking", "toll"]],
    ["ค่าจัดส่งพัสดุ", ["ems", "kerry", "flash", "j&t", "dhl", "พัสดุ", "shipping", "ไปรษณีย์"]],

    // Marketing & ads
    ["ค่าโฆษณาออนไลน์", ["facebook ads", "google ads", "meta ads", "tiktok", "line ads", "โฆษณา", "ads"]],

    // Tech & SaaS (specific first)
    ["ค่าโฮสติ้ง/เซิร์ฟเวอร์/คลาวด์", ["vercel", "digitalocean", "aws", "โฮสติ้ง", "hosting", "server", "infrastructure"]],
    ["ค่าโดเมน/SSL", ["domain", "ssl", "positivessl", "โดเมน"]],
    ["ค่าพัฒนาซอฟต์แวร์", ["พัฒนาระบบ", "web application", "development", "พัฒนาเว็บ"]],
    ["ค่า SaaS/ซอฟต์แวร์รายเดือน", ["cursor", "canva", "adobe", "creative cloud", "mailersend", "movider", "barter connect", "line official", "saas", "software", "subscription", "license", "ซอฟต์แวร์", "pro plus", "ultra"]],

    // Office supplies & equipment
    ["ค่าอุปกรณ์คอมพิวเตอร์/IT", ["คอมพิวเตอร์", "computer", "keyboard", "การ์ดจอ", "power supply", "หูฟัง", "streamdeck", "magic keyboard", "gimball"]],
    ["ค่าหมึกพิมพ์/กระดาษ", ["หมึกพิมพ์", "brother tn", "เครื่องพิมพ์"]],
    ["ค่าอุปกรณ์สำนักงาน", ["ค่าอุปกรณ์สำนักงาน", "อุปกรณ์สำนักงาน"]],
    ["ค่าเฟอร์นิเจอร์", ["ตู้เสื้อผ้า", "โต๊ะ", "เฟอร์นิเจอร์", "โคมไฟ"]],
    ["ค่าเครื่องเขียน/วัสดุ", ["เครื่องเขียน", "stationery"]],

    // Professional services
    ["ค่าบัญชี/สอบบัญชี", ["สำนักบัญชี", "สอบบัญชี", "accounting", "audit"]],
    ["ค่าที่ปรึกษา", ["ที่ปรึกษา", "consultant"]],

    // Banking & finance
    ["ค่าธรรมเนียมราชการ", ["กรมพัฒนาธุรกิจ", "หนังสือรับรอง", "จดทะเบียน", "ใบอนุญาต"]],
    ["ค่าธรรมเนียมโอนเงิน", ["ค่าธรรมเนียม", "bank fee", "transfer fee"]],

    // Tax
    ["ภาษีเงินได้", ["ภาษี", "สรรพากร", "tax", "ภ.ง.ด"]],

    // Food & drink
    ["ค่าอาหาร/เลี้ยงรับรอง", ["อาหาร", "food", "restaurant", "เลี้ยง", "ร้านอาหาร", "bigc", "บิ๊กซี"]],
    ["ค่ากาแฟ/เครื่องดื่ม", ["กาแฟ", "coffee", "starbucks"]],

    // Repair & maintenance
    ["ค่าซ่อมแซมอาคาร", ["ซ่อมแซมอาคาร", "ซ่อมไฟอาคาร"]],
    ["ค่าบำรุงรักษาระบบ", ["maintenance", "บำรุงรักษา"]],

    // Insurance
    ["ค่าประกันภัยธุรกิจ", ["ประกัน", "insurance"]],

    // Cost of goods
    ["ต้นทุนสินค้า", ["เสื้อผ้า", "เสื้อ", "สินค้า", "สกรีน"]],

    // Business-specific: platform services
    ["ต้นทุนการให้บริการ", ["ทุนบริการ", "ต้นทุนบริการ", "ค่าเว็บรายเดือน", "ค่าเว็บ", "ค่าบริการรายเดือน"]],

    // Refunds
    ["คืนเงินลูกค้า", ["คืนเงิน", "โอนคืน", "คืนผู้เสียหาย"]],

    // General transfers (fallback for โอนเงินให้)
    ["ค่าใช้จ่ายอื่น", ["สลิปโอนเงินให้", "โอนเงินให้"]],

    // Income categories
    ["ค่าบริการ", ["รายได้จากการให้บริการ", "รายได้จากบริการ"]],
    ["ขายสินค้า", ["ขายสินค้า", "รายได้จากการขาย"]],
    ["ค่าพัฒนาซอฟต์แวร์", ["รายได้จากเว็บ", "ค่าเช่าเว็บ"]],
    ["ดอกเบี้ยรับ", ["ดอกเบี้ย"]],
  ];

  for (const [catName, keywords] of keywordMap) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        const found = categories.find((c) => c.name === catName);
        if (found) return found.id;
      }
    }
  }
  return null;
}

async function migrateTransactions(
  companyId: string,
  companyCode: string,
  type: "expense" | "income",
  categories: CategoryChild[],
  dryRun: boolean
) {
  const modelType = type === "expense" ? "EXPENSE" : "INCOME";
  const dateField = type === "expense" ? "billDate" : "receiveDate";
  const descField = type === "expense" ? "description" : "source";
  
  const where = {
    companyId,
    deletedAt: null,
    categoryId: null,
  };

  const total = type === "expense"
    ? await prisma.expense.count({ where })
    : await prisma.income.count({ where });

  console.log(`\n--- ${type.toUpperCase()} without category: ${total} ---`);
  if (total === 0) return { total: 0, matched: 0, aiMatched: 0, fallbackUsed: 0, unmatched: 0 };

  // Fallback category for truly unmatched items
  const fallbackName = type === "expense" ? "ค่าใช้จ่ายอื่น" : "รายรับเบ็ดเตล็ด";
  const fallbackCategory = categories.find((c) => c.name === fallbackName);

  let matched = 0;
  let aiMatched = 0;
  let unmatched = 0;
  let fallbackUsed = 0;
  let offset = 0;

  while (offset < total) {
    const items = type === "expense"
      ? await prisma.expense.findMany({
          where,
          select: { id: true, description: true, contactName: true },
          orderBy: { billDate: "desc" },
          skip: offset,
          take: BATCH_SIZE,
        })
      : await prisma.income.findMany({
          where,
          select: { id: true, source: true, contactName: true },
          orderBy: { receiveDate: "desc" },
          skip: offset,
          take: BATCH_SIZE,
        });

    if (items.length === 0) break;

    for (const item of items) {
      const desc = type === "expense" ? (item as any).description : (item as any).source;
      const contactName = item.contactName;

      // 1) Try keyword matching first (free, instant)
      let categoryId = matchCategoryByKeywords(desc || "", contactName, categories);

      if (categoryId) {
        matched++;
      } else {
        // 2) Try AI
        const aiResult = await callAiForCategory(
          desc || "",
          contactName,
          categories,
          companyCode,
          type
        );
        if (aiResult) {
          categoryId = aiResult.categoryId;
          aiMatched++;
          if (aiResult.isNew) {
            console.log(`  ✨ AI created new category for: "${(desc || "").substring(0, 40)}"`);
          }
        } else if (fallbackCategory) {
          // 3) Use fallback
          categoryId = fallbackCategory.id;
          fallbackUsed++;
        } else {
          unmatched++;
        }
        await sleep(AI_DELAY_MS);
      }

      if (categoryId && !dryRun) {
        if (type === "expense") {
          await prisma.expense.update({ where: { id: item.id }, data: { categoryId } });
        } else {
          await prisma.income.update({ where: { id: item.id }, data: { categoryId } });
        }
      }

      const catLabel = categoryId
        ? categories.find((c) => c.id === categoryId)?.name || categoryId
        : "❌ no match";
      console.log(
        `  [${offset + 1}/${total}] "${(desc || "").substring(0, 50)}" → ${catLabel}`
      );
    }

    offset += items.length;
    console.log(`  Progress: ${Math.min(offset, total)}/${total}`);
  }

  return { total, matched, aiMatched, fallbackUsed, unmatched };
}

async function main() {
  const args = process.argv.slice(2);
  const companyCode = args.find((a) => !a.startsWith("--"));
  const clearAccounts = args.includes("--clear-accounts");
  const dryRun = args.includes("--dry-run");

  if (!companyCode) {
    console.error("Usage: npx tsx --env-file=.env.local prisma/migrate-categories.ts <company-code> [--clear-accounts] [--dry-run]");
    process.exit(1);
  }

  console.log(`\n🚀 Category Migration for "${companyCode}" ${dryRun ? "(DRY RUN)" : ""}`);
  console.log("=".repeat(60));

  const company = await prisma.company.findFirst({
    where: { code: { equals: companyCode, mode: "insensitive" } },
  });
  if (!company) {
    console.error(`Company "${companyCode}" not found`);
    process.exit(1);
  }

  // 1. Ensure categories exist
  const existingCount = await prisma.transactionCategory.count({
    where: { companyId: company.id },
  });
  if (existingCount === 0) {
    console.log("\n⚠️  No categories found. Please seed categories first:");
    console.log("   npx tsx --env-file=.env.local prisma/seed-categories.ts " + companyCode);
    process.exit(1);
  }
  console.log(`✅ ${existingCount} categories found`);

  // 2. Get categories
  const expenseCategories = await getCategories(company.id, "EXPENSE");
  const incomeCategories = await getCategories(company.id, "INCOME");
  console.log(`   Expense sub-categories: ${expenseCategories.length}`);
  console.log(`   Income sub-categories: ${incomeCategories.length}`);

  // 3. Migrate expenses
  const expenseResult = await migrateTransactions(
    company.id,
    company.code,
    "expense",
    expenseCategories,
    dryRun
  );

  // 4. Migrate incomes
  const incomeResult = await migrateTransactions(
    company.id,
    company.code,
    "income",
    incomeCategories,
    dryRun
  );

  // 5. Optionally clear accountId
  if (clearAccounts && !dryRun) {
    console.log("\n--- Clearing accountId from all transactions ---");
    const expenseCleared = await prisma.expense.updateMany({
      where: { companyId: company.id },
      data: { accountId: null },
    });
    const incomeCleared = await prisma.income.updateMany({
      where: { companyId: company.id },
      data: { accountId: null },
    });
    console.log(`  Cleared ${expenseCleared.count} expenses, ${incomeCleared.count} incomes`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log(`  Expenses: ${expenseResult.total} total → ${expenseResult.matched} keyword, ${expenseResult.aiMatched} AI, ${expenseResult.fallbackUsed} fallback, ${expenseResult.unmatched} unmatched`);
  console.log(`  Incomes: ${incomeResult.total} total → ${incomeResult.matched} keyword, ${incomeResult.aiMatched} AI, ${incomeResult.fallbackUsed} fallback, ${incomeResult.unmatched} unmatched`);
  if (dryRun) console.log("\n  ⚠️  DRY RUN — no changes were made");
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
