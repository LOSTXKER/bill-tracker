/**
 * Fix foreign expenses with incorrect VAT and recalculate all tax amounts.
 *
 * Two phases:
 *   1. Foreign expenses with VAT 7% → set to 0%, documentType CASH_RECEIPT
 *   2. All expenses/incomes → recalculate vatAmount, whtAmount, netPaid/netReceived
 *      from (amount, vatRate, whtRate) to ensure consistency
 *
 * Usage:
 *   npx tsx scripts/migrations/fix-foreign-vat-and-recalculate.ts            # dry-run
 *   npx tsx scripts/migrations/fix-foreign-vat-and-recalculate.ts --execute  # apply
 */

import pg from "pg";
import "dotenv/config";

const DB = process.env.DATABASE_URL ?? "";
if (!DB) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const EXECUTE = process.argv.includes("--execute");

function calculateVAT(base: number, vatRate: number): number {
  return Math.round((base * vatRate) / 100 * 100) / 100;
}

function calculateWHT(base: number, whtRate: number): number {
  return Math.round((base * whtRate) / 100 * 100) / 100;
}

function recalc(amount: number, vatRate: number, whtRate: number) {
  const vatAmount = calculateVAT(amount, vatRate);
  const whtAmount = calculateWHT(amount, whtRate);
  const totalWithVat = amount + vatAmount;
  const netAmount = totalWithVat - whtAmount;
  return { vatAmount, whtAmount, netAmount };
}

