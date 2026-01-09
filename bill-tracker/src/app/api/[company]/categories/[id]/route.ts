import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { updateCategorySchema } from "@/lib/validations/category";
import { apiResponse } from "@/lib/api/response";

// GET /api/[company]/categories/[id]
async function handleGet(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const id = pathParts[4]; // /api/[company]/categories/[id]

  const category = await prisma.category.findFirst({
    where: {
      id,
      companyId: context.company.id,
    },
  });

  if (!category) {
    return apiResponse.notFound("ไม่พบหมวดหมู่");
  }

  return apiResponse.success({ category });
}

// PUT /api/[company]/categories/[id]
async function handlePut(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[4]; // /api/[company]/categories/[id]
    
    const body = await req.json();
    const validatedData = updateCategorySchema.parse({ ...body, id });

    // Check if category exists
    const existing = await prisma.category.findFirst({
      where: {
        id,
        companyId: context.company.id,
      },
    });

    if (!existing) {
      return apiResponse.notFound("ไม่พบหมวดหมู่");
    }

    // If name is being changed, check for duplicates
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: {
          companyId_name_type: {
            companyId: context.company.id,
            name: validatedData.name,
            type: existing.type,
          },
        },
      });

      if (duplicate) {
        return apiResponse.badRequest("หมวดหมู่นี้มีอยู่แล้ว");
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...validatedData,
        id: undefined, // Remove id from update data
      },
    });

    return apiResponse.success({ category }, "Category updated successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiResponse.badRequest(error.message);
    }
    return apiResponse.error("เกิดข้อผิดพลาด");
  }
}

// DELETE /api/[company]/categories/[id]
async function handleDelete(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[4]; // /api/[company]/categories/[id]

    // Check if category exists
    const category = await prisma.category.findFirst({
      where: {
        id,
        companyId: context.company.id,
      },
    });

    if (!category) {
      return apiResponse.notFound("ไม่พบหมวดหมู่");
    }

    // Don't allow deleting default categories
    if (category.isDefault) {
      return apiResponse.badRequest("ไม่สามารถลบหมวดหมู่เริ่มต้นได้ กรุณาปิดการใช้งานแทน");
    }

    // Check if category is in use
    const expenseCount = await prisma.expense.count({
      where: { categoryId: id },
    });

    const incomeCount = await prisma.income.count({
      where: { categoryId: id },
    });

    if (expenseCount > 0 || incomeCount > 0) {
      return apiResponse.badRequest(`ไม่สามารถลบหมวดหมู่ที่มีการใช้งานอยู่ได้ (${expenseCount + incomeCount} รายการ)`);
    }

    await prisma.category.delete({
      where: { id },
    });

    return apiResponse.success({ success: true }, "Category deleted successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiResponse.badRequest(error.message);
    }
    return apiResponse.error("เกิดข้อผิดพลาด");
  }
}

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // URL: /api/[company]/categories/[id] → pathParts = ["", "api", "company", "categories", "id"]
  return pathParts[2];
};

export const GET = withCompanyAccess(handleGet, {
  permission: "settings:read",
  getCompanyCode: getCompanyFromPath,
});
export const PUT = withCompanyAccess(handlePut, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
export const DELETE = withCompanyAccess(handleDelete, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
