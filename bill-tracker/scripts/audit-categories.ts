/**
 * AI Category Audit Script
 *
 * Uses AI to review all transaction categories and fix mismatches.
 * Groups transactions by description to minimize AI calls, deduplicates
 * new category suggestions, and respects business profile context.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike                      # dry-run
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike --execute             # apply
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike --only-uncategorized  # only null categories
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike --only-categorized    # re-check existing
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike --type expense        # expenses only
 *   npx tsx --env-file=.env.local scripts/audit-categories.ts --company meelike --batch-size 5 --delay 3000
 */

import { prisma } from "@/lib/db";
import { suggestCategory, type SuggestCategoryResult } from "@/lib/ai/suggest-category";

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const COMPANY_CODE = getArg("company");
const EXECUTE = hasFlag("execute");
const ONLY_UNCATEGORIZED = hasFlag("only-uncategorized");
const ONLY_CATEGORIZED = hasFlag("only-categorized");
const TYPE_FILTER = getArg("type") as "expense" | "income" | undefined;
const BATCH_SIZE = Math.max(1, parseInt(getArg("batch-size") || "10", 10));
const DELAY_MS = Math.max(500, parseInt(getArg("delay") || "2000", 10));
const MIN_CONFIDENCE = parseInt(getArg("min-confidence") || "70", 10);

