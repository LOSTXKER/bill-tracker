import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

export const GET = withCompanyAccessFromParams(
  async (_request, { company, params }) => {
    const { id } = params;

    const session = await prisma.reconcileSession.findFirst({
      where: { id, companyId: company.id },
      include: {
        AccountingRows: {
          orderBy: { rowIndex: "asc" },
        },
        Matches: {
          orderBy: { createdAt: "asc" },
          include: {
            Expense: {
              select: {
                id: true,
                description: true,
                invoiceNumber: true,
                billDate: true,
                amount: true,
                vatAmount: true,
                contactName: true,
                slipUrls: true,
                taxInvoiceUrls: true,
                whtCertUrls: true,
                otherDocUrls: true,
                internalCompanyId: true,
              },
            },
            Income: {
              select: {
                id: true,
                source: true,
                invoiceNumber: true,
                receiveDate: true,
                amount: true,
                vatAmount: true,
                contactName: true,
                customerSlipUrls: true,
                myBillCopyUrls: true,
                whtCertUrls: true,
                otherDocUrls: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw ApiErrors.notFound("ReconcileSession");
    }

    return apiResponse.success(session);
  },
  { permission: "reports:read" }
);
