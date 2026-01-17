/**
 * Petty Cash Fund API
 * GET /api/[company]/petty-cash - List all funds
 * POST /api/[company]/petty-cash - Create a new fund
 */

import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils/serializers";

// GET - List all petty cash funds
export async function GET(
  request: Request,
  props: { params: Promise<{ company: string }> }
) {
  return withCompanyAccessFromParams(
    async (_req, { company }) => {
      const funds = await prisma.pettyCashFund.findMany({
        where: { companyId: company.id },
        include: {
          Custodian: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { Transactions: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate summary
      const summary = {
        totalFunds: funds.length,
        activeFunds: funds.filter((f) => f.isActive).length,
        totalBalance: funds.reduce((sum, f) => sum + toNumber(f.currentAmount), 0),
        lowBalanceFunds: funds.filter(
          (f) =>
            f.isActive &&
            f.lowThreshold &&
            toNumber(f.currentAmount) <= toNumber(f.lowThreshold)
        ).length,
      };

      return apiResponse.success({
        funds: funds.map((f) => ({
          ...f,
          initialAmount: toNumber(f.initialAmount),
          currentAmount: toNumber(f.currentAmount),
          lowThreshold: f.lowThreshold ? toNumber(f.lowThreshold) : null,
          transactionCount: f._count.Transactions,
        })),
        summary,
      });
    },
    { permission: "expenses:read" }
  )(request, props);
}

// POST - Create a new petty cash fund
export async function POST(
  request: Request,
  props: { params: Promise<{ company: string }> }
) {
  return withCompanyAccessFromParams(
    async (req, { company, session }) => {
      const body = await req.json();
      const { name, initialAmount, lowThreshold, custodianId } = body;

      if (!name || !initialAmount) {
        return apiResponse.badRequest("กรุณาระบุชื่อกองทุนและยอดเงินตั้งต้น");
      }

      const fund = await prisma.pettyCashFund.create({
        data: {
          companyId: company.id,
          name,
          initialAmount,
          currentAmount: initialAmount, // Start with initial amount
          lowThreshold: lowThreshold || null,
          custodianId: custodianId || null,
        },
        include: {
          Custodian: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create initial transaction
      await prisma.pettyCashTransaction.create({
        data: {
          fundId: fund.id,
          type: "REPLENISH",
          amount: initialAmount,
          description: "ยอดเริ่มต้นกองทุน",
          createdBy: session.user.id,
        },
      });

      return apiResponse.success({
        fund: {
          ...fund,
          initialAmount: toNumber(fund.initialAmount),
          currentAmount: toNumber(fund.currentAmount),
          lowThreshold: fund.lowThreshold ? toNumber(fund.lowThreshold) : null,
        },
      });
    },
    { permission: "settings:manage-team" }
  )(request, props);
}
