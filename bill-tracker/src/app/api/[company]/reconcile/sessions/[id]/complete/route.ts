import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit/logger";

export const POST = withCompanyAccessFromParams(
  async (_request, { session: authSession, company, params }) => {
    const { id } = params;

    const reconcileSession = await prisma.reconcileSession.findFirst({
      where: { id, companyId: company.id },
      include: { Matches: true },
    });

    if (!reconcileSession) {
      throw ApiErrors.notFound("ReconcileSession");
    }

    if (reconcileSession.status === "COMPLETED") {
      throw ApiErrors.badRequest("Session already completed");
    }

    const pendingMatches = reconcileSession.Matches.filter(
      (m) => m.status === "pending"
    );
    if (pendingMatches.length > 0) {
      throw ApiErrors.badRequest(
        `ยังมี ${pendingMatches.length} รายการที่ยังไม่ได้ยืนยัน/ปฏิเสธ`
      );
    }

    const updated = await prisma.reconcileSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: authSession.user.id,
      },
    });

    await createAuditLog({
      userId: authSession.user.id,
      companyId: company.id,
      action: "STATUS_CHANGE",
      entityType: "ReconcileSession",
      entityId: id,
      changes: {
        oldStatus: reconcileSession.status,
        newStatus: "COMPLETED",
        matchedCount: reconcileSession.matchedCount,
      },
      description: `เสร็จสิ้นการเทียบรายงาน ${reconcileSession.month}/${reconcileSession.year} (${reconcileSession.type})`,
    });

    return apiResponse.success(updated);
  },
  { permission: "reports:read" }
);
