import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { notifyExpense } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expenses/[id]/notify
 * Send LINE notification for an expense
 */
export async function POST(request: Request, { params }: RouteParams) {
  return withAuth(async (req, { session }) => {
    const { id } = await params;

    // Get expense with company and contact details
    const expense = await prisma.expense.findUnique({
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

    if (!expense) {
      return apiResponse.notFound("Expense not found");
    }

    // Check user has access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: expense.companyId,
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
    const success = await notifyExpense(
      expense.company.id,
      {
        id: expense.id,
        companyCode: expense.company.code,
        companyName: expense.company.name,
        vendorName: expense.contact?.name || expense.description || undefined,
        description: expense.description || undefined,
        amount: Number(expense.amount),
        vatAmount: expense.vatAmount ? Number(expense.vatAmount) : undefined,
        isWht: expense.isWht,
        whtRate: expense.whtRate ? Number(expense.whtRate) : undefined,
        whtAmount: expense.whtAmount ? Number(expense.whtAmount) : undefined,
        netPaid: Number(expense.netPaid),
        status: expense.status,
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