async function main() {
  const pool = new pg.Pool({
    connectionString: DB,
    ssl: DB.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`  Foreign VAT Fix & Tax Recalculation (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);
    console.log(`${"=".repeat(70)}\n`);

    // =====================================================================
    // Phase 1: Foreign expenses with VAT 7%
    // =====================================================================
    console.log("--- Phase 1: Foreign expenses with VAT != 0 ---\n");

    const foreignExpenses = await pool.query(`
      SELECT id, description, "originalCurrency", amount, "vatRate", "vatAmount",
             "isWht", "whtRate", "whtAmount", "netPaid", "documentType"
      FROM "Expense"
      WHERE "deletedAt" IS NULL
        AND "originalCurrency" IS NOT NULL
        AND "originalCurrency" NOT IN ('THB', '')
        AND "vatRate" > 0
      ORDER BY "billDate" DESC
    `);

    console.log(`Found ${foreignExpenses.rows.length} foreign expenses with VAT > 0\n`);

    let phase1Fixed = 0;
    for (const row of foreignExpenses.rows) {
      const amount = Number(row.amount);
      const oldVatRate = Number(row.vatRate);
      const whtRate = row.isWht ? Number(row.whtRate || 0) : 0;

      const oldCalc = recalc(amount, oldVatRate, whtRate);
      const newCalc = recalc(amount, 0, whtRate);

      console.log(`  ${row.id.slice(0, 8)}  ${(row.description || "-").slice(0, 40).padEnd(40)}  ${row.originalCurrency}`);
      console.log(`    BEFORE: vatRate=${oldVatRate}% vat=${Number(row.vatAmount).toFixed(2)} net=${Number(row.netPaid).toFixed(2)}`);
      console.log(`    AFTER:  vatRate=0%  vat=0.00 net=${newCalc.netAmount.toFixed(2)}`);

      if (EXECUTE) {
        await pool.query(
          `UPDATE "Expense"
           SET "vatRate" = 0, "vatAmount" = 0, "whtAmount" = $1, "netPaid" = $2,
               "documentType" = CASE WHEN "documentType" = 'TAX_INVOICE' THEN 'CASH_RECEIPT' ELSE "documentType" END
           WHERE id = $3`,
          [newCalc.whtAmount, newCalc.netAmount, row.id]
        );
      }
      phase1Fixed++;
    }

    // Also check foreign incomes
    const foreignIncomes = await pool.query(`
      SELECT id, source, "originalCurrency", amount, "vatRate", "vatAmount",
             "isWhtDeducted", "whtRate", "whtAmount", "netReceived"
      FROM "Income"
      WHERE "deletedAt" IS NULL
        AND "originalCurrency" IS NOT NULL
        AND "originalCurrency" NOT IN ('THB', '')
        AND "vatRate" > 0
      ORDER BY "receiveDate" DESC
    `);

    console.log(`\nFound ${foreignIncomes.rows.length} foreign incomes with VAT > 0\n`);

    let phase1IncomesFixed = 0;
    for (const row of foreignIncomes.rows) {
      const amount = Number(row.amount);
      const oldVatRate = Number(row.vatRate);
      const whtRate = row.isWhtDeducted ? Number(row.whtRate || 0) : 0;

      const newCalc = recalc(amount, 0, whtRate);

      console.log(`  ${row.id.slice(0, 8)}  ${(row.source || "-").slice(0, 40).padEnd(40)}  ${row.originalCurrency}`);
      console.log(`    BEFORE: vatRate=${oldVatRate}% vat=${Number(row.vatAmount).toFixed(2)} net=${Number(row.netReceived).toFixed(2)}`);
      console.log(`    AFTER:  vatRate=0%  vat=0.00 net=${newCalc.netAmount.toFixed(2)}`);

      if (EXECUTE) {
        await pool.query(
          `UPDATE "Income"
           SET "vatRate" = 0, "vatAmount" = 0, "whtAmount" = $1, "netReceived" = $2
           WHERE id = $3`,
          [newCalc.whtAmount, newCalc.netAmount, row.id]
        );
      }
      phase1IncomesFixed++;
    }

    // =====================================================================
    // Phase 2: Recalculate all transactions for consistency
    // =====================================================================
    console.log(`\n--- Phase 2: Check all expenses for inconsistent tax math ---\n`);

    const allExpenses = await pool.query(`
      SELECT id, description, amount, "vatRate", "vatAmount", "isWht", "whtRate", "whtAmount", "netPaid"
      FROM "Expense"
      WHERE "deletedAt" IS NULL
      ORDER BY "billDate" DESC
    `);

    let phase2ExpenseFixed = 0;
    let phase2ExpenseOk = 0;
    for (const row of allExpenses.rows) {
      const amount = Number(row.amount);
      const vatRate = Number(row.vatRate || 0);
      const whtRate = row.isWht ? Number(row.whtRate || 0) : 0;
      const expected = recalc(amount, vatRate, whtRate);

      const storedVat = Number(row.vatAmount || 0);
      const storedWht = Number(row.whtAmount || 0);
      const storedNet = Number(row.netPaid || 0);

      const vatDiff = Math.abs(storedVat - expected.vatAmount);
      const whtDiff = Math.abs(storedWht - expected.whtAmount);
      const netDiff = Math.abs(storedNet - expected.netAmount);

      if (vatDiff > 0.01 || whtDiff > 0.01 || netDiff > 0.01) {
        console.log(`  ${row.id.slice(0, 8)}  ${(row.description || "-").slice(0, 40).padEnd(40)}`);
        console.log(`    STORED:   vat=${storedVat.toFixed(2)} wht=${storedWht.toFixed(2)} net=${storedNet.toFixed(2)}`);
        console.log(`    EXPECTED: vat=${expected.vatAmount.toFixed(2)} wht=${expected.whtAmount.toFixed(2)} net=${expected.netAmount.toFixed(2)}`);

        if (EXECUTE) {
          await pool.query(
            `UPDATE "Expense" SET "vatAmount" = $1, "whtAmount" = $2, "netPaid" = $3 WHERE id = $4`,
            [expected.vatAmount || null, expected.whtAmount || null, expected.netAmount, row.id]
          );
        }
        phase2ExpenseFixed++;
      } else {
        phase2ExpenseOk++;
      }
    }

    console.log(`\n  Expenses: ${phase2ExpenseFixed} inconsistent, ${phase2ExpenseOk} OK`);

    console.log(`\n--- Phase 2b: Check all incomes for inconsistent tax math ---\n`);

    const allIncomes = await pool.query(`
      SELECT id, source, amount, "vatRate", "vatAmount", "isWhtDeducted", "whtRate", "whtAmount", "netReceived"
      FROM "Income"
      WHERE "deletedAt" IS NULL
      ORDER BY "receiveDate" DESC
    `);

    let phase2IncomeFixed = 0;
    let phase2IncomeOk = 0;
    for (const row of allIncomes.rows) {
      const amount = Number(row.amount);
      const vatRate = Number(row.vatRate || 0);
      const whtRate = row.isWhtDeducted ? Number(row.whtRate || 0) : 0;
      const expected = recalc(amount, vatRate, whtRate);

      const storedVat = Number(row.vatAmount || 0);
      const storedWht = Number(row.whtAmount || 0);
      const storedNet = Number(row.netReceived || 0);

      const vatDiff = Math.abs(storedVat - expected.vatAmount);
      const whtDiff = Math.abs(storedWht - expected.whtAmount);
      const netDiff = Math.abs(storedNet - expected.netAmount);

      if (vatDiff > 0.01 || whtDiff > 0.01 || netDiff > 0.01) {
        console.log(`  ${row.id.slice(0, 8)}  ${(row.source || "-").slice(0, 40).padEnd(40)}`);
        console.log(`    STORED:   vat=${storedVat.toFixed(2)} wht=${storedWht.toFixed(2)} net=${storedNet.toFixed(2)}`);
        console.log(`    EXPECTED: vat=${expected.vatAmount.toFixed(2)} wht=${expected.whtAmount.toFixed(2)} net=${expected.netAmount.toFixed(2)}`);

        if (EXECUTE) {
          await pool.query(
            `UPDATE "Income" SET "vatAmount" = $1, "whtAmount" = $2, "netReceived" = $3 WHERE id = $4`,
            [expected.vatAmount || null, expected.whtAmount || null, expected.netAmount, row.id]
          );
        }
        phase2IncomeFixed++;
      } else {
        phase2IncomeOk++;
      }
    }

    console.log(`\n  Incomes: ${phase2IncomeFixed} inconsistent, ${phase2IncomeOk} OK`);

    // =====================================================================
    // Summary
    // =====================================================================
    console.log(`\n${"=".repeat(70)}`);
    console.log(`  Summary (${EXECUTE ? "EXECUTED" : "DRY RUN"})`);
    console.log(`${"=".repeat(70)}`);
    console.log(`  Phase 1 - Foreign expenses VAT fix: ${phase1Fixed}`);
    console.log(`  Phase 1 - Foreign incomes VAT fix:  ${phase1IncomesFixed}`);
    console.log(`  Phase 2 - Expenses recalculated:    ${phase2ExpenseFixed}`);
    console.log(`  Phase 2 - Incomes recalculated:     ${phase2IncomeFixed}`);
    console.log(`${"=".repeat(70)}`);

    if (!EXECUTE && (phase1Fixed + phase1IncomesFixed + phase2ExpenseFixed + phase2IncomeFixed) > 0) {
      console.log(`\n  Run with --execute to apply changes.\n`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
