/**
 * Quick script to update Supabase URLs in the database after region migration.
 * Usage: DATABASE_URL="..." npx tsx scripts/update-db-urls.ts
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const OLD_BASE = "https://dovdfnsvggqejhjzfnvv.supabase.co";
const NEW_BASE = "https://wbplmfahkzseolgmowvu.supabase.co";

async function main() {
  if (!DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to database");
  console.log(`Old: ${OLD_BASE}`);
  console.log(`New: ${NEW_BASE}\n`);

  const jsonColumns: { table: string; columns: string[] }[] = [
    {
      table: '"Expense"',
      columns: ['"slipUrls"', '"taxInvoiceUrls"', '"whtCertUrls"', '"otherDocUrls"', '"referenceUrls"'],
    },
    {
      table: '"Income"',
      columns: ['"customerSlipUrls"', '"myBillCopyUrls"', '"whtCertUrls"', '"otherDocUrls"', '"referenceUrls"'],
    },
    {
      table: '"ReimbursementRequest"',
      columns: ['"receiptUrls"', '"referenceUrls"'],
    },
    {
      table: '"ExpensePayment"',
      columns: ['"settlementSlipUrls"'],
    },
  ];

  const stringColumns = [
    { table: '"Company"', column: '"logoUrl"' },
    { table: '"User"', column: '"avatarUrl"' },
  ];

  let total = 0;

  for (const { table, columns } of jsonColumns) {
    for (const col of columns) {
      const query = `UPDATE ${table} SET ${col} = REPLACE(${col}::text, $1, $2)::jsonb WHERE ${col}::text LIKE $3`;
      const result = await client.query(query, [OLD_BASE, NEW_BASE, `%${OLD_BASE}%`]);
      const count = result.rowCount ?? 0;
      if (count > 0) {
        console.log(`  ✅ ${table}.${col}: ${count} rows updated`);
        total += count;
      }
    }
  }

  for (const { table, column } of stringColumns) {
    const query = `UPDATE ${table} SET ${column} = REPLACE(${column}, $1, $2) WHERE ${column} LIKE $3`;
    const result = await client.query(query, [OLD_BASE, NEW_BASE, `%${OLD_BASE}%`]);
    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`  ✅ ${table}.${column}: ${count} rows updated`);
      total += count;
    }
  }

  console.log(`\n📊 Total rows updated: ${total}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
