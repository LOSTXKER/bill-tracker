/**
 * POST /api/expenses/[id]/submit
 * Submit expense for approval (or mark as paid if user has create-direct permission)
 */

import { withAuth } from "@/lib/api/with-auth";
import { handleSubmitTransaction, SUBMIT_EXPENSE_CONFIG } from "@/lib/api/submit-transaction";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (_req, { session }) => {
      const { id } = await routeParams.params;
      return handleSubmitTransaction(
        SUBMIT_EXPENSE_CONFIG,
        id,
        session.user.id,
        session.user.name || "ไม่ระบุ",
      );
    }
  )(request);
};
