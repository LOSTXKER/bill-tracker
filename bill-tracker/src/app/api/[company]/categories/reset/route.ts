import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";

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

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `เปิดใช้งานหมวดหมู่เริ่มต้น ${result.count} รายการ`,
    });
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
  // URL: /api/[company]/categories/reset → pathParts = ["", "api", "company", "categories", "reset"]
  return pathParts[2];
};

export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
