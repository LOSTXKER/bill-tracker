import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

const MIN_TOTAL_EXPENSES = 3;
const MAJORITY_THRESHOLD = 0.6;

async function handleGet(
  _req: Request,
  context: {
    company: { id: string; code: string; name: string };
  }
) {
  const counts = await prisma.expense.groupBy({
    by: ["contactName", "accountId"],
    where: {
      companyId: context.company.id,
      deletedAt: null,
      accountId: { not: null },
      contactName: { not: null },
    },
    _count: true,
  });

  const contactMap = new Map<
    string,
    { accountId: string; count: number }[]
  >();
  for (const row of counts) {
    const name = row.contactName!;
    if (!contactMap.has(name)) contactMap.set(name, []);
    contactMap.get(name)!.push({ accountId: row.accountId!, count: row._count });
  }

  interface OutlierGroup {
    contactName: string;
    majorityAccountId: string;
    majorityCount: number;
    totalCount: number;
    outlierAccounts: string[];
  }

  const outlierGroups: OutlierGroup[] = [];

  for (const [contactName, buckets] of contactMap) {
    const totalCount = buckets.reduce((s, b) => s + b.count, 0);
    if (totalCount < MIN_TOTAL_EXPENSES) continue;

    buckets.sort((a, b) => b.count - a.count);
    const majority = buckets[0];
    if (majority.count / totalCount < MAJORITY_THRESHOLD) continue;
    if (buckets.length < 2) continue;

    outlierGroups.push({
      contactName,
      majorityAccountId: majority.accountId,
      majorityCount: majority.count,
      totalCount,
      outlierAccounts: buckets.slice(1).map((b) => b.accountId),
    });
  }

  if (outlierGroups.length === 0) {
    return apiResponse.success({ totalAnomalies: 0, groups: [] });
  }

  const orConditions = outlierGroups.flatMap((g) =>
    g.outlierAccounts.map((aid) => ({
      contactName: g.contactName,
      accountId: aid,
    }))
  );

  const anomalyExpenses = await prisma.expense.findMany({
    where: {
      companyId: context.company.id,
      deletedAt: null,
      OR: orConditions,
    },
    select: {
      id: true,
      description: true,
      amount: true,
      netPaid: true,
      billDate: true,
      contactId: true,
      contactName: true,
      accountId: true,
      Account: { select: { id: true, code: true, name: true } },
    },
    orderBy: { billDate: "desc" },
    take: 500,
  });

  const allAccountIds = [
    ...new Set(outlierGroups.map((g) => g.majorityAccountId)),
  ];
  const accounts = await prisma.account.findMany({
    where: { id: { in: allAccountIds } },
    select: { id: true, code: true, name: true },
  });
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const groups = outlierGroups
    .map((g) => {
      const majorityAccount = accountById.get(g.majorityAccountId);
      if (!majorityAccount) return null;

      const anomalies = anomalyExpenses
        .filter((e) => e.contactName === g.contactName)
        .map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          netPaid: Number(e.netPaid),
          billDate: e.billDate.toISOString(),
          contactId: e.contactId,
          currentAccount: e.Account
            ? { id: e.Account.id, code: e.Account.code, name: e.Account.name }
            : null,
        }));

      if (anomalies.length === 0) return null;

      return {
        contactName: g.contactName,
        majorityAccount,
        majorityCount: g.majorityCount,
        totalCount: g.totalCount,
        anomalies,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.anomalies.length - a!.anomalies.length);

  const totalAnomalies = groups.reduce(
    (s, g) => s + g!.anomalies.length,
    0
  );

  return apiResponse.success({ totalAnomalies, groups });
}

export const GET = withCompanyAccessFromParams(handleGet);
