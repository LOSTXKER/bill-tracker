/**
 * Backfill เลขที่เอกสาร (documentCode) สำหรับ Expense / Income ที่ยังไม่มีรหัส
 *
 * รูปแบบ:
 *   - Expense: PV-YYYYMM-NNNN (Payment Voucher / ใบสำคัญจ่าย)
 *   - Income : RV-YYYYMM-NNNN (Receipt Voucher / ใบสำคัญรับ)
 *
 * เรียงตามวันที่บิล/วันที่รับเงิน (asc) และ createdAt เป็นรอง
 * เพื่อให้รหัสเอกสารเก่าถูกออกตามลำดับเวลาที่เกิดจริง
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-document-codes.ts            # dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-document-codes.ts --execute  # apply
 */

import { prisma } from "@/lib/db";

const execute = process.argv.includes("--execute");

type Kind = "expense" | "income";

const PREFIX: Record<Kind, string> = {
  expense: "PV",
  income: "RV",
};

function buildKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

async function backfillKind(kind: Kind) {
  console.log(`\n=== ${kind.toUpperCase()} ===`);
  const dateField = kind === "expense" ? "billDate" : "receiveDate";

  const companies = await prisma.company.findMany({ select: { id: true, name: true, code: true } });
  console.log(`พบบริษัท ${companies.length} แห่ง`);

  let totalAssigned = 0;

  for (const company of companies) {
    const model = (kind === "expense" ? prisma.expense : prisma.income) as unknown as {
      findMany: (args: unknown) => Promise<Array<{ id: string; documentCode: string | null; [k: string]: unknown }>>;
      update: (args: unknown) => Promise<unknown>;
    };

    const rows = await model.findMany({
      where: { companyId: company.id, documentCode: null },
      orderBy: [{ [dateField]: "asc" }, { createdAt: "asc" }],
      select: { id: true, documentCode: true, [dateField]: true, createdAt: true },
    });

    if (rows.length === 0) continue;

    // Find max running number per YYYYMM bucket already in DB (in case some have codes)
    const existing = await model.findMany({
      where: { companyId: company.id, documentCode: { not: null } },
      select: { documentCode: true },
    });

    const counters = new Map<string, number>();
    for (const e of existing) {
      const code = e.documentCode as string | null;
      if (!code) continue;
      const m = code.match(new RegExp(`^${PREFIX[kind]}-(\\d{6})-(\\d+)$`));
      if (!m) continue;
      const key = m[1];
      const n = parseInt(m[2], 10);
      if (!Number.isFinite(n)) continue;
      counters.set(key, Math.max(counters.get(key) ?? 0, n));
    }

    const updates: Array<{ id: string; code: string }> = [];
    for (const row of rows) {
      const dt = row[dateField] as Date | null;
      const date = dt ? new Date(dt) : new Date();
      const key = buildKey(date);
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      const code = `${PREFIX[kind]}-${key}-${String(next).padStart(4, "0")}`;
      updates.push({ id: row.id, code });
    }

    console.log(`  [${company.code}] ${company.name}: ${updates.length} รายการ`);
    if (updates.length > 0) {
      const sample = updates.slice(0, 3).map((u) => u.code).join(", ");
      console.log(`    ตัวอย่าง: ${sample}${updates.length > 3 ? ", ..." : ""}`);
    }

    if (execute) {
      // Run updates sequentially per row (small N per company; keeps it simple/safe)
      for (const u of updates) {
        await model.update({ where: { id: u.id }, data: { documentCode: u.code } });
      }
    }
    totalAssigned += updates.length;
  }

  console.log(`รวม ${kind}: ${totalAssigned} รายการ`);
  return totalAssigned;
}

async function main() {
  console.log(execute ? "EXECUTE mode" : "DRY-RUN mode (เพิ่ม --execute เพื่อบันทึก)");

  const e = await backfillKind("expense");
  const i = await backfillKind("income");

  console.log("\n----------------------------------");
  console.log(`รวมทั้งหมด: expense=${e}, income=${i}`);
  if (!execute) console.log("Dry run เสร็จ ไม่มีการเปลี่ยนแปลงในฐานข้อมูล");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
