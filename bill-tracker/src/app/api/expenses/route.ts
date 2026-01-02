import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { expenseSchema } from "@/lib/validations/expense";
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

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          vendor: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { billDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
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
    const { companyCode, vatAmount, whtAmount, netPaid, ...data } = body;

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

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
        vendorName: data.vendorName,
        vendorTaxId: data.vendorTaxId,
        amount: data.amount,
        vatRate: data.vatRate || 0,
        vatAmount: vatAmount || null,
        isWht: data.isWht || false,
        whtRate: data.whtRate || null,
        whtAmount: whtAmount || null,
        whtType: data.whtType || null,
        netPaid: netPaid,
        description: data.description,
        category: data.category,
        invoiceNumber: data.invoiceNumber,
        referenceNo: data.referenceNo,
        paymentMethod: data.paymentMethod,
        billDate: data.billDate ? new Date(data.billDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
        entityType: "Expense",
        entityId: expense.id,
        changes: { created: expense },
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
