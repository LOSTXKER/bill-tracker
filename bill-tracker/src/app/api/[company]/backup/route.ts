import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  return pathParts[2];
};

// GET /api/[company]/backup
// Returns backup metadata/stats
async function handleGet(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const [
    expenseCount,
    incomeCount,
    contactCount,
    categoryCount,
    userCount,
  ] = await Promise.all([
    prisma.expense.count({
      where: { companyId: context.company.id, deletedAt: null },
    }),
    prisma.income.count({
      where: { companyId: context.company.id, deletedAt: null },
    }),
    prisma.contact.count({
      where: { companyId: context.company.id },
    }),
    prisma.category.count({
      where: { companyId: context.company.id },
    }),
    prisma.companyAccess.count({
      where: { companyId: context.company.id },
    }),
  ]);

  return NextResponse.json({
    companyCode: context.company.code,
    companyName: context.company.name,
    stats: {
      expenses: expenseCount,
      incomes: incomeCount,
      contacts: contactCount,
      categories: categoryCount,
      users: userCount,
    },
    estimatedSize: `~${Math.ceil((expenseCount + incomeCount) * 2)} KB`,
  });
}

// POST /api/[company]/backup
// Generate and download full backup
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    // Fetch all company data
    const [
      company,
      expenses,
      incomes,
      contacts,
      categories,
      companyAccess,
      vendorMappings,
      auditLogs,
    ] = await Promise.all([
      // Company info
      prisma.company.findUnique({
        where: { id: context.company.id },
        select: {
          id: true,
          name: true,
          code: true,
          taxId: true,
          address: true,
          phone: true,
          logoUrl: true,
          lineNotifyEnabled: true,
          lineNotifySettings: true,
          aiConfig: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // All expenses
      prisma.expense.findMany({
        where: { companyId: context.company.id, deletedAt: null },
        include: {
          contact: { select: { id: true, name: true, taxId: true } },
          categoryRef: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { billDate: "desc" },
      }),

      // All incomes
      prisma.income.findMany({
        where: { companyId: context.company.id, deletedAt: null },
        include: {
          contact: { select: { id: true, name: true, taxId: true } },
          categoryRef: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { receiveDate: "desc" },
      }),

      // All contacts
      prisma.contact.findMany({
        where: { companyId: context.company.id },
        orderBy: { name: "asc" },
      }),

      // All categories
      prisma.category.findMany({
        where: { companyId: context.company.id },
        orderBy: [{ type: "asc" }, { order: "asc" }],
      }),

      // Company access (users)
      prisma.companyAccess.findMany({
        where: { companyId: context.company.id },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),

      // Vendor mappings (AI training data)
      prisma.vendorMapping.findMany({
        where: { companyId: context.company.id },
      }),

      // Recent audit logs (last 1000)
      prisma.auditLog.findMany({
        where: { companyId: context.company.id },
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Transform data for export
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      company: {
        ...company,
        // Remove sensitive LINE credentials
        lineChannelSecret: undefined,
        lineChannelAccessToken: undefined,
        lineGroupId: undefined,
      },
      data: {
        expenses: expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
          vatAmount: e.vatAmount ? Number(e.vatAmount) : null,
          whtRate: e.whtRate ? Number(e.whtRate) : null,
          whtAmount: e.whtAmount ? Number(e.whtAmount) : null,
          netPaid: Number(e.netPaid),
        })),
        incomes: incomes.map((i) => ({
          ...i,
          amount: Number(i.amount),
          vatAmount: i.vatAmount ? Number(i.vatAmount) : null,
          whtRate: i.whtRate ? Number(i.whtRate) : null,
          whtAmount: i.whtAmount ? Number(i.whtAmount) : null,
          netReceived: Number(i.netReceived),
        })),
        contacts: contacts.map((c) => ({
          ...c,
          creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        })),
        categories,
        users: companyAccess.map((ca) => ({
          userId: ca.user.id,
          name: ca.user.name,
          email: ca.user.email,
          role: ca.user.role,
          isOwner: ca.isOwner,
          permissions: ca.permissions,
        })),
        vendorMappings,
        auditLogs: auditLogs.map((log) => ({
          ...log,
          user: log.user ? { name: log.user.name, email: log.user.email } : null,
        })),
      },
      stats: {
        expenses: expenses.length,
        incomes: incomes.length,
        contacts: contacts.length,
        categories: categories.length,
        users: companyAccess.length,
        vendorMappings: vendorMappings.length,
        auditLogs: auditLogs.length,
      },
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(backupData, null, 2);
    const buffer = Buffer.from(jsonString, "utf-8");

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `backup_${context.company.code}_${timestamp}.json`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Backup generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการสร้างไฟล์สำรอง",
      },
      { status: 500 }
    );
  }
}

export const GET = withCompanyAccess(handleGet, {
  requireOwner: true, // Only owner can access backup
  getCompanyCode: getCompanyFromPath,
});

export const POST = withCompanyAccess(handlePost, {
  requireOwner: true, // Only owner can download backup
  getCompanyCode: getCompanyFromPath,
});
