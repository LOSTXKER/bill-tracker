import pg from "pg";
import "dotenv/config";

const DB = process.env.DATABASE_URL ?? "";
const pool = new pg.Pool({
  connectionString: DB,
  ssl: DB.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  // Search broadly for namecheap or similar
  const res = await pool.query(`
    SELECT e.id, e."billDate", e.description, c.name AS contact_name,
           e."originalCurrency", e."originalAmount", e."exchangeRate",
           e.amount AS thb_amount, e."vatAmount"
    FROM "Expense" e
    LEFT JOIN "Contact" c ON e."contactId" = c.id
    WHERE e."deletedAt" IS NULL
      AND (
        c.name ILIKE '%namecheap%' OR e.description ILIKE '%namecheap%'
        OR c.name ILIKE '%namechaep%' OR e.description ILIKE '%namechaep%'
        OR c.name ILIKE '%name cheap%' OR e.description ILIKE '%name cheap%'
      )
    ORDER BY e."billDate" DESC
    LIMIT 20
  `);
  
  console.log("Namecheap expenses found:", res.rows.length);
  for (const r of res.rows) {
    console.log(
      r.billDate?.toISOString().slice(0, 10),
      "|", (r.contact_name ?? r.description ?? "-").slice(0, 35).padEnd(35),
      "| cur:", (r.originalCurrency ?? "(null)").padEnd(6),
      "| THB:", Number(r.thb_amount).toFixed(2).padStart(12),
      "| orig:", r.originalAmount ? Number(r.originalAmount).toFixed(2) : "(null)"
    );
  }

  // Also search all contacts that have at least one foreign expense
  console.log("\n--- Contacts that have foreign expenses (originalCurrency set) ---");
  const foreignContacts = await pool.query(`
    SELECT DISTINCT c.id, c.name, e."originalCurrency",
           COUNT(*) AS expense_count
    FROM "Expense" e
    JOIN "Contact" c ON e."contactId" = c.id
    WHERE e."deletedAt" IS NULL
      AND e."originalCurrency" IS NOT NULL
      AND e."originalCurrency" NOT IN ('THB', '')
    GROUP BY c.id, c.name, e."originalCurrency"
    ORDER BY c.name
  `);
  for (const r of foreignContacts.rows) {
    console.log("  ", r.name, `(${r.originalCurrency})`, `- ${r.expense_count} expenses`);
  }

  // Now check: do these same contacts have OTHER expenses WITHOUT originalCurrency?
  console.log("\n--- Same contacts' expenses WITHOUT originalCurrency ---");
  const contactIds = foreignContacts.rows.map((r: any) => r.id);
  if (contactIds.length > 0) {
    const missing = await pool.query(`
      SELECT c.name AS contact_name, COUNT(*) AS count,
             SUM(e.amount::numeric) AS total_thb
      FROM "Expense" e
      JOIN "Contact" c ON e."contactId" = c.id
      WHERE e."deletedAt" IS NULL
        AND e."contactId" = ANY($1)
        AND (e."originalCurrency" IS NULL OR e."originalCurrency" IN ('THB', ''))
      GROUP BY c.name
      ORDER BY count DESC
    `, [contactIds]);
    
    if (missing.rows.length === 0) {
      console.log("  None - all expenses from these contacts have originalCurrency set");
    } else {
      for (const r of missing.rows) {
        console.log(
          "  ", r.contact_name,
          `- ${r.count} expenses without originalCurrency`,
          `(total: ฿${Number(r.total_thb).toLocaleString("th-TH", { minimumFractionDigits: 2 })})`
        );
      }
    }
  }

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
