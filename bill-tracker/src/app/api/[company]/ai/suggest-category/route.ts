import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { suggestCategory } from "@/lib/ai/suggest-category";
import { prisma } from "@/lib/db";

export const POST = withCompanyAccessFromParams(async (request, { company }) => {
  const body = await request.json();
  const { descriptions, type } = body;

  if (!Array.isArray(descriptions) || descriptions.length === 0) {
    return apiResponse.badRequest("กรุณาใส่รายละเอียดค่าใช้จ่าย");
  }

  const companyProfile = await prisma.company.findUnique({
    where: { id: company.id },
    select: { name: true, businessDescription: true },
  });

  const transactionType = type === "income" ? "INCOME" : "EXPENSE";
  const result = await suggestCategory({
    descriptions: descriptions.filter((d: unknown) => typeof d === "string" && d.trim()),
    companyId: company.id,
    transactionType,
    companyName: companyProfile?.name ?? undefined,
    businessDescription: companyProfile?.businessDescription ?? undefined,
  });

  if ("error" in result) {
    return apiResponse.error(new Error(result.error));
  }

  return apiResponse.success(result);
});
