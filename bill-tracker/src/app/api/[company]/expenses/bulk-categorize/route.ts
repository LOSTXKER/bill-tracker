import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { learnFromTransaction } from "@/lib/api/vendor-mapping";

async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
  }
) {
  const body = await req.json();
  const { expenseIds, accountId } = body as { expenseIds: string[]; accountId: string };

  if (!Array.isArray(expenseIds) || expenseIds.length === 0 || !accountId) {
    return apiResponse.error(ApiErrors.badRequest("expenseIds and accountId are required"));
  }

  if (expenseIds.length > 200) {
    return apiResponse.error(ApiErrors.badRequest("Maximum 200 expenses per batch"));
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId },
    select: { id: true },
  });
  if (!account) {
    return apiResponse.error(ApiErrors.notFound("บัญชี"));
  }

  const result = await prisma.expense.updateMany({
    where: {
      id: { in: expenseIds },
      companyId: context.company.id,
      deletedAt: null,
    },
    data: { accountId },
  });

  // Learn from these updates
  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, companyId: context.company.id },
    select: { id: true, contactId: true, contactName: true, vatRate: true, whtRate: true, whtType: true },
  });

  for (const expense of expenses) {
    if (expense.contactId || expense.contactName) {
      learnFromTransaction({
        companyId: context.company.id,
        contactId: expense.contactId,
        contactName: expense.contactName,
        accountId,
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
