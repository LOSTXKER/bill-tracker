// Migration script: Map existing categories to Chart of Accounts
// This script creates a mapping from old Category records to new Account records
import "dotenv/config";

import { PrismaClient, AccountClass } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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

// Mapping from old ExpenseCategory enum to Account codes (updated for new Chart of Accounts)
const EXPENSE_CATEGORY_TO_ACCOUNT: Record<string, string> = {
  MATERIAL: "510101",     // ต้นทุนสินค้าที่ซื้อ
  UTILITY: "521201",      // ค่าไฟฟ้า (default for utilities)
  MARKETING: "523104",    // ค่าโฆษณาอื่นๆ
  SALARY: "520101",       // เงินเดือนและค่าจ้าง
  FREELANCE: "520108",    // ค่าจ้างฟรีแลนซ์
  TRANSPORT: "522101",    // ค่าขนส่งสินค้า
  RENT: "521101",         // ค่าเช่าสำนักงาน
  OFFICE: "525101",       // ค่าอุปกรณ์สำนักงาน
  OTHER: "532101",        // ค่าใช้จ่ายเบ็ดเตล็ด
};

// Mapping category names to account codes (for custom categories - updated for new Chart of Accounts)
const CATEGORY_NAME_TO_ACCOUNT: Record<string, string> = {
  // Utilities (521xxx)
  "ค่าไฟฟ้า": "521201",
  "ค่าน้ำประปา": "521202",
  "ค่าโทรศัพท์": "521203",
  "ค่าอินเทอร์เน็ต": "521204",
  "ไฟฟ้า": "521201",
  "น้ำประปา": "521202",
  "โทรศัพท์": "521203",
  "อินเทอร์เน็ต": "521204",
  "เน็ต": "521204",
  "internet": "521204",
  
  // Transportation (522xxx)
  "ค่าขนส่ง": "522101",
  "ขนส่ง": "522101",
  "shipping": "522101",
  "ค่าน้ำมัน": "522102",
  "น้ำมัน": "522102",
  "fuel": "522102",
  "ค่าทางด่วน": "522103",
  "ทางด่วน": "522103",
  "toll": "522103",
  "ค่าเดินทาง": "522105",
  "grab": "522105",
  "taxi": "522105",
  "ค่าตั๋วเครื่องบิน": "522107",
  "ค่าที่พัก": "522108",
  "hotel": "522108",
  
  // Marketing (523xxx)
  "ค่าโฆษณา": "523104",
  "โฆษณา": "523104",
  "การตลาด": "523104",
  "facebook": "523101",
  "google": "523102",
  "tiktok": "523103",
  "influencer": "523105",
  
  // Technology (524xxx)
  "cloud": "524101",
  "hosting": "524101",
  "aws": "524101",
  "saas": "524102",
  "software": "524102",
  "domain": "524103",
  "ssl": "524103",
  "api": "524105",
  
  // Salary (520xxx)
  "เงินเดือน": "520101",
  "ค่าจ้าง": "520101",
  "salary": "520101",
  "ค่าล่วงเวลา": "520102",
  "ot": "520102",
  "โบนัส": "520103",
  "bonus": "520103",
  "ประกันสังคม": "520104",
  "กองทุน": "520105",
  "สวัสดิการ": "520106",
  "อบรม": "520107",
  "ฟรีแลนซ์": "520108",
  "freelance": "520108",
  
  // Rent (521xxx)
  "ค่าเช่า": "521101",
  "เช่า": "521101",
  "rent": "521101",
  "โกดัง": "521102",
  "warehouse": "521102",
  "ค่าส่วนกลาง": "521104",
  
  // Maintenance (529xxx)
  "ค่าซ่อมแซม": "529101",
  "ซ่อมแซม": "529101",
  "บำรุงรักษา": "529101",
  "repair": "529101",
  "ซ่อมรถ": "529102",
  
  // Office (525xxx)
  "อุปกรณ์สำนักงาน": "525101",
  "เครื่องเขียน": "525101",
  "stationery": "525101",
  "วัสดุ": "525102",
  "เฟอร์นิเจอร์": "525103",
  "furniture": "525103",
  
  // Professional (526xxx)
  "ค่าบัญชี": "526101",
  "accounting": "526101",
  "กฎหมาย": "526102",
  "legal": "526102",
  "ค่าที่ปรึกษา": "526103",
  "consultant": "526103",
  
  // Bank fees (527xxx)
  "ค่าธรรมเนียมธนาคาร": "527101",
  "ธรรมเนียมธนาคาร": "527101",
  "bank fee": "527101",
  "payment gateway": "527102",
  "ดอกเบี้ยจ่าย": "527103",
  "shopee": "527104",
  "lazada": "527104",
  
  // Insurance (528xxx)
  "ประกันรถ": "528101",
  "car insurance": "528101",
  "ประกันอัคคี": "528102",
  "ประกันสินค้า": "528103",
  
  // Depreciation (530xxx)
  "ค่าเสื่อมราคา": "530102",
  "depreciation": "530102",
  
  // Tax & Gov (531xxx)
  "ภาษี": "531101",
  "อากรแสตมป์": "531102",
  "ค่าธรรมเนียมราชการ": "531103",
  
  // Miscellaneous (532xxx)
  "อื่นๆ": "532101",
  "เบ็ดเตล็ด": "532101",
  "miscellaneous": "532101",
  "ค่ารับรอง": "532102",
  "เลี้ยง": "532102",
  "entertainment": "532102",
  "ของขวัญ": "532103",
  "gift": "532103",
  "บริจาค": "532104",
  "donation": "532104",
  "ค่าปรับ": "532105",
  "penalty": "532105",
  
  // Income accounts (4xxxxx)
  "รายได้จากการขาย": "410101",
  "ขาย": "410101",
  "sales": "410101",
  "รายได้ค่าบริการ": "411101",
  "บริการ": "411101",
  "service": "411101",
  "ค่าที่ปรึกษา": "411102",
  "ออกแบบ": "411103",
  "design": "411103",
  "พัฒนา": "411104",
  "software dev": "411104",
  "subscription": "411105",
  "สมาชิก": "411105",
  "ดอกเบี้ยรับ": "420101",
  "ค่าเช่ารับ": "420102",
  "rental income": "420102",
  "กำไรจากการขาย": "420103",
  "รายได้อื่น": "420199",
};

