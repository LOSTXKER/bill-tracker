/**
 * Sidebar Badges API
 * GET /api/[company]/sidebar-badges - Get badge counts for sidebar menu items
 * 
 * Returns counts for:
 * - pendingApprovals: รายการที่รออนุมัติ (สำหรับคนที่มีสิทธิ์ approve)
 * - pendingReimbursements: คำขอเบิกจ่ายที่รอดำเนินการ
 * - pendingSettlements: รายการที่รอโอนคืน
 * - unreadNotifications: การแจ้งเตือนที่ยังไม่อ่าน
 */

import { apiResponse } from "@/lib/api/response";
import { withCompanyAccess, type CompanyAccessContext } from "@/lib/api/with-company-access";
import { prisma } from "@/lib/db";
import { getUnreadCount } from "@/lib/notifications/in-app";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // /api/[company]/sidebar-badges -> pathParts[2] is company
  return pathParts[2];
};

// Check if user has permission
function checkPermission(
  permission: string,
  permissions: string[],
  isOwner: boolean
): boolean {
  if (isOwner) return true;
  if (permissions.includes(permission)) return true;
  const [module] = permission.split(":");
  return permissions.includes(`${module}:*`);
}

// GET: Get sidebar badge counts for current user
async function handleGet(
  request: Request,
  context: CompanyAccessContext
) {
  const { session, company } = context;
  const userId = session.user.id;

  // Fetch user's company access to get permissions
  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId: company.id,
      },
    },
    select: {
      isOwner: true,
      permissions: true,
    },
  });

  const isOwner = access?.isOwner ?? false;
  const permissions = (access?.permissions as string[]) ?? [];

  // Initialize all counts
  const badges: Record<string, number> = {
    pendingApprovals: 0,
    pendingReimbursements: 0,
    pendingSettlements: 0,
    pendingTaxInvoices: 0,
    pendingWhtDeliveries: 0,
    unreadNotifications: 0,
  };

  // Run all queries in parallel
  const queries: Promise<void>[] = [];

  // 1. Pending Approvals - ถ้ามีสิทธิ์ expenses:approve หรือ incomes:approve
  const canApproveExpenses = checkPermission("expenses:approve", permissions, isOwner);
  const canApproveIncomes = checkPermission("incomes:approve", permissions, isOwner);

  if (canApproveExpenses || canApproveIncomes) {
    queries.push(
      (async () => {
        const [expenseCount, incomeCount] = await Promise.all([
          canApproveExpenses
            ? prisma.expense.count({
                where: {
                  companyId: company.id,
                  deletedAt: null,
                  approvalStatus: "PENDING",
                },
              })
            : Promise.resolve(0),
          canApproveIncomes
            ? prisma.income.count({
                where: {
                  companyId: company.id,
                  deletedAt: null,
                  approvalStatus: "PENDING",
                },
              })
            : Promise.resolve(0),
        ]);
        badges.pendingApprovals = expenseCount + incomeCount;
      })()
    );
  }

  // 2. Pending Reimbursements - ถ้ามีสิทธิ์ reimbursements:read
  const canReadReimbursements = checkPermission("reimbursements:read", permissions, isOwner);
  const canApproveReimbursements = checkPermission("reimbursements:approve", permissions, isOwner);

  if (canReadReimbursements || canApproveReimbursements) {
    queries.push(
      (async () => {
        // Count pending + flagged reimbursements (for approvers)
        // Or count user's own pending reimbursements (for requesters)
        if (canApproveReimbursements) {
          // Approvers see all pending/flagged
          badges.pendingReimbursements = await prisma.reimbursementRequest.count({
            where: {
              companyId: company.id,
              status: { in: ["PENDING", "FLAGGED"] },
            },
          });
        } else {
          // Regular users see their own pending requests
          badges.pendingReimbursements = await prisma.reimbursementRequest.count({
            where: {
              companyId: company.id,
              requesterId: userId,
              status: { in: ["PENDING", "FLAGGED"] },
            },
          });
        }
      })()
    );
  }

  // 3. Pending Settlements - รายการที่รอโอนคืน (สำหรับเจ้าของหรือคนที่มีสิทธิ์)
  const canReadSettlements = checkPermission("settlements:read", permissions, isOwner);

  if (canReadSettlements) {
    queries.push(
      (async () => {
        badges.pendingSettlements = await prisma.expensePayment.count({
          where: {
            Expense: {
              companyId: company.id,
              deletedAt: null,
            },
            settlementStatus: "PENDING",
          },
        });
      })()
    );
  } else {
    // Regular users see their own pending settlements
    queries.push(
      (async () => {
        badges.pendingSettlements = await prisma.expensePayment.count({
          where: {
            paidByUserId: userId,
            Expense: {
              companyId: company.id,
              deletedAt: null,
            },
            settlementStatus: "PENDING",
          },
        });
      })()
    );
  }

  // 4. Pending WHT Deliveries - WHT certs that need to be sent to vendors
  const canReadExpenses = checkPermission("expenses:read", permissions, isOwner);
  
  if (canReadExpenses) {
    queries.push(
      (async () => {
        badges.pendingWhtDeliveries = await prisma.expense.count({
          where: {
            companyId: company.id,
            deletedAt: null,
            isWht: true,
            hasWhtCert: true,
            workflowStatus: "WHT_ISSUED", // Issued but not sent
          },
        });
      })()
    );

    // 4b. Pending Tax Invoices - expenses waiting for tax invoice from vendor
    queries.push(
      (async () => {
        badges.pendingTaxInvoices = await prisma.expense.count({
          where: {
            companyId: company.id,
            deletedAt: null,
            documentType: "TAX_INVOICE",
            workflowStatus: "WAITING_TAX_INVOICE",
          },
        });
      })()
    );
  }

  // 5. Unread Notifications - always fetch for current user
  queries.push(
    (async () => {
      badges.unreadNotifications = await getUnreadCount(company.id, userId);
    })()
  );

  // Wait for all queries
  await Promise.all(queries);

  return apiResponse.success(badges);
}

export const GET = withCompanyAccess(handleGet, {
  getCompanyCode: getCompanyFromPath,
});
