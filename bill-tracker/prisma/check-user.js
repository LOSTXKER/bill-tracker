const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ====== แก้ไขตรงนี้ ======
const TARGET_EMAIL = "nutya009@gmail.com";
// ========================

async function main() {
  console.log(`\nSearching for user: ${TARGET_EMAIL}\n`);
  
  // Search case-insensitive
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: TARGET_EMAIL.split("@")[0],
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      CompanyAccess: {
        select: {
          isOwner: true,
          Company: {
            select: {
              name: true,
              code: true
            }
          }
        }
      }
    }
  });
  
  if (users.length === 0) {
    console.log("❌ User not found!");
    console.log("\nListing all users:");
    
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, isActive: true }
    });
    
    allUsers.forEach(u => {
      const status = u.isActive ? "✅" : "❌";
      console.log(`  ${status} ${u.email} (${u.name})`);
    });
    
    await prisma.$disconnect();
    await pool.end();
    return;
  }
  
  console.log("Found user(s):\n");
  
  for (const user of users) {
    console.log("=".repeat(50));
    console.log(`Email:      ${user.email}`);
    console.log(`Name:       ${user.name}`);
    console.log(`Role:       ${user.role}`);
    console.log(`isActive:   ${user.isActive ? "✅ YES" : "❌ NO (CANNOT LOGIN!)"}`);
    console.log(`Last Login: ${user.lastLoginAt || "Never"}`);
    console.log(`Created:    ${user.createdAt}`);
    
    if (user.CompanyAccess.length > 0) {
      console.log(`Companies:`);
      user.CompanyAccess.forEach(ca => {
        console.log(`  - ${ca.Company.name} (${ca.Company.code}) ${ca.isOwner ? "[OWNER]" : ""}`);
      });
    } else {
      console.log(`Companies:  None (no access to any company)`);
    }
    
    // If user is inactive, offer to activate
    if (!user.isActive) {
      console.log("\n⚠️  This user is INACTIVE and cannot login!");
      console.log("    Run this script with --activate to enable the user.");
    }
  }
  
  // Check if --activate flag is passed
  if (process.argv.includes("--activate")) {
    console.log("\n" + "=".repeat(50));
    console.log("Activating user...");
    
    for (const user of users) {
      if (!user.isActive) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true }
        });
        console.log(`✅ Activated: ${user.email}`);
      } else {
        console.log(`ℹ️  Already active: ${user.email}`);
      }
    }
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
