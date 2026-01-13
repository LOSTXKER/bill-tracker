const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hash } = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await hash("admin123", 12);
  await prisma.user.update({
    where: { email: "admin@billtracker.com" },
    data: { password: hashedPassword }
  });
  console.log("Password reset to: admin123");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
