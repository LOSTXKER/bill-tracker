/**
 * Check if the 11 missing storage files are referenced in the database.
 */

import pg from "pg";

const DB = process.env.DATABASE_URL!;

const MISSING_FILES = [
  "ANAJAK/settlements/1769938134149-S__25608213.jpg",
  "ANAJAK/settlements/1771237519316-S__25952315.jpg",
  "ANAJAK/settlements/1771529991183-IMG_6868.JPG",
  "ANAJAK/settlements/1771758907150-S__26091536.jpg",
  "ANAJAK/settlements/1771758924150-S__26091536.jpg",
  "ANAJAK/settlements/1771760503718-S__26091536.jpg",
  "ANAJAK/settlements/1771972206699-S__26148867.jpg",
  "ANAJAK/settlements/1772396759499-IMG_7055.JPG",
  "MEELIKE/settlements/1770580240198-slip-fund-transferTRTS260209971735095.JPG",
  "MEELIKE/settlements/1771795016204-S__26107907_0.jpg",
  "MEELIKE/settlements/1771795030654-S__26107908_0.jpg",
];

async function main() {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();

  console.log("🔍 Checking if missing files are referenced in database...\n");

  for (const file of MISSING_FILES) {
    // Extract the filename part for search
    const filename = file.split("/").pop()!;

    // Search in ExpensePayment.settlementSlipUrls (most likely for settlements)
    const r1 = await client.query(
      `SELECT id, "expenseId" FROM "ExpensePayment" WHERE "settlementSlipUrls"::text LIKE $1`,
      [`%${filename}%`]
    );

    // Also search in all Expense URL columns
    const r2 = await client.query(
      `SELECT id FROM "Expense" WHERE "slipUrls"::text LIKE $1 OR "otherDocUrls"::text LIKE $1`,
      [`%${filename}%`]
    );

    if (r1.rows.length > 0) {
      console.log(`  ⚠️  ${file}`);
      console.log(`     Referenced in ExpensePayment: ${r1.rows.map(r => r.id).join(", ")}`);
    } else if (r2.rows.length > 0) {
      console.log(`  ⚠️  ${file}`);
      console.log(`     Referenced in Expense: ${r2.rows.map(r => r.id).join(", ")}`);
    } else {
      console.log(`  ✅ ${file} — NOT referenced in database (orphan file, safe to ignore)`);
    }
  }

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
