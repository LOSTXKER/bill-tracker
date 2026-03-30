/**
 * POST /api/incomes/[id]/submit
 * Submit income for approval (or mark as received if user has create-direct permission)
 */

import { withAuth } from "@/lib/api/with-auth";
import { handleSubmitTransaction, SUBMIT_INCOME_CONFIG } from "@/lib/api/submit-transaction";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withAuth(
    async (_req, { session }) => {
      const { id } = await routeParams.params;
      return handleSubmitTransaction(
        SUBMIT_INCOME_CONFIG,
        id,
        session.user.id,
        session.user.name || "ไม่ระบุ",
      );
    }
  )(request);
};
