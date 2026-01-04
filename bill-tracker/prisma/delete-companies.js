const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  Deleting companies...");

  const companiesToDelete = ["ANJ", "MLK"];

  for (const code of companiesToDelete) {
    const company = await prisma.company.findUnique({
      where: { code },
    });

    if (!company) {
      console.log(`⚠️  Company ${code} not found, skipping...`);
      continue;
    }

    console.log(`Deleting ${company.name} (${code})...`);

    // Delete related data first (due to foreign key constraints)
    await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
    await prisma.expense.deleteMany({ where: { companyId: company.id } });
    await prisma.income.deleteMany({ where: { companyId: company.id } });
    await prisma.contact.deleteMany({ where: { companyId: company.id } });
    await prisma.companyAccess.deleteMany({ where: { companyId: company.id } });

    // Finally delete the company
    await prisma.company.delete({ where: { id: company.id } });

    console.log(`✅ Deleted ${company.name}`);
  }

  console.log("✨ Done!");
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
