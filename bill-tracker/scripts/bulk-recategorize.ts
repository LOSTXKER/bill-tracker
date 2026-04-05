/**
 * Bulk AI Recategorization Script
 *
 * Uses AI to analyze all expenses and assign the best-fit account.
 * Attached documents (receipts, invoices, slips) are analyzed via vision AI;
 * expenses with only text descriptions fall back to text analysis.
 * New accounts are auto-created when no existing match is found.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/bulk-recategorize.ts --company meelike                          # dry-run
 *   npx tsx --env-file=.env.local scripts/bulk-recategorize.ts --company meelike --execute                # apply changes
 *   npx tsx --env-file=.env.local scripts/bulk-recategorize.ts --company meelike --only-uncategorized     # only accountId=null
 *   npx tsx --env-file=.env.local scripts/bulk-recategorize.ts --company meelike --batch-size 5 --delay 3000
 */

import { prisma } from "@/lib/db";
import { analyzeReceipt } from "@/lib/ai/analyze-receipt";
import { analyzeText } from "@/lib/ai/analyze-text";
import { learnFromTransaction } from "@/lib/api/vendor-mapping";

// ---------------------------------------------------------------------------
// CLI arg helpers
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
const BATCH_SIZE = Math.max(1, parseInt(getArg("batch-size") || "10", 10));
const DELAY_MS = Math.max(500, parseInt(getArg("delay") || "2000", 10));

