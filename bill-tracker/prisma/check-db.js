const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", JSON.stringify(users, null, 2));
  
  const companies = await prisma.company.findMany();
  console.log("Companies:", companies.length);
  
  const access = await prisma.companyAccess.findMany();
  console.log("Access:", JSON.stringify(access, null, 2));
  
  const sessions = await prisma.session.findMany();
  console.log("Sessions:", JSON.stringify(sessions, null, 2));
  
  const accounts = await prisma.account.findMany();
  console.log("Accounts:", JSON.stringify(accounts, null, 2));
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
