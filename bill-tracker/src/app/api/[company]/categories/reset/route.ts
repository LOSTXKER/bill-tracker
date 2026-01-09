import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/constants/default-categories";

// POST /api/[company]/categories/reset
// Creates missing default categories and reactivates all default categories
async function handlePost(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    let created = 0;
    let activated = 0;

    // Create or update expense categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      const result = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: context.company.id,
            name: cat.name,
            type: "EXPENSE",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: cat.color,
          order: cat.order,
          icon: cat.icon,
        },
        create: {
          companyId: context.company.id,
          name: cat.name,
          type: "EXPENSE",
          isDefault: true,
          isActive: true,
          color: cat.color,
          order: cat.order,
          icon: cat.icon,
        },
      });

      // Check if it was created or updated
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        activated++;
      }
    }

    // Create or update income categories
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      const result = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: context.company.id,
            name: cat.name,
            type: "INCOME",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: cat.color,
          order: cat.order,
          icon: cat.icon,
        },
        create: {
          companyId: context.company.id,
          name: cat.name,
          type: "INCOME",
          isDefault: true,
          isActive: true,
          color: cat.color,
          order: cat.order,
          icon: cat.icon,
        },
      });

      // Check if it was created or updated
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        activated++;
      }
    }

    const total = DEFAULT_EXPENSE_CATEGORIES.length + DEFAULT_INCOME_CATEGORIES.length;

    return apiResponse.success(
      {
        total,
        created,
        activated,
        expense: DEFAULT_EXPENSE_CATEGORIES.length,
        income: DEFAULT_INCOME_CATEGORIES.length,
      },
      `รีเซ็ตหมวดหมู่สำเร็จ: สร้างใหม่ ${created} รายการ, เปิดใช้งาน ${activated} รายการ`
    );
  } catch (error: unknown) {
    console.error("Reset categories error:", error);
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
  // URL: /api/[company]/categories/reset → pathParts = ["", "api", "company", "categories", "reset"]
  return pathParts[2];
};

export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
