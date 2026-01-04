const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const companies = await prisma.company.findMany();
  console.log("Remaining companies:", JSON.stringify(companies.map(c => ({ name: c.name, code: c.code })), null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
