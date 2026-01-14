import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { exportContactsToPEAK } from "@/lib/export/peak-export";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/contacts/export?company=ABC&format=peak
 * Export contacts to Peak Excel format
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "peak";

    // Fetch all contacts for the company
    const contacts = await prisma.contact.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
    });

    if (format === "peak") {
      // Export to Peak format
      const buffer = await exportContactsToPEAK(contacts, company.name);

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Peak_Contacts_${company.code}_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }

    return apiResponse.badRequest("Unsupported format");
  },
  { permission: "contacts:read" }
);
