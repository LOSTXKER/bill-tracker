import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  return url.pathname.split("/")[2];
};

const getCategoryId = (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  return parts[parts.length - 1];
};

async function handlePatch(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const categoryId = getCategoryId(req);
  const body = await req.json();
  const { name, icon, color, sortOrder, isActive } = body;

  const existing = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, companyId: context.company.id },
  });

  if (!existing) {
    return apiResponse.notFound("ไม่พบหมวดหมู่");
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (icon !== undefined) data.icon = icon;
  if (color !== undefined) data.color = color;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (isActive !== undefined) data.isActive = isActive;

  const category = await prisma.transactionCategory.update({
    where: { id: categoryId },
    data,
  });

  return apiResponse.success({ category });
}

async function handleDelete(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const categoryId = getCategoryId(req);

  const existing = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, companyId: context.company.id },
    include: { Children: { select: { id: true } } },
  });

  if (!existing) {
    return apiResponse.notFound("ไม่พบหมวดหมู่");
  }

  // Check if category is used by any transactions
  const [expenseCount, incomeCount] = await Promise.all([
    prisma.expense.count({ where: { categoryId } }),
    prisma.income.count({ where: { categoryId } }),
  ]);

  if (expenseCount > 0 || incomeCount > 0) {
    // Soft delete: deactivate instead
    await prisma.transactionCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
    return apiResponse.success({
      category: { id: categoryId, isActive: false },
      message: `หมวดหมู่ถูกปิดการใช้งาน (มีรายการใช้งานอยู่ ${expenseCount + incomeCount} รายการ)`,
    });
  }

  // If it's a group with children, deactivate all children too
  if (existing.Children.length > 0) {
    await prisma.transactionCategory.updateMany({
      where: { parentId: categoryId },
      data: { isActive: false },
    });
    await prisma.transactionCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
    return apiResponse.success({
      category: { id: categoryId, isActive: false },
      message: "ปิดการใช้งานกลุ่มและหมวดย่อยทั้งหมด",
    });
  }

  // Safe to hard delete
  await prisma.transactionCategory.delete({ where: { id: categoryId } });
  return apiResponse.success({ deleted: true });
}

export const PATCH = withCompanyAccess(handlePatch, {
  getCompanyCode: getCompanyFromPath,
});

export const DELETE = withCompanyAccess(handleDelete, {
  getCompanyCode: getCompanyFromPath,
});
