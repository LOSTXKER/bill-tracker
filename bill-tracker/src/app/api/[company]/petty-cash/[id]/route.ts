/**
 * Single Petty Cash Fund API
 * GET /api/[company]/petty-cash/[id] - Get fund details
 * PUT /api/[company]/petty-cash/[id] - Update fund
 * DELETE /api/[company]/petty-cash/[id] - Delete fund
 */

import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils/serializers";

// GET - Get fund details with recent transactions
export async function GET(
  request: Request,
  props: { params: Promise<{ company: string; id: string }> }
) {
  return withCompanyAccessFromParams(
    async (_req, { company }) => {
      const { id } = await props.params;

      const fund = await prisma.pettyCashFund.findFirst({
        where: { id, companyId: company.id },
        include: {
          Custodian: {
            select: { id: true, name: true, email: true },
          },
          Transactions: {
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              Expense: {
                select: { id: true, description: true },
              },
              User: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!fund) {
        return apiResponse.notFound("ไม่พบกองทุนเงินสดย่อย");
      }

      return apiResponse.success({
        fund: {
          ...fund,
          initialAmount: toNumber(fund.initialAmount),
          currentAmount: toNumber(fund.currentAmount),
          lowThreshold: fund.lowThreshold ? toNumber(fund.lowThreshold) : null,
          Transactions: fund.Transactions.map((t) => ({
            ...t,
            amount: toNumber(t.amount),
          })),
        },
      });
    },
    { permission: "expenses:read" }
  )(request, props);
}

// PUT - Update fund
export async function PUT(
  request: Request,
  props: { params: Promise<{ company: string; id: string }> }
) {
  return withCompanyAccessFromParams(
    async (req, { company }) => {
      const { id } = await props.params;
      const body = await req.json();
      const { name, lowThreshold, custodianId, isActive } = body;

      const fund = await prisma.pettyCashFund.findFirst({
        where: { id, companyId: company.id },
      });

      if (!fund) {
        return apiResponse.notFound("ไม่พบกองทุนเงินสดย่อย");
      }

      const updatedFund = await prisma.pettyCashFund.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(lowThreshold !== undefined && { lowThreshold }),
          ...(custodianId !== undefined && { custodianId }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          Custodian: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return apiResponse.success({
        fund: {
          ...updatedFund,
          initialAmount: toNumber(updatedFund.initialAmount),
          currentAmount: toNumber(updatedFund.currentAmount),
          lowThreshold: updatedFund.lowThreshold
            ? toNumber(updatedFund.lowThreshold)
            : null,
        },
      });
    },
    { permission: "settings:manage-team" }
  )(request, props);
}

// DELETE - Delete fund (only if no transactions)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ company: string; id: string }> }
) {
  return withCompanyAccessFromParams(
    async (_req, { company }) => {
      const { id } = await props.params;

      const fund = await prisma.pettyCashFund.findFirst({
        where: { id, companyId: company.id },
        include: {
          _count: { select: { Transactions: true } },
        },
      });

      if (!fund) {
        return apiResponse.notFound("ไม่พบกองทุนเงินสดย่อย");
      }

      // Only allow deletion if there's only the initial transaction
      if (fund._count.Transactions > 1) {
        return apiResponse.badRequest(
          "ไม่สามารถลบกองทุนที่มีประวัติการทำรายการได้ กรุณาปิดการใช้งานแทน"
        );
      }

      await prisma.pettyCashFund.delete({
        where: { id },
      });

      return apiResponse.success({ message: "ลบกองทุนเรียบร้อยแล้ว" });
    },
    { permission: "settings:manage-team" }
  )(request, props);
}
