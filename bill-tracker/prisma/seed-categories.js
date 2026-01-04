require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

// Default categories for all companies
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "วัตถุดิบ", key: "MATERIAL", order: 1, color: "#8B4513" },
  { name: "สาธารณูปโภค", key: "UTILITY", order: 2, color: "#FFD700" },
  { name: "การตลาด", key: "MARKETING", order: 3, color: "#FF69B4" },
  { name: "เงินเดือน", key: "SALARY", order: 4, color: "#4169E1" },
  { name: "ค่าจ้างฟรีแลนซ์", key: "FREELANCE", order: 5, color: "#9370DB" },
  { name: "ค่าขนส่ง", key: "TRANSPORT", order: 6, color: "#32CD32" },
  { name: "ค่าเช่า", key: "RENT", order: 7, color: "#FF8C00" },
  { name: "สำนักงาน", key: "OFFICE", order: 8, color: "#20B2AA" },
  { name: "อื่นๆ", key: "OTHER", order: 9, color: "#808080" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "ขายสินค้า", key: "PRODUCT_SALES", order: 1, color: "#32CD32" },
  { name: "ขายบริการ", key: "SERVICE_INCOME", order: 2, color: "#4169E1" },
  { name: "ค่าคอมมิชชั่น", key: "COMMISSION", order: 3, color: "#FF69B4" },
  { name: "ดอกเบี้ย", key: "INTEREST", order: 4, color: "#FFD700" },
  { name: "อื่นๆ", key: "OTHER", order: 5, color: "#808080" },
];

async function seedCategories() {
  try {
    console.log("🌱 Seeding categories...");

    // Get all companies
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies`);

    if (companies.length === 0) {
      console.log("⚠️  No companies found. Please create companies first.");
      return;
    }

    // Create a map to store enum -> categoryId mapping for each company
    const categoryMappings = {};

    // Seed categories for each company
    for (const company of companies) {
      console.log(`\n📦 Seeding categories for ${company.name} (${company.code})`);
      categoryMappings[company.id] = { EXPENSE: {}, INCOME: {} };

      // Create expense categories
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        const category = await prisma.category.upsert({
          where: {
            companyId_name_type: {
              companyId: company.id,
              name: cat.name,
              type: "EXPENSE",
            },
          },
          update: {
            isDefault: true,
            isActive: true,
            color: cat.color,
            order: cat.order,
          },
          create: {
            companyId: company.id,
            name: cat.name,
            type: "EXPENSE",
            isDefault: true,
            isActive: true,
            color: cat.color,
            order: cat.order,
          },
        });
        categoryMappings[company.id].EXPENSE[cat.key] = category.id;
        console.log(`  ✅ Created expense category: ${cat.name}`);
      }

      // Create income categories
      for (const cat of DEFAULT_INCOME_CATEGORIES) {
        const category = await prisma.category.upsert({
          where: {
            companyId_name_type: {
              companyId: company.id,
              name: cat.name,
              type: "INCOME",
            },
          },
          update: {
            isDefault: true,
            isActive: true,
            color: cat.color,
            order: cat.order,
          },
          create: {
            companyId: company.id,
            name: cat.name,
            type: "INCOME",
            isDefault: true,
            isActive: true,
            color: cat.color,
            order: cat.order,
          },
        });
        categoryMappings[company.id].INCOME[cat.key] = category.id;
        console.log(`  ✅ Created income category: ${cat.name}`);
      }
    }

    // Migrate existing expenses from enum to category relations
    console.log("\n🔄 Migrating existing expenses...");
    const expenses = await prisma.expense.findMany({
      where: {
        category: { not: null },
        categoryId: null,
      },
    });

    for (const expense of expenses) {
      const categoryId = categoryMappings[expense.companyId]?.EXPENSE?.[expense.category];
      if (categoryId) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { categoryId },
        });
        console.log(`  ✅ Migrated expense ${expense.id}: ${expense.category} -> ${categoryId}`);
      }
    }

    console.log("\n✨ Category seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedCategories()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedCategories };
