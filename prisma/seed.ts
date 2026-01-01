import { config } from 'dotenv';

// Load environment variables BEFORE importing anything else
config({ path: '.env.local' });
config({ path: '.env' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create default expense categories
  const categories = [
    { name: 'food', nameTh: 'ค่าอาหาร', isDefault: true },
    { name: 'transportation', nameTh: 'ค่าเดินทาง', isDefault: true },
    { name: 'office_supplies', nameTh: 'อุปกรณ์สำนักงาน', isDefault: true },
    { name: 'utilities', nameTh: 'ค่าสาธารณูปโภค', isDefault: true },
    { name: 'marketing', nameTh: 'ค่าการตลาด', isDefault: true },
    { name: 'entertainment', nameTh: 'ค่ารับรอง', isDefault: true },
    { name: 'equipment', nameTh: 'อุปกรณ์/เครื่องมือ', isDefault: true },
    { name: 'services', nameTh: 'ค่าบริการ', isDefault: true },
    { name: 'rent', nameTh: 'ค่าเช่า', isDefault: true },
    { name: 'other', nameTh: 'อื่นๆ', isDefault: true },
  ];

  for (const category of categories) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { name: category.name, isDefault: true },
    });

    if (!existing) {
      await prisma.expenseCategory.create({
        data: category,
      });
      console.log(`  ✓ Created category: ${category.nameTh}`);
    } else {
      console.log(`  - Category exists: ${category.nameTh}`);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
