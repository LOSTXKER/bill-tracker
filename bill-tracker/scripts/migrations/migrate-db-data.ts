/**
 * Migrate all data from old database to new database.
 * Uses pg to copy data table by table, respecting foreign key order.
 *
 * Usage:
 *   OLD_DATABASE_URL="..." NEW_DATABASE_URL="..." npx tsx scripts/migrate-db-data.ts
 */

import pg from "pg";

const OLD_DB = process.env.OLD_DATABASE_URL ?? "";
const NEW_DB = process.env.NEW_DATABASE_URL ?? "";

if (!OLD_DB || !NEW_DB) {
  console.error("Missing OLD_DATABASE_URL or NEW_DATABASE_URL");
  process.exit(1);
}

// Tables in dependency order (parents first, children last)
const TABLES = [
  "User",
  "Company",
  "CompanyAccess",
  "CompanyConfig",
  "Account",
  "Contact",
  "Integration",
  "Notification",
  "RecurringExpense",
  "VendorMapping",
  "Expense",
  "Income",
  "ReimbursementRequest",
  "ExpensePayment",
  "PettyCashFund",
  "PettyCashTransaction",
  "Comment",
  "DocumentEvent",
  "AuditLog",
];

async function main() {
  console.log("🚀 Database Data Migration\n");

  const oldClient = new pg.Client({ connectionString: OLD_DB });
  const newClient = new pg.Client({ connectionString: NEW_DB });

  await oldClient.connect();
  console.log("✅ Connected to OLD database");
  await newClient.connect();
  console.log("✅ Connected to NEW database\n");

  try {
    // Disable triggers on new DB to avoid FK constraint issues during insert
    await newClient.query("SET session_replication_role = 'replica'");

    for (const table of TABLES) {
      const quoted = `"${table}"`;

      // Count rows in old
      const countResult = await oldClient.query(`SELECT COUNT(*) as c FROM ${quoted}`);
      const totalRows = parseInt(countResult.rows[0].c);

      if (totalRows === 0) {
        console.log(`⏭️  ${table}: 0 rows (skip)`);
        continue;
      }

      // Check if new table already has all data
      const newCount = await newClient.query(`SELECT COUNT(*) as c FROM ${quoted}`);
      const existingRows = parseInt(newCount.rows[0].c);
      if (existingRows >= totalRows) {
        console.log(`⏭️  ${table}: ${existingRows}/${totalRows} rows (complete)`);
        continue;
      }
      if (existingRows > 0) {
        console.log(`📦 ${table}: ${existingRows}/${totalRows} exist, inserting missing rows...`);
      }

      console.log(`📦 ${table}: migrating ${totalRows} rows...`);

      // Fetch all rows from old
      const batchSize = 500;
      let offset = 0;
      let inserted = 0;

      while (offset < totalRows) {
        const { rows } = await oldClient.query(
          `SELECT * FROM ${quoted} LIMIT ${batchSize} OFFSET ${offset}`
        );

        if (rows.length === 0) break;

        // Build insert for this batch
        const columns = Object.keys(rows[0]);
        const quotedCols = columns.map((c) => `"${c}"`).join(", ");

        for (const row of rows) {
          const values = columns.map((col) => {
            const val = row[col];
            // pg auto-parses JSON/JSONB into objects — stringify them back
            if (val !== null && typeof val === "object" && !(val instanceof Date) && !Buffer.isBuffer(val)) {
              return JSON.stringify(val);
            }
            return val;
          });
          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

          try {
            await newClient.query(
              `INSERT INTO ${quoted} (${quotedCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values
            );
            inserted++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`   ❌ Error inserting into ${table}: ${msg}`);
          }
        }

        offset += batchSize;
      }

      console.log(`   ✅ ${inserted}/${totalRows} rows inserted`);
    }

    // Re-enable triggers
    await newClient.query("SET session_replication_role = 'origin'");

    console.log("\n✨ Data migration complete!");
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

main().catch((e) => {
  console.error("\n❌ Migration failed:", e);
  process.exit(1);
});
