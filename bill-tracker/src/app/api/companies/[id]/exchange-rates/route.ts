import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/permissions/checker";
import { createAuditLog } from "@/lib/audit/logger";

// GET /api/companies/[id]/exchange-rates
export const GET = withAuth(async (req, { session }, routeContext) => {
  try {
    const { id: companyCode } = await routeContext.params;
    const user = session.user;

    // Find company
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: { id: true, code: true, exchangeRates: true },
    });

    if (!company) {
      return apiResponse.notFound("ไม่พบบริษัท");
    }

    // Check access
    const access = await prisma.companyAccess.findFirst({
      where: { userId: user.id, companyId: company.id },
    });

    if (!access) {
      return apiResponse.forbidden("ไม่มีสิทธิ์เข้าถึง");
    }

    return apiResponse.success({
      exchangeRates: company.exchangeRates || {},
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return apiResponse.error(error instanceof Error ? error : "เกิดข้อผิดพลาด");
  }
});

// PUT /api/companies/[id]/exchange-rates
export const PUT = withAuth(async (req, { session }, routeContext) => {
  try {
    const { id: companyCode } = await routeContext.params;
    const user = session.user;
    const body = await req.json();
    const { exchangeRates } = body;

    if (!exchangeRates || typeof exchangeRates !== "object") {
      return apiResponse.badRequest("ข้อมูลไม่ถูกต้อง");
    }

    // Validate exchange rates
    for (const [currency, rate] of Object.entries(exchangeRates)) {
      if (typeof rate !== "number" || rate <= 0) {
        return apiResponse.badRequest(`อัตราแลกเปลี่ยนสำหรับ ${currency} ไม่ถูกต้อง`);
      }
    }

    // Find company
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: { id: true, code: true },
    });

    if (!company) {
      return apiResponse.notFound("ไม่พบบริษัท");
    }

    // Check permission
    const canManage = await hasPermission(user.id, company.id, "settings:manage");
    if (!canManage) {
      return apiResponse.forbidden("ไม่มีสิทธิ์แก้ไขการตั้งค่า");
    }

    // Update exchange rates
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { exchangeRates },
      select: { id: true, code: true, exchangeRates: true },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      companyId: company.id,
      action: "UPDATE",
      entityType: "COMPANY",
      entityId: company.id,
      changes: {
        field: "exchangeRates",
        newValue: exchangeRates,
      },
      description: "แก้ไขอัตราแลกเปลี่ยน",
    });

    return apiResponse.success({
      message: "อัปเดตอัตราแลกเปลี่ยนสำเร็จ",
      exchangeRates: updatedCompany.exchangeRates,
    });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return apiResponse.error(error instanceof Error ? error : "เกิดข้อผิดพลาด");
  }
});