async function migrateCategoriesToAccounts(companyId: string, companyCode: string) {
  console.log(`\n🔄 Migrating categories to accounts for company: ${companyCode}`);
  
  let expensesUpdated = 0;
  let incomesUpdated = 0;
  let skipped = 0;

  // Migrate Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      accountId: null, // Only migrate expenses without account
      deletedAt: null,
    },
  });

  console.log(`  Found ${expenses.length} expenses to migrate`);

  for (const expense of expenses) {
    let accountCode: string | null = null;

    // Try to map from description keywords
    const description = ((expense.description as string) || "").toLowerCase();
    
    for (const [keyword, code] of Object.entries(CATEGORY_NAME_TO_ACCOUNT)) {
      // Only use expense accounts (5xxxxx)
      if (code.startsWith("5") && description.includes(keyword.toLowerCase())) {
        accountCode = code;
        break;
      }
    }

    // Default fallback
    if (!accountCode) {
      accountCode = "532101"; // ค่าใช้จ่ายเบ็ดเตล็ด
    }

    // Find account
    const account = await prisma.account.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: accountCode,
        },
      },
    });

    if (account) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { accountId: account.id },
      });
      expensesUpdated++;
    } else {
      console.log(`    ⚠️  Account ${accountCode} not found for expense ${expense.id}`);
      skipped++;
    }
  }

  // Migrate Incomes
  const incomes = await prisma.income.findMany({
    where: {
      companyId,
      accountId: null, // Only migrate incomes without account
      deletedAt: null,
    },
  });

  console.log(`  Found ${incomes.length} incomes to migrate`);

  for (const income of incomes) {
    let accountCode = "410101"; // Default to sales revenue

    // Try to map from source/description keywords
    const source = ((income.source as string) || "").toLowerCase();
    
    for (const [keyword, code] of Object.entries(CATEGORY_NAME_TO_ACCOUNT)) {
      // Only use income accounts (4xxxxx)
      if (code.startsWith("4") && source.includes(keyword.toLowerCase())) {
        accountCode = code;
        break;
      }
    }

    // Find account
    const account = await prisma.account.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: accountCode,
        },
      },
    });

    if (account) {
      await prisma.income.update({
        where: { id: income.id },
        data: { accountId: account.id },
      });
      incomesUpdated++;
    } else {
      console.log(`    ⚠️  Account ${accountCode} not found for income ${income.id}`);
      skipped++;
    }
  }

  console.log(`  ✅ Updated ${expensesUpdated} expenses and ${incomesUpdated} incomes`);
  if (skipped > 0) {
    console.log(`  ⚠️  Skipped ${skipped} records (account not found)`);
  }

  return { expensesUpdated, incomesUpdated, skipped };
}

// Main function
async function main() {
  console.log("🚀 Starting Category to Account Migration");

  // Get all companies
  const companies = await prisma.company.findMany({
    select: { id: true, code: true, name: true },
  });

  if (companies.length === 0) {
    console.log("⚠️  No companies found.");
    return;
  }

  console.log(`Found ${companies.length} companies:`);
  companies.forEach((c) => console.log(`  - ${c.code}: ${c.name}`));

  let totalExpensesUpdated = 0;
  let totalIncomesUpdated = 0;
  let totalSkipped = 0;

  // Migrate for each company
  for (const company of companies) {
    const result = await migrateCategoriesToAccounts(company.id, company.code);
    totalExpensesUpdated += result.expensesUpdated;
    totalIncomesUpdated += result.incomesUpdated;
    totalSkipped += result.skipped;
  }

  console.log("\n📊 Migration Summary:");
  console.log(`  Total Expenses Updated: ${totalExpensesUpdated}`);
  console.log(`  Total Incomes Updated: ${totalIncomesUpdated}`);
  console.log(`  Total Skipped: ${totalSkipped}`);
  console.log("\n✨ Migration completed!");
}

// Run if executed directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default migrateCategoriesToAccounts;
