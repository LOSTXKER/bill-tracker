import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

// POST /api/[company]/categories/reset
// Reactivates all default categories
async function handlePost(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    // Update all default categories to be active
    const result = await prisma.category.updateMany({
      where: {
        companyId: context.company.id,
        isDefault: true,
      },
      data: {
        isActive: true,
      },
    });

    return apiResponse.success(
      { count: result.count },
      `เปิดใช้งานหมวดหมู่เริ่มต้น ${result.count} รายการ`
    );
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
  // URL: /api/[company]/categories/reset → pathParts = ["", "api", "company", "categories", "reset"]
  return pathParts[2];
};

export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
