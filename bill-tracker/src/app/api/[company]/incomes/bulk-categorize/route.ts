import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

interface BulkCategorizeBody {
  incomeIds?: string[];
  categoryId?: string;
}

async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
  }
) {
  const body = (await req.json()) as BulkCategorizeBody;
  const { incomeIds, categoryId } = body;

  if (!Array.isArray(incomeIds) || incomeIds.length === 0 || !categoryId) {
    return apiResponse.error(ApiErrors.badRequest("incomeIds and categoryId are required"));
  }

  if (incomeIds.length > 200) {
    return apiResponse.error(ApiErrors.badRequest("Maximum 200 incomes per batch"));
  }

  const category = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, companyId: context.company.id },
    select: { id: true },
  });
  if (!category) return apiResponse.error(ApiErrors.notFound("หมวดหมู่"));

  const result = await prisma.income.updateMany({
    where: {
      id: { in: incomeIds },
      companyId: context.company.id,
      deletedAt: null,
    },
    data: { categoryId },
  });

  return apiResponse.success({ updated: result.count });
}

export const PATCH = withCompanyAccessFromParams(handlePatch);
