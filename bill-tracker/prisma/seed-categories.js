/**
 * Seed Default Categories - ระบบหมวดหมู่ 2 ขั้น
 *
 * การใช้งาน:
 *   node prisma/seed-categories.js                     # สร้างให้ทุก company
 *   node prisma/seed-categories.js COMPANY_CODE        # สร้างให้ company ที่ระบุ
 *   node prisma/seed-categories.js --company-id=xxx    # สร้างด้วย company ID
 */

const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

// =============================================================================
// Default Expense Categories - กลุ่ม + หมวดย่อย
// =============================================================================
const DEFAULT_EXPENSE_GROUPS = [
  {
    name: "ต้นทุนขาย",
    key: "COST_OF_SALES",
    order: 1,
    color: "#8B4513",
    icon: "Package",
    children: [
      { name: "ซื้อสินค้า", key: "PURCHASE", order: 1 },
      { name: "วัตถุดิบ", key: "MATERIAL", order: 2 },
      { name: "ค่าแรงงาน (ผลิต)", key: "LABOR_PRODUCTION", order: 3 },
      { name: "ค่าโสหุ้ยการผลิต", key: "OVERHEAD", order: 4 },
    ],
  },
  {
    name: "ค่าใช้จ่ายในการขาย",
    key: "SELLING_EXPENSE",
    order: 2,
    color: "#FF69B4",
    icon: "Megaphone",
    children: [
      { name: "ค่าโฆษณา", key: "ADVERTISING", order: 1 },
      { name: "ค่าส่งเสริมการขาย", key: "PROMOTION", order: 2 },
      { name: "ค่าขนส่ง", key: "TRANSPORT", order: 3 },
      { name: "ค่าคอมมิชชั่น", key: "COMMISSION", order: 4 },
    ],
  },
  {
    name: "ค่าใช้จ่ายในการบริหาร",
    key: "ADMIN_EXPENSE",
    order: 3,
    color: "#4169E1",
    icon: "Building",
    children: [
      { name: "เงินเดือน/ค่าจ้าง", key: "SALARY", order: 1 },
      { name: "ค่าเช่าสำนักงาน", key: "RENT", order: 2 },
      { name: "ค่าสาธารณูปโภค", key: "UTILITY", order: 3 },
      { name: "ค่าใช้จ่ายสำนักงาน", key: "OFFICE", order: 4 },
      { name: "ค่าซ่อมแซม/บำรุงรักษา", key: "MAINTENANCE", order: 5 },
      { name: "ค่าที่ปรึกษา/วิชาชีพ", key: "PROFESSIONAL", order: 6 },
      { name: "ค่าประกันภัย", key: "INSURANCE", order: 7 },
      { name: "ค่าเสื่อมราคา", key: "DEPRECIATION", order: 8 },
    ],
  },
  {
    name: "ค่าใช้จ่ายทางการเงิน",
    key: "FINANCE_EXPENSE",
    order: 4,
    color: "#800000",
    icon: "CreditCard",
    children: [
      { name: "ดอกเบี้ยจ่าย", key: "INTEREST_EXPENSE", order: 1 },
      { name: "ค่าธรรมเนียมธนาคาร", key: "BANK_FEE", order: 2 },
    ],
  },
  {
    name: "ค่าใช้จ่ายอื่น",
    key: "OTHER_EXPENSE",
    order: 99,
    color: "#808080",
    icon: "MoreHorizontal",
    children: [{ name: "ค่าใช้จ่ายเบ็ดเตล็ด", key: "MISCELLANEOUS", order: 1 }],
  },
];

// =============================================================================
// Default Income Categories - กลุ่ม + หมวดย่อย
// =============================================================================
const DEFAULT_INCOME_GROUPS = [
  {
    name: "รายได้จากการดำเนินงาน",
    key: "OPERATING_INCOME",
    order: 1,
    color: "#32CD32",
    icon: "TrendingUp",
    children: [
      { name: "รายได้จากการขาย", key: "SALES", order: 1 },
      { name: "รายได้จากการให้บริการ", key: "SERVICE", order: 2 },
      { name: "รายได้ค่าจ้างผลิต", key: "MANUFACTURING", order: 3 },
    ],
  },
  {
    name: "รายได้อื่น",
    key: "OTHER_INCOME",
    order: 2,
    color: "#FFD700",
    icon: "Star",
    children: [
      { name: "ดอกเบี้ยรับ", key: "INTEREST_INCOME", order: 1 },
      { name: "กำไรจากการขายสินทรัพย์", key: "ASSET_GAIN", order: 2 },
      { name: "รายได้ค่าเช่า", key: "RENTAL_INCOME", order: 3 },
      { name: "รายได้เบ็ดเตล็ด", key: "MISCELLANEOUS", order: 4 },
    ],
  },
];

/**
 * สร้าง/อัพเดต categories แบบ hierarchy สำหรับ company
 */