if (!COMPANY_CODE) {
  console.error(
    "Usage: npx tsx scripts/bulk-recategorize.ts --company <code> [--execute] [--only-uncategorized] [--batch-size N] [--delay MS]"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectDocUrls(expense: {
  slipUrls: unknown;
  taxInvoiceUrls: unknown;
  whtCertUrls: unknown;
  otherDocUrls: unknown;
}): string[] {
  const urls: string[] = [];
  for (const val of [
    expense.slipUrls,
    expense.taxInvoiceUrls,
    expense.whtCertUrls,
    expense.otherDocUrls,
  ]) {
    if (Array.isArray(val)) {
      urls.push(...val.filter((u): u is string => typeof u === "string" && u.length > 0));
    }
  }
  return urls;
}

function truncate(s: string, len = 40): string {
  return s.length > len ? s.slice(0, len - 1) + "…" : s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const SEP = "=".repeat(70);

  console.log(`\n${SEP}`);
  console.log(`  Bulk AI Recategorization (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);
  console.log(SEP);
  console.log(`  Company:    ${COMPANY_CODE}`);
  console.log(`  Scope:      ${ONLY_UNCATEGORIZED ? "Uncategorized only" : "All expenses"}`);
  console.log(`  Batch size: ${BATCH_SIZE}  |  Delay: ${DELAY_MS}ms`);
  console.log(`${SEP}\n`);

  // 1. Find company
  const company = await prisma.company.findFirst({
    where: { code: { equals: COMPANY_CODE, mode: "insensitive" } },
    select: { id: true, code: true, name: true },
  });

  if (!company) {
    console.error(`Company "${COMPANY_CODE}" not found.`);
    process.exit(1);
  }

  console.log(`Company: ${company.name} (${company.code})\n`);

  // 2. Load expenses
  const whereClause: Record<string, unknown> = {
    companyId: company.id,
    deletedAt: null,
  };
  if (ONLY_UNCATEGORIZED) {
    whereClause.accountId = null;
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    select: {
      id: true,
      description: true,
      accountId: true,
      contactId: true,
      contactName: true,
      amount: true,
      billDate: true,
      slipUrls: true,
      taxInvoiceUrls: true,
      whtCertUrls: true,
      otherDocUrls: true,
      vatRate: true,
      whtRate: true,
      whtType: true,
      Account: { select: { id: true, code: true, name: true } },
      Contact: { select: { id: true, name: true } },
    },
    orderBy: { billDate: "desc" },
  });

  console.log(`Found ${expenses.length} expense(s) to process.\n`);
  if (expenses.length === 0) {
    console.log("Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  // 3. Process
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;
  let newAccounts = 0;

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const idx = `[${String(i + 1).padStart(String(expenses.length).length)}/${expenses.length}]`;
    const desc = expense.description || "(ไม่มีคำอธิบาย)";
    const contactName = expense.Contact?.name || expense.contactName || "";
    const currentLabel = expense.Account
      ? `${expense.Account.code} ${expense.Account.name}`
      : "(ไม่มี)";

    const docUrls = collectDocUrls(expense);

    try {
      let result: Awaited<ReturnType<typeof analyzeReceipt>>;

      if (docUrls.length > 0) {
        result = await analyzeReceipt({
          imageUrls: docUrls,
          companyId: company.id,
          transactionType: "EXPENSE",
        });
      } else if (expense.description) {
        const textInput = [expense.description, contactName]
          .filter(Boolean)
          .join(" - ");
        result = await analyzeText({
          text: textInput,
          companyId: company.id,
          transactionType: "EXPENSE",
        });
      } else {
        console.log(`${idx} SKIP  "${truncate(desc)}" -- no docs or description`);
        skipped++;
        continue;
      }

      if ("error" in result) {
        console.log(`${idx} ERROR "${truncate(desc)}" -- ${result.error}`);
        failed++;
        if (i < expenses.length - 1) await sleep(DELAY_MS);
        continue;
      }

      const suggestedId = result.account?.id;
      const suggestedCode = result.account?.code || "?";
      const suggestedName = result.account?.name || "?";
      const confidence = result.account?.confidence || result.confidence?.account || 0;
      const isNew = result.account?.isNewAccount || false;

      if (!suggestedId) {
        console.log(`${idx} NONE  "${truncate(desc)}" -- AI could not suggest an account`);
        skipped++;
        if (i < expenses.length - 1) await sleep(DELAY_MS);
        continue;
      }

      if (suggestedId === expense.accountId) {
        console.log(
          `${idx} OK    "${truncate(desc)}" -- ${suggestedCode} ${suggestedName} (${confidence}%)`
        );
        unchanged++;
        if (i < expenses.length - 1) await sleep(DELAY_MS);
        continue;
      }

      if (isNew) newAccounts++;

      const tag = isNew ? "NEW  " : "SET  ";
      const from = expense.Account ? expense.Account.code : "null";
      const docsNote = docUrls.length > 0 ? ` [${docUrls.length} doc(s)]` : "";
      console.log(
        `${idx} ${tag} "${truncate(desc)}" -- ${from} -> ${suggestedCode} ${suggestedName} (${confidence}%)${docsNote}`
      );

      if (EXECUTE) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { accountId: suggestedId },
        });

        if (expense.contactId || expense.contactName) {
          learnFromTransaction({
            companyId: company.id,
            contactId: expense.contactId,
            contactName: expense.contactName,
            accountId: suggestedId,
            transactionType: "expense",
            txId: expense.id,
            vatRate: expense.vatRate != null ? Number(expense.vatRate) : null,
            whtRate: expense.whtRate != null ? Number(expense.whtRate) : null,
            whtType: expense.whtType,
          }).catch(() => {});
        }
      }

      updated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${idx} FAIL  "${truncate(desc)}" -- ${msg}`);
      failed++;
    }

    if (i < expenses.length - 1) await sleep(DELAY_MS);
  }

  // 4. Summary
  console.log(`\n${SEP}`);
  console.log(`  Summary (${EXECUTE ? "EXECUTED" : "DRY RUN"})`);
  console.log(SEP);
  console.log(`  Total processed : ${expenses.length}`);
  console.log(`  Updated         : ${updated}`);
  console.log(`  Unchanged       : ${unchanged}`);
  console.log(`  Skipped         : ${skipped}`);
  console.log(`  Failed          : ${failed}`);
  console.log(`  New accounts    : ${newAccounts}`);
  console.log(`${SEP}\n`);

  if (!EXECUTE && updated > 0) {
    console.log("This was a DRY RUN. Run with --execute to apply changes.\n");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
