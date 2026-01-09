import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { notifyIncome } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/incomes/[id]/notify
 * Send LINE notification for an income
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;

    // Get income with company and contact details
    const income = await prisma.income.findUnique({
      where: { id },
      include: {
        contact: true,
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!income) {
      return apiResponse.notFound("Income not found");
    }

    // Check user has access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: income.companyId,
        },
      },
    });

    if (!access) {
      return apiResponse.forbidden("Access denied");
    }

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Send notification
    const success = await notifyIncome(
      income.company.id,
      {
        id: income.id,
        companyCode: income.company.code,
        companyName: income.company.name,
        customerName: income.contact?.name || income.source || undefined,
        source: income.source || undefined,
        amount: Number(income.amount),
        vatAmount: income.vatAmount ? Number(income.vatAmount) : undefined,
        isWhtDeducted: income.isWhtDeducted,
        whtRate: income.whtRate ? Number(income.whtRate) : undefined,
        whtAmount: income.whtAmount ? Number(income.whtAmount) : undefined,
        netReceived: Number(income.netReceived),
        status: income.status,
      },
      baseUrl
    );

    if (!success) {
      return apiResponse.badRequest(
        "ไม่สามารถส่งการแจ้งเตือนได้ กรุณาตรวจสอบการตั้งค่า LINE Bot"
      );
    }

    return apiResponse.success(
      { message: "ส่งการแจ้งเตือนสำเร็จ" }
    );
  })(request);
}
