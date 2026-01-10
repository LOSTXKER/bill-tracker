import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  return pathParts[2];
};

// GET /api/[company]/accounts
// List all accounts for a company
async function handleGet(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  const { searchParams } = new URL(req.url);
  const classFilter = searchParams.get("class");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const where: any = {
    companyId: context.company.id,
  };

  if (classFilter) {
    where.class = classFilter;
  }

  if (activeOnly) {
    where.isActive = true;
  }

  const accounts = await prisma.account.findMany({
    where,
    orderBy: [
      { code: "asc" },
    ],
  });

  return apiResponse.success({ accounts });
}

// POST /api/[company]/accounts
// Create a new custom account
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const body = await req.json();
    const { code, name, class: accountClass, keywords, description, parentId } = body;

    // Validation
    if (!code || !name || !accountClass) {
      return apiResponse.badRequest("กรุณาระบุ code, name และ class");
    }

    // Check if code already exists
    const existing = await prisma.account.findUnique({
      where: {
        companyId_code: {
          companyId: context.company.id,
          code,
        },
      },
    });

    if (existing) {
      return apiResponse.error(ApiErrors.conflict(`รหัสบัญชี ${code} มีอยู่แล้ว`));
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        companyId: context.company.id,
        code,
        name,
        class: accountClass,
        keywords: keywords || [],
        description: description || null,
        parentId: parentId || null,
        isSystem: false,
        isActive: true,
      },
    });

    return apiResponse.created({ account });
  } catch (error) {
    console.error("Account creation error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการสร้างบัญชี")
    );
  }
}

export const GET = withCompanyAccess(handleGet, {
  permission: "reports:read",
  getCompanyCode: getCompanyFromPath,
});

export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
