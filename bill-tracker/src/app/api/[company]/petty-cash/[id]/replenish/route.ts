/**
 * Petty Cash Replenish API
 * POST /api/[company]/petty-cash/[id]/replenish - Add money to fund
 */

import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils/serializers";

export async function POST(
  request: Request,
  props: { params: Promise<{ company: string; id: string }> }
) {
  return withCompanyAccessFromParams(
    async (req, { company, session }) => {
      const { id } = await props.params;
      const body = await req.json();
      const { amount, description } = body;

      if (!amount || amount <= 0) {
        return apiResponse.badRequest("กรุณาระบุจำนวนเงินที่ต้องการเติม");
      }

      const fund = await prisma.pettyCashFund.findFirst({
        where: { id, companyId: company.id },
      });

      if (!fund) {
        return apiResponse.notFound("ไม่พบกองทุนเงินสดย่อย");
      }

      if (!fund.isActive) {
        return apiResponse.badRequest("กองทุนนี้ถูกปิดการใช้งานแล้ว");
      }

      // Update fund balance and create transaction in a transaction
      const [updatedFund, transaction] = await prisma.$transaction([
        prisma.pettyCashFund.update({
          where: { id },
          data: {
            currentAmount: {
              increment: amount,
            },
          },
        }),
        prisma.pettyCashTransaction.create({
          data: {
            fundId: id,
            type: "REPLENISH",
            amount,
            description: description || "เติมเงินสดย่อย",
            createdBy: session.user.id,
          },
          include: {
            User: {
              select: { id: true, name: true },
            },
          },
        }),
      ]);

      return apiResponse.success({
        fund: {
          ...updatedFund,
          initialAmount: toNumber(updatedFund.initialAmount),
          currentAmount: toNumber(updatedFund.currentAmount),
          lowThreshold: updatedFund.lowThreshold
            ? toNumber(updatedFund.lowThreshold)
            : null,
        },
        transaction: {
          ...transaction,
          amount: toNumber(transaction.amount),
        },
      });
    },
    { permission: "expenses:create" }
  )(request, props);
}
