import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { categorySchema } from "@/lib/validations/category";
import { apiResponse } from "@/lib/api/response";

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

  return apiResponse.success({ categories });
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
      return apiResponse.badRequest("หมวดหมู่นี้มีอยู่แล้ว");
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

    return apiResponse.created({ category }, "Category created successfully");
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
