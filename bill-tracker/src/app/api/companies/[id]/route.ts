import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";
import { revalidateTag } from "next/cache";

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
      return apiResponse.unauthorized();
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
      return apiResponse.forbidden();
    }

    const body = await request.json();
    const { businessDescription, name, legalName, taxId, address, phone } = body;

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription || null;
    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName || null;
    if (taxId !== undefined) updateData.taxId = taxId || null;
    if (address !== undefined) updateData.address = address || null;
    if (phone !== undefined) updateData.phone = phone || null;

    // Update company
    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    // Bust the company lookup caches so name/logo changes are reflected immediately
    revalidateTag("company", {});

    return apiResponse.success(updated);
  } catch (error) {
    console.error("Company update error:", error);
    return apiResponse.error(
      error instanceof Error ? error : new Error("Internal server error")
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
      return apiResponse.unauthorized();
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
      return apiResponse.forbidden();
    }

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    return apiResponse.success(company);
  } catch (error) {
    console.error("Company fetch error:", error);
    return apiResponse.error(
      error instanceof Error ? error : new Error("Internal server error")
    );
  }
}
