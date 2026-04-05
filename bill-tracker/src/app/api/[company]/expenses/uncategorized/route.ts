import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

async function handleGet(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
  }
) {
  const expenses = await prisma.expense.findMany({
    where: {
      companyId: context.company.id,
      accountId: null,
      deletedAt: null,
    },
    select: {
      id: true,
      description: true,
      amount: true,
      netPaid: true,
      billDate: true,
      contactId: true,
      contactName: true,
      Contact: { select: { id: true, name: true, taxId: true } },
    },
    orderBy: { billDate: "desc" },
    take: 500,
  });

  const serialized = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    netPaid: Number(e.netPaid),
    billDate: e.billDate.toISOString(),
    contactId: e.contactId,
    contactName: e.Contact?.name || e.contactName || null,
  }));

  // Group by contactName for easier bulk assignment
  const grouped: Record<string, typeof serialized> = {};
  for (const expense of serialized) {
    const key = expense.contactName || "__no_contact__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(expense);
  }

  return apiResponse.success({
    expenses: serialized,
    grouped,
    total: serialized.length,
  });
}

export const GET = withCompanyAccessFromParams(handleGet);
