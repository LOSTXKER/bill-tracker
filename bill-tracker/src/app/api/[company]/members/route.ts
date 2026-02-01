import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/[company]/members
 * 
 * Get all members of a company (using company code)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const members = await prisma.companyAccess.findMany({
      where: { companyId: company.id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { isOwner: "desc" },
        { createdAt: "asc" },
      ],
    });

    return apiResponse.success({
      members: members.map((m) => ({
        id: m.User.id,
        name: m.User.name,
        email: m.User.email,
        avatarUrl: m.User.avatarUrl,
        isActive: m.User.isActive,
        isOwner: m.isOwner,
      })),
    });
  }
);
