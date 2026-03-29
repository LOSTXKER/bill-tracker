import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

// GET /api/companies/[id]/exchange-rates
export const GET = withCompanyAccessFromParams(async (req, { company }) => {
  return apiResponse.success({
    exchangeRates: company.exchangeRates || {},
  });
});

// PUT /api/companies/[id]/exchange-rates
export const PUT = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const { exchangeRates } = body;

    if (!exchangeRates || typeof exchangeRates !== "object") {
      return apiResponse.badRequest("ข้อมูลไม่ถูกต้อง");
    }

    for (const [currency, rate] of Object.entries(exchangeRates)) {
      if (typeof rate !== "number" || rate <= 0) {
        return apiResponse.badRequest(`อัตราแลกเปลี่ยนสำหรับ ${currency} ไม่ถูกต้อง`);
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { exchangeRates },
      select: { id: true, code: true, exchangeRates: true },
    });

    await createAuditLog({
      userId: session.user.id,
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
  },
  { permission: "settings:manage" }
);
