const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hash } = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ====== แก้ไขตรงนี้ ======
const TARGET_EMAIL = "nutya009@gmail.com";  // email ที่ต้องการ reset (ใช้ตัวพิมพ์เล็กทั้งหมด)
const NEW_PASSWORD = "Nutya@2026";          // รหัสผ่านใหม่
// ========================

async function main() {
  console.log(`Resetting password for: ${TARGET_EMAIL}`);
  
  const hashedPassword = await hash(NEW_PASSWORD, 12);
  
  // Normalize email to lowercase for search
  const normalizedEmail = TARGET_EMAIL.toLowerCase().trim();
  
  // Find user (case-insensitive search)
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive'
      }
    }
  });
  
  if (!user) {
    console.log(`ERROR: User with email "${TARGET_EMAIL}" not found!`);
    
    // List all users to help find the correct email
    console.log("\nExisting users:");
    const users = await prisma.user.findMany({
      select: { email: true, name: true, isActive: true }
    });
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.name}) ${u.isActive ? '' : '[INACTIVE]'}`);
    });
    
    await prisma.$disconnect();
    await pool.end();
    return;
  }
  
  // Update password and normalize email
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      password: hashedPassword,
      email: normalizedEmail  // Also normalize email to lowercase
    }
  });
  
  console.log(`\nPassword reset successfully!`);
  console.log(`User: ${user.name}`);
  console.log(`Email: ${normalizedEmail}`);
  console.log(`New password: ${NEW_PASSWORD}`);
  console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);
  
  if (!user.isActive) {
    console.log("\nWARNING: This user is INACTIVE and cannot login!");
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
