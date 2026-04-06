import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { learnFromTransaction } from "@/lib/api/vendor-mapping";

interface BulkCategorizeBody {
  expenseIds?: string[];
  accountId?: string;
  categoryId?: string;
  action?: "update-description";
  expenseId?: string;
  description?: string;
}

async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
  }
) {
  const body = (await req.json()) as BulkCategorizeBody;

  if (body.action === "update-description") {
    if (!body.expenseId || typeof body.description !== "string") {
      return apiResponse.error(ApiErrors.badRequest("expenseId and description are required"));
    }
    const result = await prisma.expense.updateMany({
      where: {
        id: body.expenseId,
        companyId: context.company.id,
        deletedAt: null,
      },
      data: { description: body.description },
    });
    if (result.count === 0) {
      return apiResponse.error(ApiErrors.notFound("ค่าใช้จ่าย"));
    }
    return apiResponse.success({ updated: 1 });
  }

  const { expenseIds, accountId, categoryId } = body;

  if (!Array.isArray(expenseIds) || expenseIds.length === 0 || (!accountId && !categoryId)) {
    return apiResponse.error(ApiErrors.badRequest("expenseIds and (accountId or categoryId) are required"));
  }

  if (expenseIds.length > 200) {
    return apiResponse.error(ApiErrors.badRequest("Maximum 200 expenses per batch"));
  }

  const updateData: Record<string, string> = {};
  if (categoryId) {
    const category = await prisma.transactionCategory.findFirst({
      where: { id: categoryId, companyId: context.company.id },
      select: { id: true },
    });
    if (!category) return apiResponse.error(ApiErrors.notFound("หมวดหมู่"));
    updateData.categoryId = categoryId;
  }
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, companyId: context.company.id },
      select: { id: true },
    });
    if (!account) return apiResponse.error(ApiErrors.notFound("บัญชี"));
    updateData.accountId = accountId;
  }

  const result = await prisma.expense.updateMany({
    where: {
      id: { in: expenseIds },
      companyId: context.company.id,
      deletedAt: null,
      isSettlementTransfer: false,
    },
    data: updateData,
  });

  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, companyId: context.company.id, isSettlementTransfer: false, deletedAt: null },
    select: { id: true, contactId: true, contactName: true, vatRate: true, whtRate: true, whtType: true },
  });

  for (const expense of expenses) {
    if (expense.contactId || expense.contactName) {
      learnFromTransaction({
        companyId: context.company.id,
        contactId: expense.contactId,
        contactName: expense.contactName,
        accountId: accountId || null,
        transactionType: "expense",
        txId: expense.id,
        vatRate: expense.vatRate != null ? Number(expense.vatRate) : null,
        whtRate: expense.whtRate != null ? Number(expense.whtRate) : null,
        whtType: expense.whtType,
      }).catch(() => {});
    }
  }

  return apiResponse.success({ updated: result.count });
}

export const PATCH = withCompanyAccessFromParams(handlePatch);
