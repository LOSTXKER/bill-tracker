import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/companies/[id]
 * Update company settings
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has admin access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: id,
        },
      },
    });

    if (!access || !access.isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { businessDescription } = body;

    // Update company
    const updated = await prisma.company.update({
      where: { id },
      data: {
        businessDescription: businessDescription || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/[id]
 * Get company details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: id,
        },
      },
    });

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
