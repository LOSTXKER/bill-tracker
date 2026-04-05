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
    by: ["contactName", "categoryId"],
    where: {
      companyId: context.company.id,
      deletedAt: null,
      categoryId: { not: null },
      contactName: { not: null },
    },
    _count: true,
  });

  const contactMap = new Map<
    string,
    { categoryId: string; count: number }[]
  >();
  for (const row of counts) {
    const name = row.contactName!;
    if (!contactMap.has(name)) contactMap.set(name, []);
    contactMap.get(name)!.push({ categoryId: row.categoryId!, count: row._count });
  }

  interface OutlierGroup {
    contactName: string;
    majorityCategoryId: string;
    majorityCount: number;
    totalCount: number;
    outlierCategories: string[];
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
      majorityCategoryId: majority.categoryId,
      majorityCount: majority.count,
      totalCount,
      outlierCategories: buckets.slice(1).map((b) => b.categoryId),
    });
  }

  if (outlierGroups.length === 0) {
    return apiResponse.success({ totalAnomalies: 0, groups: [] });
  }

  const orConditions = outlierGroups.flatMap((g) =>
    g.outlierCategories.map((cid) => ({
      contactName: g.contactName,
      categoryId: cid,
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
      categoryId: true,
      Category: {
        select: {
          id: true,
          name: true,
          Parent: { select: { name: true } },
        },
      },
    },
    orderBy: { billDate: "desc" },
    take: 500,
  });

  const allCategoryIds = [
    ...new Set(outlierGroups.map((g) => g.majorityCategoryId)),
  ];
  const categoriesData = await prisma.transactionCategory.findMany({
    where: { id: { in: allCategoryIds } },
    select: { id: true, name: true, Parent: { select: { name: true } } },
  });
  const categoryById = new Map(categoriesData.map((c) => [c.id, c]));

  const groups = outlierGroups
    .map((g) => {
      const majorityCategory = categoryById.get(g.majorityCategoryId);
      if (!majorityCategory) return null;

      const anomalies = anomalyExpenses
        .filter((e) => e.contactName === g.contactName)
        .map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          netPaid: Number(e.netPaid),
          billDate: e.billDate.toISOString(),
          contactId: e.contactId,
          currentCategory: e.Category
            ? {
                id: e.Category.id,
                name: e.Category.name,
                groupName: e.Category.Parent?.name || null,
              }
            : null,
        }));

      if (anomalies.length === 0) return null;

      return {
        contactName: g.contactName,
        majorityCategory: {
          id: majorityCategory.id,
          name: majorityCategory.name,
          groupName: majorityCategory.Parent?.name || null,
        },
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
