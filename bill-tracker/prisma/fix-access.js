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
  console.log("🔧 Fixing company access...");

  // Get all users
  const users = await prisma.user.findMany();
  console.log("Found users:", users.map(u => ({ id: u.id, name: u.name, email: u.email })));

  // Get all companies
  let companies = await prisma.company.findMany();
  console.log("Found companies:", companies.map(c => ({ id: c.id, name: c.name, code: c.code })));

  // If no companies, create them
  if (companies.length === 0) {
    console.log("No companies found, creating...");
    
    const anajak = await prisma.company.create({
      data: {
        name: "Anajak T-Shirt",
        code: "ANJ",
        taxId: "1234567890123",
        address: "123 ถ.สุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110",
        phone: "02-123-4567",
      },
    });
    console.log("✅ Created company:", anajak.name);

    const meelike = await prisma.company.create({
      data: {
        name: "Meelike-th",
        code: "MLK",
        taxId: "9876543210987",
        address: "456 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900",
        phone: "02-987-6543",
      },
    });
    console.log("✅ Created company:", meelike.name);

    companies = [anajak, meelike];
  }

  // If no users yet, wait for OAuth login
  if (users.length === 0) {
    console.log("⚠️ No users found. Please login first, then run this script again.");
    console.log("✅ Companies are ready!");
    return;
  }

  // Give all users owner access to all companies
  for (const user of users) {
    for (const company of companies) {
      await prisma.companyAccess.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: {
          isOwner: true,
          permissions: [],
        },
        create: {
          userId: user.id,
          companyId: company.id,
          isOwner: true,
          permissions: [],
        },
      });
      console.log(`✅ Granted ${user.name || user.email} owner access to ${company.name}`);
    }
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
