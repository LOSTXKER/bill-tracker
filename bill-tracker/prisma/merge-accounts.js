const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sourceEmail = "Nutya009@gmail.com"; // Account to merge FROM (will be deleted)
  const targetEmail = "nutya009@gmail.com"; // Account to merge INTO (will keep)

  console.log("🔄 Merging accounts...");
  console.log(`   Source (will be deleted): ${sourceEmail}`);
  console.log(`   Target (will keep): ${targetEmail}`);
  console.log("");

  // Find both users
  const sourceUser = await prisma.user.findUnique({
    where: { email: sourceEmail },
  });

  const targetUser = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!sourceUser) {
    console.error(`❌ Source user not found: ${sourceEmail}`);
    return;
  }

  if (!targetUser) {
    console.error(`❌ Target user not found: ${targetEmail}`);
    return;
  }

  console.log(`📋 Source User: ${sourceUser.name} (ID: ${sourceUser.id})`);
  console.log(`📋 Target User: ${targetUser.name} (ID: ${targetUser.id})`);
  console.log("");

  // Get source user's company accesses
  const sourceAccesses = await prisma.companyAccess.findMany({
    where: { userId: sourceUser.id },
    include: { Company: true },
  });

  console.log(`🏢 Source user has access to ${sourceAccesses.length} companies:`);
  for (const access of sourceAccesses) {
    console.log(`   - ${access.Company.name} (${access.Company.code})`);
  }
  console.log("");

  // Transfer company accesses
  for (const access of sourceAccesses) {
    // Check if target already has access to this company
    const existingAccess = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: targetUser.id,
          companyId: access.companyId,
        },
      },
    });

    if (existingAccess) {
      console.log(`   ℹ️ Target already has access to ${access.Company.code}, skipping...`);
    } else {
      // Transfer the access
      await prisma.companyAccess.update({
        where: { id: access.id },
        data: { userId: targetUser.id },
      });
      console.log(`   ✅ Transferred access to ${access.Company.code}`);
    }
  }

  // Transfer related data (if any)
  console.log("\n📦 Transferring related data...");

  // Update Expenses created by source user
  const expensesUpdated = await prisma.expense.updateMany({
    where: { createdBy: sourceUser.id },
    data: { createdBy: targetUser.id },
  });
  console.log(`   Expenses (createdBy): ${expensesUpdated.count}`);

  // Update Expenses submitted by source user
  const expensesSubmitted = await prisma.expense.updateMany({
    where: { submittedBy: sourceUser.id },
    data: { submittedBy: targetUser.id },
  });
  console.log(`   Expenses (submittedBy): ${expensesSubmitted.count}`);

  // Update Incomes created by source user
  const incomesUpdated = await prisma.income.updateMany({
    where: { createdBy: sourceUser.id },
    data: { createdBy: targetUser.id },
  });
  console.log(`   Incomes (createdBy): ${incomesUpdated.count}`);

  // Update Incomes submitted by source user
  const incomesSubmitted = await prisma.income.updateMany({
    where: { submittedBy: sourceUser.id },
    data: { submittedBy: targetUser.id },
  });
  console.log(`   Incomes (submittedBy): ${incomesSubmitted.count}`);

  // Update ExpensePayment (paidByUserId)
  const paymentsUpdated = await prisma.expensePayment.updateMany({
    where: { paidByUserId: sourceUser.id },
    data: { paidByUserId: targetUser.id },
  });
  console.log(`   ExpensePayments (paidByUserId): ${paymentsUpdated.count}`);

  // Update Comments (authorId field)
  const commentsUpdated = await prisma.comment.updateMany({
    where: { authorId: sourceUser.id },
    data: { authorId: targetUser.id },
  });
  console.log(`   Comments (authorId): ${commentsUpdated.count}`);

  // Update DocumentEvents
  const docEventsUpdated = await prisma.documentEvent.updateMany({
    where: { createdBy: sourceUser.id },
    data: { createdBy: targetUser.id },
  });
  console.log(`   DocumentEvents: ${docEventsUpdated.count}`);

  // Update PettyCashTransactions
  const pettyCashUpdated = await prisma.pettyCashTransaction.updateMany({
    where: { createdBy: sourceUser.id },
    data: { createdBy: targetUser.id },
  });
  console.log(`   PettyCashTransactions: ${pettyCashUpdated.count}`);

  // Delete AuditLogs for source user (can't transfer, just clean up)
  const auditLogsDeleted = await prisma.auditLog.deleteMany({
    where: { userId: sourceUser.id },
  });
  console.log(`   AuditLogs (deleted): ${auditLogsDeleted.count}`);

  // Delete remaining company accesses for source user (duplicates)
  const deletedAccesses = await prisma.companyAccess.deleteMany({
    where: { userId: sourceUser.id },
  });
  console.log(`\n🗑️ Deleted ${deletedAccesses.count} duplicate company accesses`);

  // Delete the source user
  await prisma.user.delete({
    where: { id: sourceUser.id },
  });
  console.log(`🗑️ Deleted source user: ${sourceEmail}`);

  console.log("\n✨ Merge complete!");
  console.log(`   All data has been transferred to: ${targetEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
