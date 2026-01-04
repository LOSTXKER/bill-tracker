require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hash } = require("bcryptjs");

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

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@billtracker.com" },
    update: {},
    create: {
      email: "admin@billtracker.com",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create demo user
  const demoPassword = await hash("demo1234", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@billtracker.com" },
    update: {},
    create: {
      email: "demo@billtracker.com",
      name: "Demo User",
      password: demoPassword,
      role: "STAFF",
    },
  });
  console.log("✅ Created demo user:", demoUser.email);

  // Create companies
  const anajak = await prisma.company.upsert({
    where: { code: "ANJ" },
    update: {},
    create: {
      name: "Anajak T-Shirt",
      code: "ANJ",
      taxId: "1234567890123",
      address: "123 ถ.สุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110",
      phone: "02-123-4567",
    },
  });
  console.log("✅ Created company:", anajak.name);

  const meelike = await prisma.company.upsert({
    where: { code: "MLK" },
    update: {},
    create: {
      name: "Meelike-th",
      code: "MLK",
      taxId: "9876543210987",
      address: "456 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900",
      phone: "02-987-6543",
    },
  });
  console.log("✅ Created company:", meelike.name);

  // Give demo user access to both companies (using new schema with isOwner and permissions)
  await prisma.companyAccess.upsert({
    where: {
      userId_companyId: {
        userId: demoUser.id,
        companyId: anajak.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      companyId: anajak.id,
      isOwner: false,
      permissions: ["expenses:read", "expenses:write", "incomes:read", "incomes:write", "contacts:read", "contacts:write", "reports:read"],
    },
  });

  await prisma.companyAccess.upsert({
    where: {
      userId_companyId: {
        userId: demoUser.id,
        companyId: meelike.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      companyId: meelike.id,
      isOwner: true,
      permissions: [],
    },
  });
  console.log("✅ Granted company access to demo user");

  // Create sample contacts (replacing vendors and customers)
  const contacts = [
    { name: "ร้านหมึก DTF สยาม", taxId: "1111111111111", paymentTerms: 0 },
    { name: "บริษัท เสื้อผ้าไทย จำกัด", taxId: "2222222222222", paymentTerms: 0 },
    { name: "ขนส่งด่วน Express", taxId: "3333333333333", paymentTerms: 0 },
    { name: "บริษัท ABC จำกัด", taxId: "4444444444444", paymentTerms: 30 },
    { name: "ห้างหุ้นส่วนจำกัด XYZ", taxId: "5555555555555", paymentTerms: 15 },
    { name: "คุณสมชาย ใจดี", taxId: null, paymentTerms: 0 },
  ];

  const createdContacts = {};
  for (const contact of contacts) {
    const id = `seed-contact-${contact.name}`;
    const created = await prisma.contact.upsert({
      where: { id },
      update: {},
      create: {
        id,
        companyId: anajak.id,
        name: contact.name,
        taxId: contact.taxId,
        paymentTerms: contact.paymentTerms,
      },
    });
    createdContacts[contact.name] = created;
  }
  console.log("✅ Created sample contacts");

  // Create sample expenses
  const now = new Date();
  const expenses = [
    {
      contactName: "ร้านหมึก DTF สยาม",
      amount: 5000,
      vatRate: 7,
      category: "MATERIAL",
      description: "ค่าหมึก DTF 2 ลิตร",
      status: "SENT_TO_ACCOUNT",
    },
    {
      contactName: "บริษัท เสื้อผ้าไทย จำกัด",
      amount: 3000,
      vatRate: 0,
      isWht: true,
      whtRate: 3,
      category: "FREELANCE",
      description: "ค่าออกแบบลายสกรีน",
      status: "PENDING_PHYSICAL",
    },
    {
      contactName: "ขนส่งด่วน Express",
      amount: 800,
      vatRate: 7,
      isWht: true,
      whtRate: 1,
      category: "TRANSPORT",
      description: "ค่าส่งสินค้าลูกค้า",
      status: "WAITING_FOR_DOC",
    },
  ];

  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i];
    const vatAmount = (exp.amount * (exp.vatRate || 0)) / 100;
    const whtAmount = exp.isWht ? (exp.amount * (exp.whtRate || 0)) / 100 : 0;
    const netPaid = exp.amount + vatAmount - whtAmount;
    const contact = createdContacts[exp.contactName];

    await prisma.expense.create({
      data: {
        companyId: anajak.id,
        contactId: contact?.id || null,
        amount: exp.amount,
        vatRate: exp.vatRate,
        vatAmount: vatAmount > 0 ? vatAmount : null,
        isWht: exp.isWht || false,
        whtRate: exp.whtRate || null,
        whtAmount: whtAmount > 0 ? whtAmount : null,
        whtType: exp.isWht ? "SERVICE_3" : null,
        netPaid,
        category: exp.category,
        description: exp.description,
        status: exp.status,
        billDate: new Date(now.getFullYear(), now.getMonth(), 5 + i * 5),
        createdBy: demoUser.id,
      },
    });
  }
  console.log("✅ Created sample expenses");

  // Create sample incomes
  const incomes = [
    {
      contactName: "บริษัท ABC จำกัด",
      amount: 20000,
      vatRate: 7,
      isWhtDeducted: true,
      whtRate: 3,
      source: "สกรีนเสื้อยืด 200 ตัว",
      status: "SENT_COPY",
    },
    {
      contactName: "คุณสมชาย ใจดี",
      amount: 5000,
      vatRate: 0,
      source: "สกรีนเสื้อ 50 ตัว",
      status: "PENDING_COPY_SEND",
    },
    {
      contactName: "ห้างหุ้นส่วนจำกัด XYZ",
      amount: 15000,
      vatRate: 7,
      isWhtDeducted: true,
      whtRate: 3,
      source: "สกรีนเสื้อทีม 150 ตัว",
      status: "WAITING_WHT_CERT",
    },
  ];

  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const vatAmount = (inc.amount * (inc.vatRate || 0)) / 100;
    const whtAmount = inc.isWhtDeducted ? (inc.amount * (inc.whtRate || 0)) / 100 : 0;
    const netReceived = inc.amount + vatAmount - whtAmount;
    const contact = createdContacts[inc.contactName];

    await prisma.income.create({
      data: {
        companyId: anajak.id,
        contactId: contact?.id || null,
        amount: inc.amount,
        vatRate: inc.vatRate,
        vatAmount: vatAmount > 0 ? vatAmount : null,
        isWhtDeducted: inc.isWhtDeducted || false,
        whtRate: inc.whtRate || null,
        whtAmount: whtAmount > 0 ? whtAmount : null,
        whtType: inc.isWhtDeducted ? "SERVICE_3" : null,
        netReceived,
        source: inc.source,
        status: inc.status,
        receiveDate: new Date(now.getFullYear(), now.getMonth(), 3 + i * 7),
        createdBy: demoUser.id,
      },
    });
  }
  console.log("✅ Created sample incomes");

  console.log("✨ Seeding completed!");
  console.log("\n📝 Login credentials:");
  console.log("   Admin: admin@billtracker.com / admin123");
  console.log("   Demo:  demo@billtracker.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
