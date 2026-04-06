/**
 * Migration script: Mark existing settlement transfer expenses
 *
 * Identifies expenses created by the batch settlement flow and sets
 * isSettlementTransfer = true so they are excluded from report totals.
 *
 * Two strategies combined:
 *   1. AuditLog match: entityType="Expense" + changes.fromSettlement = true
 *   2. Description pattern fallback: "โอนคืนค่าใช้จ่ายให้%"
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/mark-settlement-transfers.ts              # dry-run
 *   npx tsx --env-file=.env.local scripts/mark-settlement-transfers.ts --execute    # apply
 */

import { prisma } from "@/lib/db";

const execute = process.argv.includes("--execute");

async function main() {
  console.log(execute ? "🔧 EXECUTE mode" : "👀 DRY-RUN mode (pass --execute to apply)");
  console.log();

  // Strategy 1: Find expense IDs from audit log
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Expense",
      action: "CREATE",
      changes: { path: ["fromSettlement"], equals: true },
    },
    select: { entityId: true },
  });
  const auditExpenseIds = new Set(auditLogs.map((a) => a.entityId));
  console.log(`Strategy 1 (AuditLog): found ${auditExpenseIds.size} expense IDs`);

  // Strategy 2: Find by description pattern
  const descriptionMatches = await prisma.expense.findMany({
    where: {
      description: { startsWith: "โอนคืนค่าใช้จ่ายให้" },
      deletedAt: null,
    },
    select: { id: true, description: true },
  });
  const descExpenseIds = new Set(descriptionMatches.map((e) => e.id));
  console.log(`Strategy 2 (Description): found ${descExpenseIds.size} expense IDs`);

  // Combine both sets
  const allIds = new Set([...auditExpenseIds, ...descExpenseIds]);
  console.log(`Combined unique IDs: ${allIds.size}`);

  if (allIds.size === 0) {
    console.log("\nNo settlement transfers found. Nothing to do.");
    return;
  }

  // Check how many are already flagged
  const alreadyFlagged = await prisma.expense.count({
    where: { id: { in: [...allIds] }, isSettlementTransfer: true },
  });
  const toUpdate = allIds.size - alreadyFlagged;
  console.log(`Already flagged: ${alreadyFlagged}, need to update: ${toUpdate}`);

  if (toUpdate === 0) {
    console.log("\nAll settlement transfers are already flagged. Nothing to do.");
    return;
  }

  // Show sample of what will be updated
  const samples = await prisma.expense.findMany({
    where: { id: { in: [...allIds] }, isSettlementTransfer: false },
    select: { id: true, description: true, netPaid: true, billDate: true },
    take: 10,
    orderBy: { billDate: "desc" },
  });
  console.log("\nSample expenses to flag:");
  for (const s of samples) {
    console.log(`  ${s.id}  ${s.billDate?.toISOString().slice(0, 10)}  ฿${Number(s.netPaid).toLocaleString()}  ${s.description}`);
  }
  if (toUpdate > 10) console.log(`  ... and ${toUpdate - 10} more`);

  if (!execute) {
    console.log("\nDry run complete. Pass --execute to apply changes.");
    return;
  }

  // Apply the update
  const result = await prisma.expense.updateMany({
    where: { id: { in: [...allIds] }, isSettlementTransfer: false },
    data: { isSettlementTransfer: true },
  });
  console.log(`\n✅ Updated ${result.count} expenses with isSettlementTransfer = true`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
