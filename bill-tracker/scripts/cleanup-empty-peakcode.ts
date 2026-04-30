/**
 * One-off cleanup: convert Contact rows whose `peakCode` is an empty string
 * (or whitespace) to NULL. Empty-string peakCodes slipped in through the edit
 * form and collide under the `@@unique([companyId, peakCode])` constraint,
 * whereas Postgres allows many NULLs.
 *
 * Usage (from bill-tracker/):
 *   npx tsx scripts/cleanup-empty-peakcode.ts           # preview only
 *   npx tsx scripts/cleanup-empty-peakcode.ts --apply   # actually write
 */

import { config } from "dotenv";
import { resolve } from "path";

// Must load env BEFORE importing anything that reaches @/lib/db, otherwise
// the Prisma client throws "DATABASE_URL is not defined" on import.
const envFile = process.env.DOTENV_CONFIG_PATH ?? ".env.local";
config({ path: resolve(process.cwd(), envFile) });

async function main() {
  const { prisma } = await import("@/lib/db");
  const apply = process.argv.includes("--apply");

  const rows = await prisma.$queryRaw<
    Array<{ id: string; companyId: string; name: string; peakCode: string | null }>
  >`
    SELECT id, "companyId", name, "peakCode"
    FROM "Contact"
    WHERE "peakCode" IS NOT NULL
      AND btrim("peakCode") = ''
    ORDER BY "companyId", name
  `;

  console.log(`Found ${rows.length} Contact rows with empty/whitespace peakCode`);
  for (const r of rows) {
    console.log(
      `  - ${r.companyId.slice(0, 8)}…  ${r.name}  [peakCode=${JSON.stringify(r.peakCode)}]`,
    );
  }

  if (!apply) {
    console.log("\n(dry run — re-run with --apply to NULL these rows)");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$executeRaw`
    UPDATE "Contact"
    SET "peakCode" = NULL,
        "updatedAt" = NOW()
    WHERE "peakCode" IS NOT NULL
      AND btrim("peakCode") = ''
  `;
  console.log(`\n✅ Updated ${result} rows — peakCode is now NULL`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
