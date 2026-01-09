import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

/**
 * GET /api/reimbursement-requests?company=ABC
 * ดึงรายการคำขอเบิกจ่าย
 */
export const GET = withCompanyAccess(
  async (request, { company, session }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const myRequests = searchParams.get("myRequests") === "true";

    // Build where clause
    const where: any = {
      companyId: company.id,
    };

    if (status) {
      where.status = status;
    }

    if (myRequests) {
      where.requesterId = session.user.id;
    }

    const requests = await prisma.reimbursementRequest.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        approver: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true },
        },
        categoryRef: true,
        contact: true,
        linkedExpense: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiResponse.success({ requests });
  },
  { permission: "reimbursements:read" }
);

/**
 * POST /api/reimbursement-requests
 * สร้างคำขอเบิกจ่ายใหม่
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();
    const {
      amount,
      vatRate = 0,
      vatAmount,
      description,
      categoryId,
      contactId,
      invoiceNumber,
      billDate,
      paymentMethod = "CASH",
      receiptUrls = [],
    } = body;

    if (!amount || amount <= 0) {
      return apiResponse.badRequest("Valid amount is required");
    }

    // Calculate net amount
    const calculatedVatAmount = vatRate > 0 ? (amount * vatRate) / 100 : 0;
    const netAmount = amount + (vatAmount || calculatedVatAmount);

    // Create reimbursement request (NOT an expense)
    const reimbursementRequest = await prisma.reimbursementRequest.create({
      data: {
        companyId: company.id,
        requesterId: session.user.id,
        amount,
        vatRate,
        vatAmount: vatAmount || calculatedVatAmount,
        netAmount,
        description,
        categoryId: categoryId || null,
        contactId: contactId || null,
        invoiceNumber: invoiceNumber || null,
        billDate: billDate ? new Date(billDate) : new Date(),
        paymentMethod,
        receiptUrls,
        status: "PENDING",
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        categoryRef: true,
        contact: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      companyId: company.id,
      action: "CREATE",
      entityType: "ReimbursementRequest",
      entityId: reimbursementRequest.id,
      description: `สร้างคำขอเบิกจ่าย: ${description || "ไม่ระบุ"} จำนวน ${netAmount} บาท`,
    });

    // TODO: Run AI fraud detection in background
    // analyzeReimbursementRequest(reimbursementRequest.id).catch(console.error);

    return apiResponse.created(
      { request: reimbursementRequest },
      "Reimbursement request created"
    );
  },
  {
    permission: "reimbursements:create",
    rateLimit: { maxRequests: 20, windowMs: 60000 },
  }
);
