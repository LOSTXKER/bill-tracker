import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
async function main() {
  await client.connect();

  // Check rows WITH data
  const r1 = await client.query(`SELECT id, "slipUrls", "otherDocUrls" FROM "Expense" WHERE "slipUrls"::text != '[]' LIMIT 3`);
  console.log("=== Expenses WITH slipUrls data ===");
  for (const row of r1.rows) {
    console.log("id:", row.id);
    console.log("  slipUrls isArray:", Array.isArray(row.slipUrls), "| typeof:", typeof row.slipUrls);
    console.log("  value:", JSON.stringify(row.slipUrls).substring(0, 200));
  }

  // Check rows WITHOUT data (empty)
  const r2 = await client.query(`SELECT id, "slipUrls", "otherDocUrls" FROM "Expense" WHERE "slipUrls"::text = '[]' LIMIT 3`);
  console.log("\n=== Expenses with EMPTY slipUrls ===");
  for (const row of r2.rows) {
    console.log("id:", row.id);
    console.log("  slipUrls isArray:", Array.isArray(row.slipUrls), "| typeof:", typeof row.slipUrls);
    console.log("  raw value:", row.slipUrls);
    console.log("  JSON:", JSON.stringify(row.slipUrls));
  }

  // Check actual DB storage
  const r3 = await client.query(`SELECT id, "slipUrls"::text as raw FROM "Expense" LIMIT 5`);
  console.log("\n=== Raw text cast ===");
  for (const row of r3.rows) {
    console.log("id:", row.id, "| raw:", row.raw);
  }

  await client.end();
}
main();
