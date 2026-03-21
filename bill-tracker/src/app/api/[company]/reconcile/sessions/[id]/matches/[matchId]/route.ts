import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit/logger";

export const PATCH = withCompanyAccessFromParams(
  async (request, { session: authSession, company, params }) => {
    const { id, matchId } = params;

    const body = await request.json();
    const { action, rejectedReason, notes } = body as {
      action: "confirm" | "reject";
      rejectedReason?: string;
      notes?: string;
    };

    if (!action || !["confirm", "reject"].includes(action)) {
      throw ApiErrors.badRequest("action must be 'confirm' or 'reject'");
    }

    const reconcileSession = await prisma.reconcileSession.findFirst({
      where: { id, companyId: company.id },
    });
    if (!reconcileSession) {
      throw ApiErrors.notFound("ReconcileSession");
    }

    const match = await prisma.reconcileMatch.findFirst({
      where: { id: matchId, sessionId: id },
    });
    if (!match) {
      throw ApiErrors.notFound("ReconcileMatch");
    }

    const newStatus = action === "confirm" ? "confirmed" : "rejected";

    const updated = await prisma.reconcileMatch.update({
      where: { id: matchId },
      data: {
        status: newStatus,
        confirmedBy: action === "confirm" ? authSession.user.id : null,
        confirmedAt: action === "confirm" ? new Date() : null,
        rejectedReason: action === "reject" ? rejectedReason : null,
        notes: notes || match.notes,
      },
    });

    const confirmedCount = await prisma.reconcileMatch.count({
      where: { sessionId: id, status: "confirmed" },
    });
    await prisma.reconcileSession.update({
      where: { id },
      data: { matchedCount: confirmedCount },
    });

    await createAuditLog({
      userId: authSession.user.id,
      companyId: company.id,
      action: action === "confirm" ? "APPROVE" : "STATUS_CHANGE",
      entityType: "ReconcileMatch",
      entityId: matchId,
      changes: {
        action,
        matchType: match.matchType,
        systemVendor: match.systemVendor,
        acctVendor: match.acctVendor,
        rejectedReason: action === "reject" ? rejectedReason : undefined,
      },
      description:
        action === "confirm"
          ? `ยืนยันการจับคู่: ${match.systemVendor} ↔ ${match.acctVendor}`
          : `ปฏิเสธการจับคู่: ${match.systemVendor} ↔ ${match.acctVendor} (${rejectedReason || "-"})`,
    });

    return apiResponse.success(updated);
  },
  { permission: "reports:read" }
);
