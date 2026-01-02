import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If admin, return all companies
    if (session.user.role === "ADMIN") {
      const companies = await prisma.company.findMany({
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ companies });
    }

    // Otherwise, return only companies user has access to
    const companyAccess = await prisma.companyAccess.findMany({
      where: { userId: session.user.id },
      include: { company: true },
    });

    const companies = companyAccess.map((ca: typeof companyAccess[number]) => ({
      ...ca.company,
      role: ca.role,
    }));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, taxId, address, phone } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Validate code format (2-10 uppercase letters/numbers)
    const codeRegex = /^[A-Z0-9]{2,10}$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return NextResponse.json(
        { error: "รหัสบริษัทต้องเป็นตัวอักษร 2-10 ตัว" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.company.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "รหัสบริษัทนี้ถูกใช้แล้ว" },
        { status: 400 }
      );
    }

    // Create company and assign user as OWNER
    const company = await prisma.company.create({
      data: {
        name,
        code: code.toUpperCase(),
        taxId,
        address,
        phone,
        users: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
