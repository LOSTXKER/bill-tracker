import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { hasPermission } from "@/lib/permissions/checker";
import { logUpdate, logStatusChange } from "@/lib/audit/logger";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request, { session }, routeContext?: RouteParams) => {
    if (!routeContext) {
        throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    const income = await prisma.income.findUnique({
        where: { id },
        include: {
            contact: true,
            company: true,
            creator: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    if (!income) {
        throw ApiErrors.notFound("Income");
    }

    // Check access
    const hasAccess = await hasPermission(
        session.user.id,
        income.companyId,
        "incomes:read"
    );

    if (!hasAccess) {
        throw ApiErrors.forbidden();
    }

    return apiResponse.success({ income });
});

export const PUT = withAuth(async (request, { session }, routeContext?: RouteParams) => {
    if (!routeContext) {
        throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    // Find existing income
    const existingIncome = await prisma.income.findUnique({
        where: { id },
        include: { contact: true },
    });

    if (!existingIncome) {
        throw ApiErrors.notFound("Income");
    }

    // Check access
    const hasAccess = await hasPermission(
        session.user.id,
        existingIncome.companyId,
        "incomes:update"
    );

    if (!hasAccess) {
        throw ApiErrors.forbidden();
    }

    const body = await request.json();
    const { vatAmount, whtAmount, netReceived, ...data } = body;

    // Update income
    const income = await prisma.income.update({
        where: { id },
        data: {
            contactId: data.contactId || null,
            amount: data.amount,
            vatRate: data.vatRate,
            vatAmount: vatAmount,
            isWhtDeducted: data.isWhtDeducted,
            whtRate: data.whtRate,
            whtAmount: whtAmount,
            whtType: data.whtType,
            netReceived: netReceived,
            source: data.source,
            invoiceNumber: data.invoiceNumber,
            referenceNo: data.referenceNo,
            paymentMethod: data.paymentMethod,
            receiveDate: data.receiveDate ? new Date(data.receiveDate) : undefined,
            status: data.status,
            notes: data.notes,
            customerSlipUrl: data.customerSlipUrl,
            myBillCopyUrl: data.myBillCopyUrl,
            whtCertUrl: data.whtCertUrl,
        },
        include: {
            contact: true,
            company: true,
        },
    });

    // Create audit log
    if (data.status !== existingIncome.status) {
        await logStatusChange(
            "Income",
            income.id,
            existingIncome.status,
            data.status,
            session.user.id,
            income.companyId,
            income.contact?.name || income.source || undefined
        );
    } else {
        await logUpdate(
            "Income",
            income.id,
            existingIncome,
            income,
            session.user.id,
            income.companyId
        );
    }

    return apiResponse.success({ income });
});