async function seedCategoriesForCompany(companyId, companyCode) {
  console.log(`\n📂 กำลังสร้างหมวดหมู่สำหรับ: ${companyCode || companyId}`);

  let groupsCreated = 0;
  let childrenCreated = 0;
  let updated = 0;

  // ==================== EXPENSE ====================
  for (const group of DEFAULT_EXPENSE_GROUPS) {
    // สร้าง/อัพเดต group (parent)
    const parentCategory = await prisma.category.upsert({
      where: {
        companyId_name_type: {
          companyId,
          name: group.name,
          type: "EXPENSE",
        },
      },
      update: {
        isDefault: true,
        isActive: true,
        color: group.color,
        icon: group.icon,
        order: group.order,
        parentId: null, // group ไม่มี parent
      },
      create: {
        companyId,
        name: group.name,
        type: "EXPENSE",
        isDefault: true,
        isActive: true,
        color: group.color,
        icon: group.icon,
        order: group.order,
        parentId: null,
      },
    });

    const isNew =
      parentCategory.createdAt.getTime() === parentCategory.updatedAt.getTime();
    if (isNew) groupsCreated++;
    else updated++;

    // สร้าง/อัพเดต children
    for (const child of group.children) {
      const childOrder = group.order * 100 + child.order; // order แบบ 101, 102, 201, 202...

      const childCategory = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId,
            name: child.name,
            type: "EXPENSE",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: child.color || group.color,
          icon: child.icon,
          order: childOrder,
          parentId: parentCategory.id, // เชื่อมกับ parent
        },
        create: {
          companyId,
          name: child.name,
          type: "EXPENSE",
          isDefault: true,
          isActive: true,
          color: child.color || group.color,
          icon: child.icon,
          order: childOrder,
          parentId: parentCategory.id,
        },
      });

      const isChildNew =
        childCategory.createdAt.getTime() === childCategory.updatedAt.getTime();
      if (isChildNew) childrenCreated++;
      else updated++;
    }
  }

  // ==================== INCOME ====================
  for (const group of DEFAULT_INCOME_GROUPS) {
    // สร้าง/อัพเดต group (parent)
    const parentCategory = await prisma.category.upsert({
      where: {
        companyId_name_type: {
          companyId,
          name: group.name,
          type: "INCOME",
        },
      },
      update: {
        isDefault: true,
        isActive: true,
        color: group.color,
        icon: group.icon,
        order: group.order,
        parentId: null,
      },
      create: {
        companyId,
        name: group.name,
        type: "INCOME",
        isDefault: true,
        isActive: true,
        color: group.color,
        icon: group.icon,
        order: group.order,
        parentId: null,
      },
    });

    const isNew =
      parentCategory.createdAt.getTime() === parentCategory.updatedAt.getTime();
    if (isNew) groupsCreated++;
    else updated++;

    // สร้าง/อัพเดต children
    for (const child of group.children) {
      const childOrder = group.order * 100 + child.order;

      const childCategory = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId,
            name: child.name,
            type: "INCOME",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: child.color || group.color,
          icon: child.icon,
          order: childOrder,
          parentId: parentCategory.id,
        },
        create: {
          companyId,
          name: child.name,
          type: "INCOME",
          isDefault: true,
          isActive: true,
          color: child.color || group.color,
          icon: child.icon,
          order: childOrder,
          parentId: parentCategory.id,
        },
      });

      const isChildNew =
        childCategory.createdAt.getTime() === childCategory.updatedAt.getTime();
      if (isChildNew) childrenCreated++;
      else updated++;
    }
  }

  console.log(
    `   ✅ สร้างกลุ่มใหม่: ${groupsCreated}, สร้างหมวดย่อย: ${childrenCreated}, อัพเดต: ${updated}`
  );

  return { groupsCreated, childrenCreated, updated };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log("=".repeat(60));
  console.log("🌱 Seed Categories - ระบบหมวดหมู่ 2 ขั้น");
  console.log("=".repeat(60));

  // Summary
  const totalExpenseGroups = DEFAULT_EXPENSE_GROUPS.length;
  const totalExpenseChildren = DEFAULT_EXPENSE_GROUPS.reduce(
    (sum, g) => sum + g.children.length,
    0
  );
  const totalIncomeGroups = DEFAULT_INCOME_GROUPS.length;
  const totalIncomeChildren = DEFAULT_INCOME_GROUPS.reduce(
    (sum, g) => sum + g.children.length,
    0
  );

  console.log(`\n📊 หมวดหมู่ที่จะสร้าง:`);
  console.log(
    `   - ค่าใช้จ่าย: ${totalExpenseGroups} กลุ่ม, ${totalExpenseChildren} หมวดย่อย`
  );
  console.log(
    `   - รายได้: ${totalIncomeGroups} กลุ่ม, ${totalIncomeChildren} หมวดย่อย`
  );
  console.log(
    `   - รวม: ${
      totalExpenseGroups +
      totalExpenseChildren +
      totalIncomeGroups +
      totalIncomeChildren
    } รายการ`
  );

  let companies = [];

  // Check arguments
  if (args.length > 0) {
    const arg = args[0];

    if (arg.startsWith("--company-id=")) {
      // By company ID
      const companyId = arg.replace("--company-id=", "");
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (company) {
        companies = [company];
      } else {
        console.error(`❌ ไม่พบบริษัท ID: ${companyId}`);
        process.exit(1);
      }
    } else {
      // By company code
      const company = await prisma.company.findUnique({
        where: { code: arg.toUpperCase() },
      });
      if (company) {
        companies = [company];
      } else {
        console.error(`❌ ไม่พบบริษัท Code: ${arg}`);
        process.exit(1);
      }
    }
  } else {
    // All companies
    companies = await prisma.company.findMany({
      orderBy: { code: "asc" },
    });

    if (companies.length === 0) {
      console.log("⚠️ ไม่พบบริษัทในระบบ");
      process.exit(0);
    }
  }

  console.log(`\n🏢 จำนวนบริษัท: ${companies.length}`);

  // Process each company
  let totalGroups = 0;
  let totalChildren = 0;
  let totalUpdated = 0;

  for (const company of companies) {
    const result = await seedCategoriesForCompany(company.id, company.code);
    totalGroups += result.groupsCreated;
    totalChildren += result.childrenCreated;
    totalUpdated += result.updated;
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ เสร็จสิ้น!");
  console.log(`   - สร้างกลุ่มใหม่: ${totalGroups}`);
  console.log(`   - สร้างหมวดย่อยใหม่: ${totalChildren}`);
  console.log(`   - อัพเดต: ${totalUpdated}`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
