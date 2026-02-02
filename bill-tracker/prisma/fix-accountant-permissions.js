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

// Accountant permissions (from groups.ts)
const ACCOUNTANT_PERMISSIONS = [
  // Expenses
  "expenses:read",
  "expenses:create",
  "expenses:create-direct",
  "expenses:update",
  "expenses:mark-paid",
  "expenses:change-status",
  // Incomes
  "incomes:read",
  "incomes:create",
  "incomes:create-direct",
  "incomes:update",
  "incomes:mark-received",
  "incomes:change-status",
  // Contacts
  "contacts:read",
  "contacts:create",
  // Reports
  "reports:read",
  "reports:export",
  // Reimbursements
  "reimbursements:read",
  "reimbursements:pay",
  // Settlements
  "settlements:read",
  "settlements:manage",
  // Comments
  "comments:read",
  "comments:create",
  // Audit logs
  "audit:read",
];

async function main() {
  const args = process.argv.slice(2);
  const userEmail = args[0];

  if (!userEmail) {
    console.log("Usage: node fix-accountant-permissions.js <user-email>");
    console.log("Example: node fix-accountant-permissions.js user@example.com");
    console.log("");
    console.log("This will list all company access for the user and optionally fix permissions.");
    
    // List all users
    console.log("\n📋 Available users:");
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    users.forEach(u => console.log(`  - ${u.email} (${u.name || "no name"})`));
    return;
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.error(`❌ User not found: ${userEmail}`);
    return;
  }

  console.log(`\n👤 User: ${user.name} (${user.email})`);

  // Get all company access for this user
  const accesses = await prisma.companyAccess.findMany({
    where: { userId: user.id },
    include: { Company: true },
  });

  if (accesses.length === 0) {
    console.log("⚠️ User has no company access");
    return;
  }

  for (const access of accesses) {
    console.log(`\n🏢 Company: ${access.Company.name} (${access.Company.code})`);
    console.log(`   isOwner: ${access.isOwner}`);
    console.log(`   Current permissions (${access.permissions?.length || 0}):`);
    
    const perms = access.permissions || [];
    if (perms.length === 0) {
      console.log("   (none)");
    } else {
      perms.forEach(p => console.log(`     - ${p}`));
    }

    // Check if settlements:read is missing
    const hasSettlements = perms.includes("settlements:read");
    console.log(`\n   Has settlements:read: ${hasSettlements ? "✅ Yes" : "❌ No"}`);

    if (!hasSettlements && !access.isOwner) {
      console.log("\n   🔧 Fixing: Adding accountant permissions...");
      
      await prisma.companyAccess.update({
        where: { id: access.id },
        data: { permissions: ACCOUNTANT_PERMISSIONS },
      });

      console.log(`   ✅ Updated with ${ACCOUNTANT_PERMISSIONS.length} permissions`);
    } else if (access.isOwner) {
      console.log("   ℹ️ User is owner - has all permissions automatically");
    }
  }

  console.log("\n✨ Done!");
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
