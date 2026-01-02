import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { incomeSchema } from "@/lib/validations/income";
import { rateLimit, getClientIP } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get("company");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!companyCode) {
      return NextResponse.json({ error: "Company code required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role !== "ADMIN") {
      const access = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: company.id,
          },
        },
      });
      if (!access) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const where = {
      companyId: company.id,
      ...(status && { status: status as any }),
    };

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: {
          customer: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { receiveDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.income.count({ where }),
    ]);

    return NextResponse.json({
      incomes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return NextResponse.json(
      { error: "Failed to fetch incomes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const { success, headers } = rateLimit(ip, { maxRequests: 30, windowMs: 60000 });
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers }
      );
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyCode, vatAmount, whtAmount, netReceived, ...data } = body;

    // Find company
    const company = await prisma.company.findUnique({
      where: { code: companyCode },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role !== "ADMIN") {
      const access = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: company.id,
          },
        },
      });
      if (!access || access.role === "VIEWER") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Create income
    const income = await prisma.income.create({
      data: {
        companyId: company.id,
        customerName: data.customerName,
        customerTaxId: data.customerTaxId,
        amount: data.amount,
        vatRate: data.vatRate || 0,
        vatAmount: vatAmount || null,
        isWhtDeducted: data.isWhtDeducted || false,
        whtRate: data.whtRate || null,
        whtAmount: whtAmount || null,
        whtType: data.whtType || null,
        netReceived: netReceived,
        source: data.source,
        invoiceNumber: data.invoiceNumber,
        referenceNo: data.referenceNo,
        paymentMethod: data.paymentMethod,
        receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
        status: data.status,
        notes: data.notes,
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Income",
        entityId: income.id,
        changes: { created: income },
      },
    });

    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    console.error("Error creating income:", error);
    return NextResponse.json(
      { error: "Failed to create income" },
      { status: 500 }
    );
  }
}
