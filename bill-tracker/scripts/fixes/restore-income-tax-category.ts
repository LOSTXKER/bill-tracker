/**
 * สร้าง category "ภาษีเงินได้" (under "ภาษีและค่าธรรมเนียมราชการ") กลับมาให้ Anajak และ Meelike
 * สำหรับกรณีที่ลบไปโดยไม่ตั้งใจจากสคริปต์ rename
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fixes/restore-income-tax-category.ts            # dry-run
 *   npx tsx --env-file=.env.local scripts/fixes/restore-income-tax-category.ts --execute
 */

import { prisma } from "@/lib/db";

const TARGET_COMPANY_CODES = ["anajak", "meelike"];
const PARENT_NAME = "ภาษีและค่าธรรมเนียมราชการ";
const NAME = "ภาษีเงินได้";

const EXECUTE = process.argv.slice(2).includes("--execute");

async function main() {
  console.log(`\nRestore category "${NAME}" under "${PARENT_NAME}"  [${EXECUTE ? "EXECUTE" : "DRY RUN"}]\n`);

  const companies = await prisma.company.findMany({
    where: {
      OR: TARGET_COMPANY_CODES.map((code) => ({
        code: { equals: code, mode: "insensitive" as const },
      })),
    },
    select: { id: true, code: true, name: true },
  });

  let created = 0;
  let existed = 0;

  for (const company of companies) {
    const parent = await prisma.transactionCategory.findFirst({
      where: { companyId: company.id, name: PARENT_NAME, parentId: null },
      select: { id: true, type: true },
    });
    if (!parent) {
      console.log(`[${company.code}] ! no parent "${PARENT_NAME}" — skip`);
      continue;
    }

    const existing = await prisma.transactionCategory.findFirst({
      where: { companyId: company.id, parentId: parent.id, name: NAME },
      select: { id: true },
    });

    if (existing) {
      console.log(`[${company.code}] OK already exists [id=${existing.id}]`);
      existed++;
      continue;
    }

    if (EXECUTE) {
      const max = await prisma.transactionCategory.aggregate({
        where: { companyId: company.id, parentId: parent.id },
        _max: { sortOrder: true },
      });
      const createdRow = await prisma.transactionCategory.create({
        data: {
          companyId: company.id,
          parentId: parent.id,
          name: NAME,
          type: parent.type,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          isActive: true,
        },
        select: { id: true },
      });
      console.log(`[${company.code}] + created [id=${createdRow.id}]`);
      created++;
    } else {
      console.log(`[${company.code}] (dry-run) would create "${NAME}"`);
      created++;
    }
  }

  console.log(`\nSummary: created=${created}, already_existed=${existed}\n`);
  if (!EXECUTE) console.log(`Run with --execute to apply.\n`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
