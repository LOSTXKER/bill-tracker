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

    const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
            contact: true,
            company: true,
            creator: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    if (!expense) {
        throw ApiErrors.notFound("Expense");
    }

    // Check access
    const hasAccess = await hasPermission(
        session.user.id,
        expense.companyId,
        "expenses:read"
    );

    if (!hasAccess) {
        throw ApiErrors.forbidden();
    }

    return apiResponse.success({ expense });
});

export const PUT = withAuth(async (request, { session }, routeContext?: RouteParams) => {
    if (!routeContext) {
        throw ApiErrors.badRequest("Missing route context");
    }
    const { id } = await routeContext.params;

    // Find existing expense
    const existingExpense = await prisma.expense.findUnique({
        where: { id },
        include: { contact: true },
    });

    if (!existingExpense) {
        throw ApiErrors.notFound("Expense");
    }

    // Check access
    const hasAccess = await hasPermission(
        session.user.id,
        existingExpense.companyId,
        "expenses:update"
    );

    if (!hasAccess) {
        throw ApiErrors.forbidden();
    }

    const body = await request.json();
    const { vatAmount, whtAmount, netPaid, ...data } = body;

    // Update expense
    const expense = await prisma.expense.update({
        where: { id },
        data: {
            contactId: data.contactId || null,
            amount: data.amount,
            vatRate: data.vatRate,
            vatAmount: vatAmount,
            isWht: data.isWht,
            whtRate: data.whtRate,
            whtAmount: whtAmount,
            whtType: data.whtType,
            netPaid: netPaid,
            description: data.description,
            category: data.category,
            invoiceNumber: data.invoiceNumber,
            referenceNo: data.referenceNo,
            paymentMethod: data.paymentMethod,
            billDate: data.billDate ? new Date(data.billDate) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            status: data.status,
            notes: data.notes,
            slipUrl: data.slipUrl,
            taxInvoiceUrl: data.taxInvoiceUrl,
            whtCertUrl: data.whtCertUrl,
        },
        include: {
            contact: true,
            company: true,
        },
    });

    // Create audit log
    if (data.status !== existingExpense.status) {
        await logStatusChange(
            "Expense",
            expense.id,
            existingExpense.status,
            data.status,
            session.user.id,
            expense.companyId,
            expense.contact?.name || expense.description || undefined
        );
    } else {
        await logUpdate(
            "Expense",
            expense.id,
            existingExpense,
            expense,
            session.user.id,
            expense.companyId
        );
    }

    return apiResponse.success({ expense });
});
