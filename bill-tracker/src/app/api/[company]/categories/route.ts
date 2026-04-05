import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { seedCategoriesForCompany } from "@/lib/api/seed-categories";

const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  return url.pathname.split("/")[2];
};

async function handleGet(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // EXPENSE or INCOME
  const activeOnly = searchParams.get("activeOnly") !== "false";
  const flat = searchParams.get("flat") === "true";

  const where: any = { companyId: context.company.id };
  if (type) where.type = type;
  if (activeOnly) where.isActive = true;

  const countInclude = { _count: { select: { Expenses: true, Incomes: true } } };

  if (flat) {
    const categories = await prisma.transactionCategory.findMany({
      where,
      include: countInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return apiResponse.success({ categories });
  }

  // Hierarchical: return groups with children
  const groups = await prisma.transactionCategory.findMany({
    where: { ...where, parentId: null },
    include: {
      ...countInclude,
      Children: {
        where: activeOnly ? { isActive: true } : {},
        include: countInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return apiResponse.success({ categories: groups });
}

async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const body = await req.json();
  const { name, type, parentId, icon, color, sortOrder } = body;

  if (!name || !type) {
    return apiResponse.badRequest("กรุณาระบุ name และ type");
  }

  if (!["EXPENSE", "INCOME"].includes(type)) {
    return apiResponse.badRequest("type ต้องเป็น EXPENSE หรือ INCOME");
  }

  // If action is "seed-defaults", seed default categories
  if (body.action === "seed-defaults") {
    const existing = await prisma.transactionCategory.count({
      where: { companyId: context.company.id },
    });
    if (existing > 0) {
      return apiResponse.badRequest("มีหมวดหมู่อยู่แล้ว ไม่สามารถสร้างค่าเริ่มต้นได้");
    }
    await seedCategoriesForCompany(context.company.id);
    const categories = await prisma.transactionCategory.findMany({
      where: { companyId: context.company.id, parentId: null },
      include: { Children: { orderBy: [{ sortOrder: "asc" }] } },
      orderBy: [{ sortOrder: "asc" }],
    });
    return apiResponse.created({ categories });
  }

  const category = await prisma.transactionCategory.create({
    data: {
      companyId: context.company.id,
      name,
      type,
      parentId: parentId || null,
      icon: icon || null,
      color: color || null,
      sortOrder: sortOrder ?? 0,
    },
  });

  return apiResponse.created({ category });
}

export const GET = withCompanyAccess(handleGet, {
  getCompanyCode: getCompanyFromPath,
});

export const POST = withCompanyAccess(handlePost, {
  getCompanyCode: getCompanyFromPath,
});
