import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { updateCategorySchema } from "@/lib/validations/category";

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
    return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
  }

  return NextResponse.json(category);
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
      return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
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
        return NextResponse.json(
          { error: "หมวดหมู่นี้มีอยู่แล้ว" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...validatedData,
        id: undefined, // Remove id from update data
      },
    });

    return NextResponse.json(category);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
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
      return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
    }

    // Don't allow deleting default categories
    if (category.isDefault) {
      return NextResponse.json(
        { error: "ไม่สามารถลบหมวดหมู่เริ่มต้นได้ กรุณาปิดการใช้งานแทน" },
        { status: 400 }
      );
    }

    // Check if category is in use
    const expenseCount = await prisma.expense.count({
      where: { categoryId: id },
    });

    const incomeCount = await prisma.income.count({
      where: { categoryId: id },
    });

    if (expenseCount > 0 || incomeCount > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบหมวดหมู่ที่มีการใช้งานอยู่ได้ (${expenseCount + incomeCount} รายการ)` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
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
