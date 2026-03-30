import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import {
  getWorkflowPendingItems,
  executeWorkflowAction,
  WorkflowError,
} from "@/lib/workflow/document-workflow-service";
import { checkPermissionFromAccess } from "@/lib/permissions/checker";

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";

    const results = await getWorkflowPendingItems(company.id, type);
    return apiResponse.success(results);
  }
);

export const POST = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const { transactionType, transactionId, action, notes, metadata, targetStatus } = body;

    if (!transactionType || !transactionId || !action) {
      return apiResponse.badRequest("transactionType, transactionId, and action are required");
    }

    if (transactionType !== "expense" && transactionType !== "income") {
      return apiResponse.badRequest("transactionType must be 'expense' or 'income'");
    }

    const requiredPermission = transactionType === "expense"
      ? "expenses:change-status"
      : "incomes:change-status";

    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: company.id,
        },
      },
    });

    if (!access || !checkPermissionFromAccess(access, requiredPermission)) {
      return apiResponse.forbidden("คุณไม่มีสิทธิ์เปลี่ยนสถานะเอกสาร");
    }

    try {
      const result = await executeWorkflowAction({
        companyId: company.id,
        userId: session.user.id,
        transactionType,
        transactionId,
        action,
        notes,
        metadata,
        targetStatus,
      });
      return apiResponse.success(result);
    } catch (error) {
      if (error instanceof WorkflowError) {
        switch (error.code) {
          case "NOT_FOUND":
            return apiResponse.notFound(error.message);
          case "FORBIDDEN":
            return apiResponse.forbidden(error.message);
          case "BAD_REQUEST":
            return apiResponse.badRequest(error.message);
        }
      }
      throw error;
    }
  }
);
