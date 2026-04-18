/**
 * เปลี่ยนหมวดหมู่ [ภาษีและค่าธรรมเนียมราชการ] ภาษีเงินได้ → ค่าภาษี
 * สำหรับบริษัท Anajak และ Meelike
 *
 * - ย้าย Expense / Income ที่อ้าง "ภาษีเงินได้" ให้ชี้ไปที่ "ค่าภาษี"
 * - ถ้า "ค่าภาษี" ยังไม่มี จะสร้างใหม่ (copy icon/color/sortOrder มาจาก "ภาษีเงินได้")
 * - "ภาษีเงินได้" จะคงไว้เสมอ (ไม่ลบ) แม้หลังย้ายข้อมูลเสร็จแล้ว
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fixes/rename-income-tax-to-tax-expense.ts            # dry-run
 *   npx tsx --env-file=.env.local scripts/fixes/rename-income-tax-to-tax-expense.ts --execute  # apply changes
 */

import { prisma } from "@/lib/db";

const TARGET_COMPANY_CODES = ["anajak", "meelike"];
const PARENT_NAME = "ภาษีและค่าธรรมเนียมราชการ";
const OLD_NAME = "ภาษีเงินได้";
const NEW_NAME = "ค่าภาษี";

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

function line(char = "=", n = 70) {
  return char.repeat(n);
}

async function main() {
  console.log(`\n${line()}`);
  console.log(`  Rename category: "${OLD_NAME}" → "${NEW_NAME}"`);
  console.log(`  Under parent:    "${PARENT_NAME}"`);
  console.log(`  Mode:            ${EXECUTE ? "EXECUTE (will modify data)" : "DRY RUN"}`);
  console.log(`${line()}\n`);

  const companies = await prisma.company.findMany({
    where: {
      OR: TARGET_COMPANY_CODES.map((code) => ({
        code: { equals: code, mode: "insensitive" as const },
      })),
    },
    select: { id: true, code: true, name: true },
  });

  if (companies.length === 0) {
    console.error(`No companies matched: ${TARGET_COMPANY_CODES.join(", ")}`);
    process.exit(1);
  }

  console.log(`Found ${companies.length} company(s):`);
  for (const c of companies) {
    console.log(`  - ${c.name} (${c.code}) [id=${c.id}]`);
  }
  console.log();

  let totalExpensesUpdated = 0;
  let totalIncomesUpdated = 0;
  let totalCategoriesCreated = 0;

  for (const company of companies) {
    console.log(`${line("-")}`);
    console.log(`[${company.code}] ${company.name}`);
    console.log(`${line("-")}`);

    // Find parent category
    const parent = await prisma.transactionCategory.findFirst({
      where: {
        companyId: company.id,
        name: PARENT_NAME,
        parentId: null,
      },
      select: { id: true, name: true, type: true },
    });

    if (!parent) {
      console.log(`  ! Parent "${PARENT_NAME}" not found, skipping.\n`);
      continue;
    }
    console.log(`  Parent: ${parent.name} (type=${parent.type}) [id=${parent.id}]`);

    // Find old category
    const oldCat = await prisma.transactionCategory.findFirst({
      where: {
        companyId: company.id,
        parentId: parent.id,
        name: OLD_NAME,
      },
      select: { id: true, name: true, type: true, icon: true, color: true, sortOrder: true },
    });

    if (!oldCat) {
      console.log(`  ! Category "${OLD_NAME}" not found under parent, skipping.\n`);
      continue;
    }
    console.log(`  Old category: ${oldCat.name} [id=${oldCat.id}]`);

    // Count records currently using old category
    const [expenseCount, incomeCount, childrenCount] = await Promise.all([
      prisma.expense.count({ where: { companyId: company.id, categoryId: oldCat.id } }),
      prisma.income.count({ where: { companyId: company.id, categoryId: oldCat.id } }),
      prisma.transactionCategory.count({ where: { parentId: oldCat.id } }),
    ]);
    console.log(
      `  Records referencing "${OLD_NAME}": expenses=${expenseCount}, incomes=${incomeCount}, children=${childrenCount}`
    );

    // Find or plan-to-create new category
    let newCat = await prisma.transactionCategory.findFirst({
      where: {
        companyId: company.id,
        parentId: parent.id,
        name: NEW_NAME,
      },
      select: { id: true, name: true, type: true },
    });

    if (newCat) {
      console.log(`  New category "${NEW_NAME}" already exists [id=${newCat.id}] — will merge into it.`);
    } else {
      console.log(`  New category "${NEW_NAME}" does NOT exist — will create it.`);
    }

    if (EXECUTE) {
      // Use a single transaction for each company
      await prisma.$transaction(async (tx) => {
        // Ensure new category exists
        if (!newCat) {
          const created = await tx.transactionCategory.create({
            data: {
              companyId: company.id,
              parentId: parent.id,
              name: NEW_NAME,
              type: oldCat.type,
              icon: oldCat.icon,
              color: oldCat.color,
              sortOrder: oldCat.sortOrder,
              isActive: true,
            },
            select: { id: true, name: true, type: true },
          });
          newCat = created;
          totalCategoriesCreated++;
          console.log(`    + Created "${NEW_NAME}" [id=${newCat.id}]`);
        }

        // Move expenses
        if (expenseCount > 0) {
          const res = await tx.expense.updateMany({
            where: { companyId: company.id, categoryId: oldCat.id },
            data: { categoryId: newCat!.id },
          });
          totalExpensesUpdated += res.count;
          console.log(`    ~ Updated ${res.count} expense(s) → "${NEW_NAME}"`);
        }

        // Move incomes
        if (incomeCount > 0) {
          const res = await tx.income.updateMany({
            where: { companyId: company.id, categoryId: oldCat.id },
            data: { categoryId: newCat!.id },
          });
          totalIncomesUpdated += res.count;
          console.log(`    ~ Updated ${res.count} income(s) → "${NEW_NAME}"`);
        }

        // Keep old "ภาษีเงินได้" category even after moving all records (per user request)
        console.log(`    = Kept category "${OLD_NAME}" [id=${oldCat.id}] (not deleted)`);
      });
    } else {
      // Dry-run preview
      console.log(`    (dry-run) would migrate ${expenseCount} expense(s) and ${incomeCount} income(s)`);
      console.log(`    (dry-run) would KEEP category "${OLD_NAME}" (not deleted)`);
      void childrenCount;
      totalExpensesUpdated += expenseCount;
      totalIncomesUpdated += incomeCount;
      if (!newCat) totalCategoriesCreated++;
    }
    console.log();
  }

  console.log(line());
  console.log(`  Summary (${EXECUTE ? "EXECUTED" : "DRY RUN"})`);
  console.log(line());
  console.log(`  Expenses updated     : ${totalExpensesUpdated}`);
  console.log(`  Incomes updated      : ${totalIncomesUpdated}`);
  console.log(`  Categories created   : ${totalCategoriesCreated}`);
  console.log(line());
  console.log();

  if (!EXECUTE) {
    console.log(`This was a DRY RUN. Run again with --execute to apply changes.\n`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
