/**
 * Fix JSON fields that were corrupted during first migration pass.
 * Re-copies JSON columns from old DB to new DB for affected rows.
 */

import pg from "pg";

const OLD_DB = process.env.OLD_DATABASE_URL!;
const NEW_DB = process.env.NEW_DATABASE_URL!;

const TABLES_WITH_JSON: {
  table: string;
  idCol: string;
  jsonCols: string[];
}[] = [
  {
    table: "Expense",
    idCol: "id",
    jsonCols: ["slipUrls", "taxInvoiceUrls", "whtCertUrls", "otherDocUrls", "referenceUrls", "fraudFlags"],
  },
  {
    table: "Income",
    idCol: "id",
    jsonCols: ["customerSlipUrls", "myBillCopyUrls", "whtCertUrls", "otherDocUrls", "referenceUrls"],
  },
  {
    table: "ReimbursementRequest",
    idCol: "id",
    jsonCols: ["receiptUrls", "referenceUrls", "fraudFlags"],
  },
  {
    table: "ExpensePayment",
    idCol: "id",
    jsonCols: ["settlementSlipUrls"],
  },
  {
    table: "CompanyAccess",
    idCol: "id",
    jsonCols: ["permissions"],
  },
  {
    table: "Notification",
    idCol: "id",
    jsonCols: ["targetUserIds", "readBy", "metadata"],
  },
  {
    table: "Comment",
    idCol: "id",
    jsonCols: ["mentionedUserIds"],
  },
  {
    table: "Company",
    idCol: "id",
    jsonCols: ["aiConfig", "lineNotifySettings", "exchangeRates"],
  },
];

async function main() {
  console.log("🔧 Fixing corrupted JSON fields...\n");

  const oldClient = new pg.Client({ connectionString: OLD_DB });
  const newClient = new pg.Client({ connectionString: NEW_DB });
  await oldClient.connect();
  await newClient.connect();

  let totalFixed = 0;

  for (const { table, idCol, jsonCols } of TABLES_WITH_JSON) {
    const quoted = `"${table}"`;
    const quotedId = `"${idCol}"`;

    // Find rows where ANY json column is {} (corrupted empty object instead of array)
    // We check by comparing old vs new
    const oldRows = await oldClient.query(`SELECT * FROM ${quoted}`);

    if (oldRows.rows.length === 0) continue;

    let fixedInTable = 0;

    for (const oldRow of oldRows.rows) {
      const id = oldRow[idCol];

      for (const col of jsonCols) {
        const oldVal = oldRow[col];
        if (oldVal === null || oldVal === undefined) continue;

        const newJsonStr = JSON.stringify(oldVal);

        // Update the new DB with correctly serialized JSON
        await newClient.query(
          `UPDATE ${quoted} SET "${col}" = $1::jsonb WHERE ${quotedId} = $2`,
          [newJsonStr, id]
        );
      }
      fixedInTable++;
    }

    if (fixedInTable > 0) {
      console.log(`  ✅ ${table}: ${fixedInTable} rows × ${jsonCols.length} JSON cols re-synced`);
      totalFixed += fixedInTable;
    }
  }

  // Also apply URL replacement for any rows we just re-synced
  const oldBase = "https://dovdfnsvggqejhjzfnvv.supabase.co";
  const newBase = "https://wbplmfahkzseolgmowvu.supabase.co";

  console.log("\n🔗 Re-applying URL replacement...");

  const urlCols = [
    { table: '"Expense"', cols: ['"slipUrls"', '"taxInvoiceUrls"', '"whtCertUrls"', '"otherDocUrls"', '"referenceUrls"'] },
    { table: '"Income"', cols: ['"customerSlipUrls"', '"myBillCopyUrls"', '"whtCertUrls"', '"otherDocUrls"', '"referenceUrls"'] },
    { table: '"ReimbursementRequest"', cols: ['"receiptUrls"', '"referenceUrls"'] },
    { table: '"ExpensePayment"', cols: ['"settlementSlipUrls"'] },
  ];

  for (const { table, cols } of urlCols) {
    for (const col of cols) {
      const r = await newClient.query(
        `UPDATE ${table} SET ${col} = REPLACE(${col}::text, $1, $2)::jsonb WHERE ${col}::text LIKE $3`,
        [oldBase, newBase, `%${oldBase}%`]
      );
      if ((r.rowCount ?? 0) > 0) {
        console.log(`  ✅ ${table}.${col}: ${r.rowCount} rows URL updated`);
      }
    }
  }

  await oldClient.end();
  await newClient.end();

  console.log(`\n✨ Done! ${totalFixed} rows fixed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
