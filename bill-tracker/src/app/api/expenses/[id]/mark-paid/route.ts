/**
 * POST /api/expenses/[id]/mark-paid
 * Mark an approved expense as paid (transitions to ACTIVE)
 */

import { withCompanyAccess } from "@/lib/api/with-company-access";
import { handleMarkTransaction, MARK_EXPENSE_CONFIG } from "@/lib/api/mark-transaction";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (_req, { company, session }) => {
      const { id } = await routeParams.params;
      return handleMarkTransaction(MARK_EXPENSE_CONFIG, id, company.id, session.user.id);
    },
    { permission: "expenses:mark-paid" }
  )(request);
};
