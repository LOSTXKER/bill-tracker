import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

async function handleGet(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  const contactId = context.params.id;
  const companyId = context.company.id;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
    select: { taxId: true },
  });

  if (!contact) {
    return apiResponse.error(ApiErrors.notFound("ผู้ติดต่อ"));
  }

  // 1. Check VendorMapping first (fastest, explicit mapping)
  if (contact.taxId) {
    const mapping = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        vendorTaxId: contact.taxId,
        accountId: { not: null },
      },
      orderBy: { useCount: "desc" },
      select: {
        accountId: true,
        defaultVatRate: true,
        defaultWhtRate: true,
        defaultWhtType: true,
        paymentMethod: true,
        Account: { select: { id: true, code: true, name: true } },
      },
    });

    if (mapping?.accountId && mapping.Account) {
      return apiResponse.success({
        source: "vendor_mapping",
        accountId: mapping.accountId,
        account: mapping.Account,
        defaults: {
          vatRate: mapping.defaultVatRate,
          whtRate: mapping.defaultWhtRate,
          whtType: mapping.defaultWhtType,
          paymentMethod: mapping.paymentMethod,
        },
      });
    }
  }

  // 2. Fallback: aggregate from expense history
  const topAccounts = await prisma.expense.groupBy({
    by: ["accountId"],
    where: {
      companyId,
      contactId,
      accountId: { not: null },
      deletedAt: null,
    },
    _count: { accountId: true },
    orderBy: { _count: { accountId: "desc" } },
    take: 3,
  });

  if (topAccounts.length === 0) {
    return apiResponse.success({ source: "none", accountId: null });
  }

  const accountIds = topAccounts.map((a) => a.accountId).filter(Boolean) as string[];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const primary = accountMap.get(topAccounts[0].accountId!);
  const alternatives = topAccounts.slice(1).map((a) => ({
    accountId: a.accountId!,
    account: accountMap.get(a.accountId!) || null,
    count: a._count.accountId,
  })).filter((a) => a.account);

  return apiResponse.success({
    source: "history",
    accountId: topAccounts[0].accountId,
    account: primary || null,
    alternatives,
  });
}

export const GET = withCompanyAccessFromParams(handleGet);
