/**
 * Diagnose foreign currency expense data.
 * Checks which expenses have originalCurrency set and would appear in PP36.
 *
 * Usage:
 *   npx tsx scripts/diagnose-foreign-expenses.ts
 *
 * Requires DATABASE_URL in .env or environment.
 */

import pg from "pg";
import "dotenv/config";

const DB = process.env.DATABASE_URL ?? "";
if (!DB) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({
    connectionString: DB,
    ssl: DB.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("=== Foreign Currency Expense Diagnostic ===\n");

    // 1. Count expenses by originalCurrency
    const currencyBreakdown = await pool.query(`
      SELECT
        COALESCE("originalCurrency", '(null)') AS currency,
        COUNT(*) AS count,
        SUM("amount"::numeric) AS total_thb
      FROM "Expense"
      WHERE "deletedAt" IS NULL
      GROUP BY "originalCurrency"
      ORDER BY count DESC
    `);

    console.log("1. Expenses by originalCurrency:");
    console.log("   %-10s %-8s %s", "Currency", "Count", "Total (THB)");
    console.log("   " + "-".repeat(40));
    for (const row of currencyBreakdown.rows) {
      console.log(
        "   %-10s %-8s %s",
        row.currency,
        row.count,
        Number(row.total_thb).toLocaleString("th-TH", { minimumFractionDigits: 2 })
      );
    }

    // 2. PP36-eligible count
    const pp36Count = await pool.query(`
      SELECT COUNT(*) AS count
      FROM "Expense"
      WHERE "deletedAt" IS NULL
        AND "originalCurrency" IS NOT NULL
        AND "originalCurrency" NOT IN ('THB', '')
    `);
    console.log(`\n2. PP36-eligible expenses (originalCurrency not null/THB/empty): ${pp36Count.rows[0].count}`);

    // 3. Sample PP36-eligible expenses
    const pp36Samples = await pool.query(`
      SELECT
        e.id,
        e."billDate",
        e."description",
        c.name AS contact_name,
        e."originalCurrency",
        e."originalAmount",
        e."exchangeRate",
        e."amount" AS thb_amount
      FROM "Expense" e
      LEFT JOIN "Contact" c ON e."contactId" = c.id
      WHERE e."deletedAt" IS NULL
        AND e."originalCurrency" IS NOT NULL
        AND e."originalCurrency" NOT IN ('THB', '')
      ORDER BY e."billDate" DESC
      LIMIT 10
    `);
    if (pp36Samples.rows.length > 0) {
      console.log("\n3. Sample PP36-eligible expenses (latest 10):");
      for (const row of pp36Samples.rows) {
        console.log(
          "   %s | %s | %s | %s %s @ %s = ฿%s",
          row.billDate?.toISOString().slice(0, 10) ?? "?",
          (row.contact_name ?? row.description ?? "—").slice(0, 30),
          row.originalCurrency,
          row.originalCurrency,
          Number(row.originalAmount).toFixed(2),
          Number(row.exchangeRate).toFixed(4),
          Number(row.thb_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })
        );
      }
    } else {
      console.log("\n3. No PP36-eligible expenses found.");
    }

    // 4. Company exchange rates
    const companies = await pool.query(`
      SELECT code, name, "exchangeRates"
      FROM "Company"
      ORDER BY code
    `);
    console.log("\n4. Company exchange rate settings:");
    for (const row of companies.rows) {
      const rates = row.exchangeRates ?? {};
      const rateStr = Object.keys(rates).length > 0
        ? Object.entries(rates).map(([k, v]) => `${k}: ฿${v}`).join(", ")
        : "(no rates configured)";
      console.log("   %s (%s): %s", row.code, row.name, rateStr);
    }

    // 5. Potential foreign expenses without originalCurrency
    const potentialForeign = await pool.query(`
      SELECT COUNT(*) AS count
      FROM "Expense"
      WHERE "deletedAt" IS NULL
        AND "originalCurrency" IS NULL
        AND (
          "description" ~* '(USD|AED|EUR|GBP|JPY|\\$|dollar|dirham)'
          OR "notes" ~* '(USD|AED|EUR|GBP|JPY|\\$|dollar|dirham)'
        )
    `);
    console.log(
      "\n5. Expenses WITHOUT originalCurrency but with currency keywords in description/notes: %s",
      potentialForeign.rows[0].count
    );

    if (Number(potentialForeign.rows[0].count) > 0) {
      const samples = await pool.query(`
        SELECT
          e.id,
          e."billDate",
          e."description",
          e.notes,
          c.name AS contact_name,
          e."amount" AS thb_amount
        FROM "Expense" e
        LEFT JOIN "Contact" c ON e."contactId" = c.id
        WHERE e."deletedAt" IS NULL
          AND e."originalCurrency" IS NULL
          AND (
            e."description" ~* '(USD|AED|EUR|GBP|JPY|\\$|dollar|dirham)'
            OR e."notes" ~* '(USD|AED|EUR|GBP|JPY|\\$|dollar|dirham)'
          )
        ORDER BY e."billDate" DESC
        LIMIT 5
      `);
      console.log("   Samples:");
      for (const row of samples.rows) {
        console.log(
          "   %s | %s | %s | ฿%s",
          row.billDate?.toISOString().slice(0, 10) ?? "?",
          (row.contact_name ?? "—").slice(0, 25),
          (row.description ?? "—").slice(0, 40),
          Number(row.thb_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })
        );
      }
    }

    // 6. PP36-eligible by month
    const byMonth = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM "billDate") AS yr,
        EXTRACT(MONTH FROM "billDate") AS mo,
        COUNT(*) AS count
      FROM "Expense"
      WHERE "deletedAt" IS NULL
        AND "originalCurrency" IS NOT NULL
        AND "originalCurrency" NOT IN ('THB', '')
      GROUP BY yr, mo
      ORDER BY yr DESC, mo DESC
      LIMIT 12
    `);
    if (byMonth.rows.length > 0) {
      console.log("\n6. PP36-eligible expenses by month:");
      for (const row of byMonth.rows) {
        console.log("   %s/%s: %s items", String(row.yr).slice(0, 4), String(row.mo).padStart(2, "0"), row.count);
      }
    }

    console.log("\n=== Done ===");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
