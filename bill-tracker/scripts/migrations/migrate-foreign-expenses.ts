/**
 * Migrate foreign currency expenses that are missing originalCurrency.
 *
 * Strategy:
 * - Find contacts that have at least one expense WITH originalCurrency set
 * - For those contacts, find other expenses WITHOUT originalCurrency
 * - Also include known foreign contacts (e.g. Namecheap) by name match
 * - Backfill originalCurrency, originalAmount, exchangeRate using
 *   the company's configured exchange rate
 *
 * Usage:
 *   npx tsx scripts/migrate-foreign-expenses.ts          # dry-run
 *   npx tsx scripts/migrate-foreign-expenses.ts --apply   # actually update
 */

import pg from "pg";
import "dotenv/config";

const DB = process.env.DATABASE_URL ?? "";
if (!DB) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Known foreign contacts that may not have any existing originalCurrency record
const KNOWN_FOREIGN_CONTACTS: Record<string, string> = {
  "namecheap": "USD",
  "godaddy": "USD",
  "cloudflare": "USD",
  "google cloud": "USD",
  "amazon web services": "USD",
  "aws": "USD",
  "digitalocean": "USD",
  "github": "USD",
  "stripe": "USD",
  "openai": "USD",
  "anthropic": "USD",
  "vercel": "USD",
  "heroku": "USD",
  "netlify": "USD",
  "figma": "USD",
  "notion": "USD",
  "slack": "USD",
  "zoom": "USD",
  "adobe": "USD",
  "canva": "USD",
  "lovable": "USD",
};

async function main() {
  const pool = new pg.Pool({
    connectionString: DB,
    ssl: DB.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log(`=== Foreign Expense Migration (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

    // 1. Get company exchange rates
    const companies = await pool.query(`
      SELECT id, code, name, "exchangeRates" FROM "Company" ORDER BY code
    `);
    const companyRates = new Map<string, Record<string, number>>();
    for (const c of companies.rows) {
      const rates = (c.exchangeRates ?? {}) as Record<string, number>;
      companyRates.set(c.id, rates);
      if (Object.keys(rates).length > 0) {
        console.log(`Company ${c.code}: ${JSON.stringify(rates)}`);
      }
    }

    // 2. Find contacts that have at least one foreign expense
    const foreignContacts = await pool.query(`
      SELECT DISTINCT e."contactId", c.name, e."originalCurrency"
      FROM "Expense" e
      JOIN "Contact" c ON e."contactId" = c.id
      WHERE e."deletedAt" IS NULL
        AND e."originalCurrency" IS NOT NULL
        AND e."originalCurrency" NOT IN ('THB', '')
    `);
    const contactCurrencyMap = new Map<string, string>();
    for (const r of foreignContacts.rows) {
      if (r.contactId && r.originalCurrency) {
        contactCurrencyMap.set(r.contactId, r.originalCurrency);
      }
    }
    console.log(`\nFound ${contactCurrencyMap.size} contacts with known foreign currency`);

    // 3. Find expenses WITHOUT originalCurrency for these contacts
    const contactIds = Array.from(contactCurrencyMap.keys());

    // Also find contacts matching known foreign names
    const knownNamePatterns = Object.keys(KNOWN_FOREIGN_CONTACTS)
      .map((name) => `c.name ILIKE '%${name}%'`)
      .join(" OR ");

    const missingExpenses = await pool.query(`
      SELECT e.id, e."companyId", e."contactId", e."billDate", e.description,
             e.amount AS thb_amount, e."vatAmount",
             c.name AS contact_name
      FROM "Expense" e
      LEFT JOIN "Contact" c ON e."contactId" = c.id
      WHERE e."deletedAt" IS NULL
        AND (e."originalCurrency" IS NULL OR e."originalCurrency" IN ('THB', ''))
        AND (
          e."contactId" = ANY($1)
          ${knownNamePatterns ? `OR (${knownNamePatterns})` : ""}
        )
      ORDER BY e."billDate" DESC
    `, [contactIds]);

    console.log(`Found ${missingExpenses.rows.length} expenses to migrate\n`);

    if (missingExpenses.rows.length === 0) {
      console.log("Nothing to migrate!");
      await pool.end();
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const exp of missingExpenses.rows) {
      // Determine currency from contact map or known names
      let currency = contactCurrencyMap.get(exp.contactId);
      if (!currency && exp.contact_name) {
        const nameLower = exp.contact_name.toLowerCase();
        for (const [pattern, cur] of Object.entries(KNOWN_FOREIGN_CONTACTS)) {
          if (nameLower.includes(pattern)) {
            currency = cur;
            break;
          }
        }
      }

      if (!currency) {
        console.log(`  SKIP: ${exp.billDate?.toISOString().slice(0, 10)} | ${exp.contact_name} - no currency determined`);
        skipped++;
        continue;
      }

      // Get exchange rate from company settings
      const rates = companyRates.get(exp.companyId) ?? {};
      const exchangeRate = rates[currency];

      if (!exchangeRate || exchangeRate <= 0) {
        console.log(`  SKIP: ${exp.billDate?.toISOString().slice(0, 10)} | ${exp.contact_name} - no ${currency} rate for company`);
        skipped++;
        continue;
      }

      const thbAmount = Number(exp.thb_amount);
      const originalAmount = Math.round((thbAmount / exchangeRate) * 100) / 100;

      console.log(
        `  ${APPLY ? "UPDATE" : "WOULD UPDATE"}: ${exp.billDate?.toISOString().slice(0, 10)} | ${(exp.contact_name ?? exp.description ?? "-").slice(0, 30).padEnd(30)} | ฿${thbAmount.toFixed(2).padStart(12)} → ${currency} ${originalAmount.toFixed(2)} @ ${exchangeRate}`
      );

      if (APPLY) {
        await pool.query(
          `UPDATE "Expense" SET "originalCurrency" = $1, "originalAmount" = $2, "exchangeRate" = $3 WHERE id = $4`,
          [currency, originalAmount, exchangeRate, exp.id]
        );
      }
      updated++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`${APPLY ? "Updated" : "Would update"}: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    if (!APPLY && updated > 0) {
      console.log(`\nRun with --apply to actually update the database`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
