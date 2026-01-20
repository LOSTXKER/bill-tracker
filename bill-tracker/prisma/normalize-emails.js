const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Normalizing user emails to lowercase...\n");
  
  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  
  let updated = 0;
  
  for (const user of users) {
    const normalizedEmail = user.email.toLowerCase().trim();
    
    if (normalizedEmail !== user.email) {
      // Check if there's already a user with the normalized email (to avoid duplicates)
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      
      if (existingUser && existingUser.id !== user.id) {
        console.log(`WARNING: Cannot update "${user.email}" (${user.name}) - "${normalizedEmail}" already exists`);
        continue;
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: { email: normalizedEmail }
      });
      
      console.log(`Updated: "${user.email}" -> "${normalizedEmail}" (${user.name})`);
      updated++;
    }
  }
  
  console.log(`\nDone! Updated ${updated} out of ${users.length} users.`);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
