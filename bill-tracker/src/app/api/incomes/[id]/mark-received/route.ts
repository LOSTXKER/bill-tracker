/**
 * POST /api/incomes/[id]/mark-received
 * Mark an approved income as received (transitions to ACTIVE)
 */

import { withCompanyAccess } from "@/lib/api/with-company-access";
import { handleMarkTransaction, MARK_INCOME_CONFIG } from "@/lib/api/mark-transaction";

export const POST = (
  request: Request,
  routeParams: { params: Promise<{ id: string }> }
) => {
  return withCompanyAccess(
    async (_req, { company, session }) => {
      const { id } = await routeParams.params;
      return handleMarkTransaction(MARK_INCOME_CONFIG, id, company.id, session.user.id);
    },
    { permission: "incomes:mark-received" }
  )(request);
};
