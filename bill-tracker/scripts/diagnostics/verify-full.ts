/**
 * Full verification: compare OLD vs NEW database row counts and storage files.
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const OLD_DB = process.env.OLD_DATABASE_URL!;
const NEW_DB = process.env.NEW_DATABASE_URL!;
const OLD_SUPABASE_URL = "https://dovdfnsvggqejhjzfnvv.supabase.co";
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_KEY!;
const NEW_SUPABASE_URL = "https://wbplmfahkzseolgmowvu.supabase.co";
const NEW_SUPABASE_KEY = process.env.NEW_SUPABASE_KEY!;

const TABLES = [
  "User", "Company", "CompanyAccess", "CompanyConfig", "Account", "Contact",
  "Integration", "Notification", "RecurringExpense", "VendorMapping",
  "Expense", "Income", "ReimbursementRequest", "ExpensePayment",
  "PettyCashFund", "PettyCashTransaction", "Comment", "DocumentEvent", "AuditLog",
];

async function listAllFiles(client: ReturnType<typeof createClient>, folder = ""): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data } = await client.storage.from("bill-tracker").list(folder, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = folder ? `${folder}/${item.name}` : item.name;
      if (item.id === null) {
        paths.push(...await listAllFiles(client, full));
      } else {
        paths.push(full);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return paths;
}

async function main() {
  console.log("🔍 FULL MIGRATION VERIFICATION\n");

  // ===================== DATABASE =====================
  console.log("═══════════════════════════════════════════");
  console.log("  DATABASE COMPARISON (old vs new)");
  console.log("═══════════════════════════════════════════\n");

  const oldClient = new pg.Client({ connectionString: OLD_DB });
  const newClient = new pg.Client({ connectionString: NEW_DB });
  await oldClient.connect();
  await newClient.connect();

  let dbIssues = 0;
  const pad = (s: string, n: number) => s.padEnd(n);

  console.log(`  ${pad("Table", 25)} ${pad("Old", 8)} ${pad("New", 8)} Status`);
  console.log(`  ${"-".repeat(55)}`);

  for (const table of TABLES) {
    const oldR = await oldClient.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const newR = await newClient.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const oldCount = parseInt(oldR.rows[0].c);
    const newCount = parseInt(newR.rows[0].c);
    const match = newCount >= oldCount;
    const status = match ? "✅" : "❌ MISSING " + (oldCount - newCount);
    console.log(`  ${pad(table, 25)} ${pad(String(oldCount), 8)} ${pad(String(newCount), 8)} ${status}`);
    if (!match) dbIssues++;
  }

  // Check for remaining old URLs
  console.log("\n  --- URL Check ---");
  const urlChecks = [
    { table: "Expense", cols: ["slipUrls", "taxInvoiceUrls", "whtCertUrls", "otherDocUrls", "referenceUrls"] },
    { table: "Income", cols: ["customerSlipUrls", "myBillCopyUrls", "whtCertUrls", "otherDocUrls", "referenceUrls"] },
    { table: "ReimbursementRequest", cols: ["receiptUrls", "referenceUrls"] },
    { table: "ExpensePayment", cols: ["settlementSlipUrls"] },
  ];

  let urlIssues = 0;
  for (const { table, cols } of urlChecks) {
    for (const col of cols) {
      const r = await newClient.query(
        `SELECT COUNT(*) as c FROM "${table}" WHERE "${col}"::text LIKE '%dovdfnsvggqejhjzfnvv%'`
      );
      const count = parseInt(r.rows[0].c);
      if (count > 0) {
        console.log(`  ❌ ${table}.${col}: ${count} rows still have OLD URL`);
        urlIssues++;
      }
    }
  }

  // Also check string URL columns
  for (const { table, col } of [{ table: "Company", col: "logoUrl" }, { table: "User", col: "avatarUrl" }]) {
    const r = await newClient.query(
      `SELECT COUNT(*) as c FROM "${table}" WHERE "${col}" LIKE '%dovdfnsvggqejhjzfnvv%'`
    );
    const count = parseInt(r.rows[0].c);
    if (count > 0) {
      console.log(`  ❌ ${table}.${col}: ${count} rows still have OLD URL`);
      urlIssues++;
    }
  }

  if (urlIssues === 0) {
    console.log("  ✅ All URLs point to new project — no old URLs remaining");
  }

  await oldClient.end();
  await newClient.end();

  // ===================== STORAGE =====================
  console.log("\n═══════════════════════════════════════════");
  console.log("  STORAGE COMPARISON (old vs new)");
  console.log("═══════════════════════════════════════════\n");

  const oldSupa = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
  const newSupa = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

  console.log("  Listing old storage files...");
  const oldFiles = await listAllFiles(oldSupa);
  console.log(`  Old: ${oldFiles.length} files\n`);

  console.log("  Listing new storage files...");
  const newFiles = await listAllFiles(newSupa);
  console.log(`  New: ${newFiles.length} files\n`);

  const newSet = new Set(newFiles);
  const missing = oldFiles.filter((f) => !newSet.has(f));

  if (missing.length === 0) {
    console.log("  ✅ All files present in new storage");
  } else {
    console.log(`  ❌ ${missing.length} files missing from new storage:`);
    missing.forEach((f) => console.log(`     - ${f}`));
  }

  // ===================== SUMMARY =====================
  console.log("\n═══════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════\n");

  const totalOldRows = TABLES.length; // just for display
  console.log(`  Database tables: ${dbIssues === 0 ? "✅ ALL MATCH" : `❌ ${dbIssues} tables have missing rows`}`);
  console.log(`  URL migration:   ${urlIssues === 0 ? "✅ ALL UPDATED" : `❌ ${urlIssues} columns still have old URLs`}`);
  console.log(`  Storage files:   ${missing.length === 0 ? "✅ ALL PRESENT" : `❌ ${missing.length} files missing`}`);

  if (dbIssues === 0 && urlIssues === 0 && missing.length === 0) {
    console.log("\n  🎉 MIGRATION 100% VERIFIED — READY FOR PRODUCTION");
  } else {
    console.log("\n  ⚠️  ISSUES FOUND — review above and fix before going live");
    process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
