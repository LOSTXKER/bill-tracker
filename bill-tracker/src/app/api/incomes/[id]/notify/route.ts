import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyIncome } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/incomes/[id]/notify
 * Send LINE notification for an income
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