if (!COMPANY_CODE) {
  console.error(
    "Usage: npx tsx --env-file=.env.local scripts/audit-categories.ts --company <code> [--execute] [--type expense|income] [--only-uncategorized] [--only-categorized] [--batch-size N] [--delay MS] [--min-confidence N]"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TxRow {
  id: string;
  description: string;
  contactName: string;
  currentCategoryId: string | null;
  currentCategoryName: string | null;
  currentGroupName: string | null;
  txType: "EXPENSE" | "INCOME";
}

type Action = "UNCHANGED" | "MOVE" | "NEW" | "SKIP";

interface GroupResult {
  action: Action;
  groupKey: string;
  txIds: string[];
  description: string;
  count: number;
  txType: "EXPENSE" | "INCOME";
  currentCategoryName: string | null;
  currentGroupName: string | null;
  // for MOVE
  targetCategoryId?: string;
  targetCategoryName?: string;
  targetGroupName?: string;
  confidence?: number;
  // for NEW
  suggestNewName?: string;
  suggestNewParent?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function truncate(s: string, len = 45): string {
  return s.length > len ? s.slice(0, len - 1) + "…" : s;
}

function normalizeKey(desc: string, contact: string): string {
  return `${desc.toLowerCase().trim()}|||${contact.toLowerCase().trim()}`;
}

const SEP = "=".repeat(70);

// ---------------------------------------------------------------------------
// Load transactions
// ---------------------------------------------------------------------------
async function loadExpenses(companyId: string): Promise<TxRow[]> {
  const where: Record<string, unknown> = { companyId, deletedAt: null };
  if (ONLY_UNCATEGORIZED) where.categoryId = null;
  if (ONLY_CATEGORIZED) where.categoryId = { not: null };

  const rows = await prisma.expense.findMany({
    where,
    select: {
      id: true,
      description: true,
      contactName: true,
      categoryId: true,
      Category: {
        select: { name: true, Parent: { select: { name: true } } },
      },
    },
    orderBy: { billDate: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    description: r.description || "",
    contactName: r.contactName || "",
    currentCategoryId: r.categoryId,
    currentCategoryName: r.Category?.name || null,
    currentGroupName: r.Category?.Parent?.name || r.Category?.name || null,
    txType: "EXPENSE" as const,
  }));
}

async function loadIncomes(companyId: string): Promise<TxRow[]> {
  const where: Record<string, unknown> = { companyId, deletedAt: null };
  if (ONLY_UNCATEGORIZED) where.categoryId = null;
  if (ONLY_CATEGORIZED) where.categoryId = { not: null };

  const rows = await prisma.income.findMany({
    where,
    select: {
      id: true,
      source: true,
      contactName: true,
      categoryId: true,
      Category: {
        select: { name: true, Parent: { select: { name: true } } },
      },
    },
    orderBy: { receiveDate: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    description: r.source || "",
    contactName: r.contactName || "",
    currentCategoryId: r.categoryId,
    currentCategoryName: r.Category?.name || null,
    currentGroupName: r.Category?.Parent?.name || r.Category?.name || null,
    txType: "INCOME" as const,
  }));
}

// ---------------------------------------------------------------------------
// Group by (description, contact)
// ---------------------------------------------------------------------------
function groupTransactions(txRows: TxRow[]): Map<string, TxRow[]> {
  const map = new Map<string, TxRow[]>();
  for (const tx of txRows) {
    if (!tx.description) continue;
    const key = normalizeKey(tx.description, tx.contactName);
    const arr = map.get(key);
    if (arr) arr.push(tx);
    else map.set(key, [tx]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Process one group via AI
// ---------------------------------------------------------------------------
async function processGroup(
  group: TxRow[],
  groupKey: string,
  companyId: string,
  companyName: string,
  businessDescription: string | undefined
): Promise<GroupResult> {
  const sample = group[0];
  const descriptions = [
    ...new Set(
      group
        .map((tx) => [tx.description, tx.contactName].filter(Boolean).join(" - "))
        .filter(Boolean)
    ),
  ].slice(0, 15);

  const base: Pick<GroupResult, "groupKey" | "txIds" | "description" | "count" | "txType" | "currentCategoryName" | "currentGroupName"> = {
    groupKey,
    txIds: group.map((t) => t.id),
    description: sample.description,
    count: group.length,
    txType: sample.txType,
    currentCategoryName: sample.currentCategoryName,
    currentGroupName: sample.currentGroupName,
  };

  if (descriptions.length === 0) {
    return { ...base, action: "SKIP", reason: "ไม่มีคำอธิบาย" };
  }

  const result = await suggestCategory({
    descriptions,
    companyId,
    transactionType: sample.txType,
    companyName,
    businessDescription,
  });

  if ("error" in result) {
    return { ...base, action: "SKIP", reason: result.error };
  }

  const cat = result as SuggestCategoryResult;

  // AI suggests creating a new category
  if (!cat.categoryId || cat.isNew) {
    return {
      ...base,
      action: "NEW",
      confidence: cat.confidence,
      suggestNewName: cat.suggestNewName || cat.categoryName,
      suggestNewParent: cat.suggestNewParent || cat.groupName,
      reason: cat.reason,
    };
  }

  // AI found an existing category — check if it's the same as current
  if (cat.categoryId === sample.currentCategoryId) {
    return {
      ...base,
      action: "UNCHANGED",
      targetCategoryId: cat.categoryId,
      targetCategoryName: cat.categoryName,
      targetGroupName: cat.groupName,
      confidence: cat.confidence,
    };
  }

  // Different category → propose move
  return {
    ...base,
    action: "MOVE",
    targetCategoryId: cat.categoryId,
    targetCategoryName: cat.categoryName,
    targetGroupName: cat.groupName,
    confidence: cat.confidence,
    reason: cat.reason,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${SEP}`);
  console.log(`  AI Category Audit (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);
  console.log(SEP);
  console.log(`  Company code  : ${COMPANY_CODE}`);
  const scope = ONLY_UNCATEGORIZED ? "Uncategorized only" : ONLY_CATEGORIZED ? "Already categorized only" : "All";
  const typeLabel = TYPE_FILTER || "expense + income";
  console.log(`  Scope         : ${scope}`);
  console.log(`  Type          : ${typeLabel}`);
  console.log(`  Batch size    : ${BATCH_SIZE}  |  Delay: ${DELAY_MS}ms`);
  console.log(`  Min confidence: ${MIN_CONFIDENCE}`);
  console.log(SEP);

  // 1. Load company
  const company = await prisma.company.findFirst({
    where: { code: { equals: COMPANY_CODE, mode: "insensitive" } },
    select: { id: true, code: true, name: true, businessDescription: true },
  });

  if (!company) {
    console.error(`\nCompany "${COMPANY_CODE}" not found.`);
    process.exit(1);
  }

  console.log(`\n  Company: ${company.name} (${company.code})`);
  if (company.businessDescription) {
    console.log(`  Business: ${company.businessDescription}`);
  }
  console.log("");

  // 2. Load transactions
  let allTx: TxRow[] = [];

  if (!TYPE_FILTER || TYPE_FILTER === "expense") {
    const expenses = await loadExpenses(company.id);
    console.log(`  Loaded ${expenses.length} expenses`);
    allTx.push(...expenses);
  }
  if (!TYPE_FILTER || TYPE_FILTER === "income") {
    const incomes = await loadIncomes(company.id);
    console.log(`  Loaded ${incomes.length} incomes`);
    allTx.push(...incomes);
  }

  if (allTx.length === 0) {
    console.log("\n  Nothing to process.");
    await prisma.$disconnect();
    return;
  }

  // 3. Group by type, then by (description, contact)
  const expenseTx = allTx.filter((t) => t.txType === "EXPENSE");
  const incomeTx = allTx.filter((t) => t.txType === "INCOME");

  const expenseGroups = groupTransactions(expenseTx);
  const incomeGroups = groupTransactions(incomeTx);

  const totalGroups = expenseGroups.size + incomeGroups.size;
  console.log(`\n  Total groups to analyze: ${totalGroups} (${expenseGroups.size} expense, ${incomeGroups.size} income)\n`);

  // 4. Analyze all groups
  const results: GroupResult[] = [];
  let groupIdx = 0;
  let callsSincePause = 0;

  async function analyzeGroups(groups: Map<string, TxRow[]>, label: string) {
    if (groups.size === 0) return;
    console.log(`\n--- ${label} (${groups.size} groups) ---\n`);

    for (const [key, txRows] of groups) {
      groupIdx++;
      const idx = `[${String(groupIdx).padStart(String(totalGroups).length)}/${totalGroups}]`;

      try {
        const result = await processGroup(
          txRows,
          key,
          company.id,
          company.name,
          company.businessDescription ?? undefined
        );
        results.push(result);

        const desc = truncate(result.description || "(ว่าง)");
        const countTag = result.count > 1 ? ` (x${result.count})` : "";

        switch (result.action) {
          case "UNCHANGED":
            console.log(
              `${idx} OK    "${desc}"${countTag}  -- ${result.targetGroupName}/${result.targetCategoryName} (${result.confidence}%)`
            );
            break;
          case "MOVE": {
            const from = result.currentCategoryName
              ? `${result.currentGroupName}/${result.currentCategoryName}`
              : "(ไม่มี)";
            console.log(
              `${idx} MOVE  "${desc}"${countTag}  -- ${from} -> ${result.targetGroupName}/${result.targetCategoryName} (${result.confidence}%)`
            );
            break;
          }
          case "NEW":
            console.log(
              `${idx} NEW   "${desc}"${countTag}  -- แนะนำ: "${result.suggestNewName}" ใน [${result.suggestNewParent}] (${result.confidence || 0}%)`
            );
            break;
          case "SKIP":
            console.log(`${idx} SKIP  "${desc}"${countTag}  -- ${result.reason || "ข้าม"}`);
            break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${idx} FAIL  "${truncate(txRows[0]?.description || "?")}"  -- ${msg}`);
        results.push({
          groupKey: key,
          txIds: txRows.map((t) => t.id),
          description: txRows[0]?.description || "",
          count: txRows.length,
          txType: txRows[0]?.txType || "EXPENSE",
          currentCategoryName: null,
          currentGroupName: null,
          action: "SKIP",
          reason: msg,
        });
      }

      callsSincePause++;
      if (callsSincePause >= BATCH_SIZE && groupIdx < totalGroups) {
        callsSincePause = 0;
        await sleep(DELAY_MS);
      }
    }
  }

  await analyzeGroups(expenseGroups, "Expenses");
  await analyzeGroups(incomeGroups, "Incomes");

  // 5. Tally results
  const stats = { UNCHANGED: 0, MOVE: 0, NEW: 0, SKIP: 0 };
  const itemStats = { UNCHANGED: 0, MOVE: 0, NEW: 0, SKIP: 0 };
  for (const r of results) {
    stats[r.action]++;
    itemStats[r.action] += r.count;
  }

  // 6. Deduplicate new category suggestions
  const newCatMap = new Map<string, { name: string; parentName: string; txType: "EXPENSE" | "INCOME"; affectedIds: string[] }>();
  for (const r of results) {
    if (r.action !== "NEW" || !r.suggestNewName || !r.suggestNewParent) continue;
    const dedupeKey = `${r.suggestNewName.toLowerCase().trim()}|||${r.suggestNewParent.toLowerCase().trim()}|||${r.txType}`;
    const existing = newCatMap.get(dedupeKey);
    if (existing) {
      existing.affectedIds.push(...r.txIds);
    } else {
      newCatMap.set(dedupeKey, {
        name: r.suggestNewName,
        parentName: r.suggestNewParent,
        txType: r.txType,
        affectedIds: [...r.txIds],
      });
    }
  }

  // 7. Print summary
  console.log(`\n${SEP}`);
  console.log(`  Summary (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);
  console.log(SEP);
  console.log(`  Total items   : ${allTx.length}`);
  console.log(`  Total groups  : ${totalGroups}`);
  console.log(`  ──────────────────────────────────`);
  console.log(`  Unchanged     : ${stats.UNCHANGED} groups (${itemStats.UNCHANGED} items)`);
  console.log(`  Move          : ${stats.MOVE} groups (${itemStats.MOVE} items)`);
  console.log(`  New category  : ${stats.NEW} groups (${itemStats.NEW} items)`);
  console.log(`  Skipped       : ${stats.SKIP} groups (${itemStats.SKIP} items)`);

  if (newCatMap.size > 0) {
    console.log(`\n  New categories to create (deduplicated): ${newCatMap.size}`);
    for (const [, cat] of newCatMap) {
      console.log(`    - [${cat.parentName}] ${cat.name} (${cat.txType}, ${cat.affectedIds.length} items)`);
    }
  }

  console.log(SEP);

  // 8. Execute phase
  if (!EXECUTE) {
    if (stats.MOVE > 0 || stats.NEW > 0) {
      console.log("\n  This was a DRY RUN. Run with --execute to apply changes.\n");
    }
    await prisma.$disconnect();
    return;
  }

  console.log("\n  Executing changes...\n");

  // 8a. Create new categories
  const newCatIdMap = new Map<string, string>(); // dedupeKey -> new categoryId
  for (const [dedupeKey, cat] of newCatMap) {
    const parentGroup = await prisma.transactionCategory.findFirst({
      where: {
        companyId: company.id,
        type: cat.txType,
        parentId: null,
        isActive: true,
        name: { contains: cat.parentName, mode: "insensitive" },
      },
      select: { id: true, name: true, _count: { select: { Children: true } } },
    });

    if (!parentGroup) {
      console.log(`  SKIP create "${cat.name}" -- parent group "${cat.parentName}" not found`);
      continue;
    }

    // Check if already exists
    const existing = await prisma.transactionCategory.findFirst({
      where: {
        companyId: company.id,
        type: cat.txType,
        parentId: parentGroup.id,
        name: { equals: cat.name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existing) {
      console.log(`  EXISTS "${cat.name}" in [${parentGroup.name}] -> ${existing.id}`);
      newCatIdMap.set(dedupeKey, existing.id);
      continue;
    }

    const created = await prisma.transactionCategory.create({
      data: {
        companyId: company.id,
        name: cat.name,
        type: cat.txType,
        parentId: parentGroup.id,
        sortOrder: parentGroup._count.Children,
      },
    });
    console.log(`  CREATED "${created.name}" in [${parentGroup.name}] -> ${created.id}`);
    newCatIdMap.set(dedupeKey, created.id);
  }

  // 8b. Apply moves
  let movedCount = 0;
  for (const r of results) {
    if (r.action === "MOVE" && r.targetCategoryId) {
      const expenseIds = r.txType === "EXPENSE" ? r.txIds : [];
      const incomeIds = r.txType === "INCOME" ? r.txIds : [];

      if (expenseIds.length > 0) {
        await prisma.expense.updateMany({
          where: { id: { in: expenseIds }, companyId: company.id, deletedAt: null },
          data: { categoryId: r.targetCategoryId },
        });
        movedCount += expenseIds.length;
      }
      if (incomeIds.length > 0) {
        await prisma.income.updateMany({
          where: { id: { in: incomeIds }, companyId: company.id, deletedAt: null },
          data: { categoryId: r.targetCategoryId },
        });
        movedCount += incomeIds.length;
      }
    }
  }

  // 8c. Assign new categories to their transactions
  let newAssignedCount = 0;
  for (const r of results) {
    if (r.action !== "NEW" || !r.suggestNewName || !r.suggestNewParent) continue;
    const dedupeKey = `${r.suggestNewName.toLowerCase().trim()}|||${r.suggestNewParent.toLowerCase().trim()}|||${r.txType}`;
    const newCatId = newCatIdMap.get(dedupeKey);
    if (!newCatId) continue;

    const expenseIds = r.txType === "EXPENSE" ? r.txIds : [];
    const incomeIds = r.txType === "INCOME" ? r.txIds : [];

    if (expenseIds.length > 0) {
      await prisma.expense.updateMany({
        where: { id: { in: expenseIds }, companyId: company.id, deletedAt: null },
        data: { categoryId: newCatId },
      });
      newAssignedCount += expenseIds.length;
    }
    if (incomeIds.length > 0) {
      await prisma.income.updateMany({
        where: { id: { in: incomeIds }, companyId: company.id, deletedAt: null },
        data: { categoryId: newCatId },
      });
      newAssignedCount += incomeIds.length;
    }
  }

  console.log(`\n${SEP}`);
  console.log(`  Execution Complete`);
  console.log(SEP);
  console.log(`  Moved          : ${movedCount} items`);
  console.log(`  New + assigned : ${newAssignedCount} items`);
  console.log(`  Categories created: ${newCatIdMap.size}`);
  console.log(SEP);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
