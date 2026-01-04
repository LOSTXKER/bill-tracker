import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyExpense } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expenses/[id]/notify
 * Send LINE notification for an expense
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
      return NextResponse.json(
        { error: "ไม่สามารถส่งการแจ้งเตือนได้ กรุณาตรวจสอบการตั้งค่า LINE Bot" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ส่งการแจ้งเตือนสำเร็จ",
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
