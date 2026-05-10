/**
 * Backfill `Contact.isForeign = true` สำหรับผู้ติดต่อที่เคยถูกใช้กับธุรกรรม
 * ที่บันทึกสกุลเงินต้นทาง (originalCurrency) เป็นสกุลต่างประเทศ (ไม่ใช่ THB)
 *
 * เกณฑ์การคัด:
 *   1. มี Expense อย่างน้อย 1 รายการ ที่ originalCurrency NOT NULL
 *      และ originalCurrency NOT IN ('', 'THB')
 *   2. หรือมี Income แบบเดียวกัน
 *   3. หรือ Contact.country ระบุประเทศที่ไม่ใช่ "Thailand"/"ไทย"/"TH"
 *
 * Usage (from bill-tracker/):
 *   npx tsx scripts/backfill-foreign-contacts.ts            # dry run
 *   npx tsx scripts/backfill-foreign-contacts.ts --apply    # write changes
 */

import { config } from "dotenv";
import { resolve } from "path";

const envFile = process.env.DOTENV_CONFIG_PATH ?? ".env.local";
config({ path: resolve(process.cwd(), envFile) });

const DOMESTIC_COUNTRY_VALUES = new Set([
  "thailand",
  "ไทย",
  "ประเทศไทย",
  "th",
  "tha",
  "thai",
]);

function isDomesticCountry(country: string | null | undefined): boolean {
  if (!country) return true; // ไม่กรอก = ถือว่าในประเทศ (default Thailand)
  return DOMESTIC_COUNTRY_VALUES.has(country.trim().toLowerCase());
}

interface ForeignReason {
  fromExpense: number;
  fromIncome: number;
  fromCountry: boolean;
  currencies: Set<string>;
}

async function main() {
  const { prisma } = await import("@/lib/db");
  const apply = process.argv.includes("--apply");

  console.log(apply ? "🚀 APPLY mode" : "🔍 DRY-RUN mode (เพิ่ม --apply เพื่อบันทึก)\n");

  const companies = await prisma.company.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  let totalCandidates = 0;
  let totalUpdated = 0;
  let totalAlreadySet = 0;

  for (const company of companies) {
    // 1) Find contacts via Expense ที่มี originalCurrency เป็นสกุลต่างประเทศ
    const expenseGroups = await prisma.expense.groupBy({
      by: ["contactId", "originalCurrency"],
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: { not: null },
        originalCurrency: { not: null, notIn: ["", "THB"] },
      },
      _count: { _all: true },
    });

    // 2) Find contacts via Income ที่มี originalCurrency เป็นสกุลต่างประเทศ
    const incomeGroups = await prisma.income.groupBy({
      by: ["contactId", "originalCurrency"],
      where: {
        companyId: company.id,
        deletedAt: null,
        contactId: { not: null },
        originalCurrency: { not: null, notIn: ["", "THB"] },
      },
      _count: { _all: true },
    });

    // Aggregate per contactId
    const reasonsByContact = new Map<string, ForeignReason>();

    for (const g of expenseGroups) {
      if (!g.contactId) continue;
      const r = reasonsByContact.get(g.contactId) ?? {
        fromExpense: 0,
        fromIncome: 0,
        fromCountry: false,
        currencies: new Set<string>(),
      };
      r.fromExpense += g._count._all;
      if (g.originalCurrency) r.currencies.add(g.originalCurrency);
      reasonsByContact.set(g.contactId, r);
    }

    for (const g of incomeGroups) {
      if (!g.contactId) continue;
      const r = reasonsByContact.get(g.contactId) ?? {
        fromExpense: 0,
        fromIncome: 0,
        fromCountry: false,
        currencies: new Set<string>(),
      };
      r.fromIncome += g._count._all;
      if (g.originalCurrency) r.currencies.add(g.originalCurrency);
      reasonsByContact.set(g.contactId, r);
    }

    // 3) Find contacts ที่ country ระบุประเทศต่างประเทศ
    const contactsWithCountry = await prisma.contact.findMany({
      where: { companyId: company.id },
      select: { id: true, country: true },
    });

    for (const c of contactsWithCountry) {
      if (!isDomesticCountry(c.country)) {
        const r = reasonsByContact.get(c.id) ?? {
          fromExpense: 0,
          fromIncome: 0,
          fromCountry: false,
          currencies: new Set<string>(),
        };
        r.fromCountry = true;
        reasonsByContact.set(c.id, r);
      }
    }

    if (reasonsByContact.size === 0) continue;

    // Fetch contact details
    const candidateIds = Array.from(reasonsByContact.keys());
    const contacts = await prisma.contact.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        peakCode: true,
        country: true,
        isForeign: true,
      },
      orderBy: { name: "asc" },
    });

    const contactsToUpdate = contacts.filter((c) => !c.isForeign);
    const alreadySet = contacts.filter((c) => c.isForeign);

    console.log(`\n[${company.code}] ${company.name}`);
    console.log(
      `  พบผู้ติดต่อต่างประเทศทั้งหมด: ${contacts.length}` +
        ` (จะอัปเดต ${contactsToUpdate.length}, ตั้งไว้แล้ว ${alreadySet.length})`,
    );

    for (const c of contacts) {
      const r = reasonsByContact.get(c.id)!;
      const reasons: string[] = [];
      if (r.fromExpense > 0) reasons.push(`expense×${r.fromExpense}`);
      if (r.fromIncome > 0) reasons.push(`income×${r.fromIncome}`);
      if (r.fromCountry) reasons.push(`country=${c.country ?? "?"}`);
      const currs = r.currencies.size > 0 ? ` [${Array.from(r.currencies).join(",")}]` : "";
      const tag = c.isForeign ? "  ✓" : "  →";
      const peak = c.peakCode ? `(${c.peakCode}) ` : "";
      console.log(`${tag} ${peak}${c.name} — ${reasons.join(", ")}${currs}`);
    }

    totalCandidates += contacts.length;
    totalAlreadySet += alreadySet.length;

    if (apply && contactsToUpdate.length > 0) {
      const result = await prisma.contact.updateMany({
        where: { id: { in: contactsToUpdate.map((c) => c.id) } },
        data: { isForeign: true },
      });
      totalUpdated += result.count;
    } else {
      totalUpdated += contactsToUpdate.length;
    }
  }

  console.log("\n----------------------------------------");
  console.log(`พบผู้ติดต่อต่างประเทศทั้งหมด: ${totalCandidates} ราย`);
  console.log(`  - ตั้งค่าไว้แล้ว:        ${totalAlreadySet} ราย`);
  console.log(
    `  - ${apply ? "อัปเดตแล้ว" : "จะอัปเดต"}:           ${totalUpdated} ราย`,
  );
  if (!apply) {
    console.log("\n(dry-run — รันด้วย --apply เพื่อบันทึกลงฐานข้อมูล)");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
