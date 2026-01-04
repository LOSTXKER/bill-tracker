import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { categorySchema } from "@/lib/validations/category";

// GET /api/[company]/categories?type=EXPENSE|INCOME
async function handleGet(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const categories = await prisma.category.findMany({
    where: {
      companyId: context.company.id,
      ...(type && { type: type as "EXPENSE" | "INCOME" }),
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json(categories);
}

// POST /api/[company]/categories
async function handlePost(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    const body = await req.json();
    const validatedData = categorySchema.parse(body);

    // Check if category with same name and type already exists
    const existing = await prisma.category.findUnique({
      where: {
        companyId_name_type: {
          companyId: context.company.id,
          name: validatedData.name,
          type: validatedData.type,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "หมวดหมู่นี้มีอยู่แล้ว" },
        { status: 400 }
      );
    }

    // Get the highest order for this type
    const maxOrder = await prisma.category.aggregate({
      where: {
        companyId: context.company.id,
        type: validatedData.type,
      },
      _max: {
        order: true,
      },
    });

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        companyId: context.company.id,
        isDefault: false,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json(category, { status: 201 });
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
  // URL: /api/[company]/categories → pathParts = ["", "api", "company", "categories"]
  return pathParts[2];
};

export const GET = withCompanyAccess(handleGet, {
  permission: "settings:read",
  getCompanyCode: getCompanyFromPath,
});
export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
