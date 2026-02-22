import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const allPayments = await prisma.expensePayment.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      expenseId: true,
      paidByType: true,
      paidByUserId: true,
      paidByPettyCashFundId: true,
      amount: true,
      settlementStatus: true,
      createdAt: true,
    },
  });

  console.log(`Total payments found: ${allPayments.length}`);

  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const payment of allPayments) {
    let key: string;
    if (payment.paidByType === "USER" && payment.paidByUserId) {
      key = `${payment.expenseId}:USER:${payment.paidByUserId}`;
    } else if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
      key = `${payment.expenseId}:PETTY_CASH:${payment.paidByPettyCashFundId}`;
    } else {
      key = `${payment.expenseId}:${payment.paidByType}:${payment.amount}`;
    }

    if (seen.has(key)) {
      duplicateIds.push(payment.id);
      console.log(`  Duplicate: expense=${payment.expenseId}, type=${payment.paidByType}, user=${payment.paidByUserId}, amount=${payment.amount}, status=${payment.settlementStatus}`);
    } else {
      seen.set(key, payment.id);
    }
  }

  console.log(`\nFound ${duplicateIds.length} duplicate payment(s)`);

  if (duplicateIds.length > 0) {
    const result = await prisma.expensePayment.deleteMany({
      where: { id: { in: duplicateIds } },
    });
    console.log(`Deleted ${result.count} duplicate payment(s)`);
  } else {
    console.log("No duplicates to clean up.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
