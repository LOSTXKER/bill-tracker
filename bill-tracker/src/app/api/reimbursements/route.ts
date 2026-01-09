import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { analyzeAndUpdateExpense } from "@/lib/ai/fraud-detection";

/**
 * @deprecated This endpoint uses the legacy Expense-based reimbursement system.
 * Please use /api/reimbursement-requests instead.
 * 
 * GET /api/reimbursements?company=ABC
 * ดึงรายการเบิกจ่ายทั้งหมด
 * 
 * Migration: Use /api/reimbursement-requests which creates Expense only when PAID
 */
export const GET = withCompanyAccess(
  async (request, { company, session }) => {
    // Log deprecation warning
    console.warn(
      "[DEPRECATED] /api/reimbursements is deprecated. Use /api/reimbursement-requests instead."
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // PENDING, FLAGGED, APPROVED, REJECTED, PAID
    const requesterId = searchParams.get("requesterId");
    const myRequests = searchParams.get("myRequests") === "true";

    // Build where clause
    const where: any = {
      companyId: company.id,
      isReimbursement: true,
      deletedAt: null,
    };

    // Filter by status
    if (status) {
      where.reimbursementStatus = status;
    }

    // Filter by requester
    if (myRequests) {
      where.requesterId = session.user.id;
    } else if (requesterId) {
      where.requesterId = requesterId;
    }

    // Get reimbursements
    const reimbursements = await prisma.expense.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reimbursementApprover: {
          select: { id: true, name: true },
        },
        reimbursementPayer: {
          select: { id: true, name: true },
        },
        categoryRef: true,
        contact: true,
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiResponse.success({ 
      reimbursements,
      _deprecated: {
        warning: "This endpoint is deprecated. Please use /api/reimbursement-requests",
        migrationGuide: "See REIMBURSEMENT_CONSOLIDATION_PLAN.md"
      }
    });
  },
  { permission: "reimbursements:read" }
);

/**
 * @deprecated This endpoint uses the legacy Expense-based reimbursement system.
 * Please use POST /api/reimbursement-requests instead.
 * 
 * POST /api/reimbursements
 * สร้างคำขอเบิกจ่ายใหม่
 * 
 * Migration: Use /api/reimbursement-requests which creates Expense only when PAID
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    // Log deprecation warning
    console.warn(
      "[DEPRECATED] POST /api/reimbursements is deprecated. Use POST /api/reimbursement-requests instead."
    );

    const body = await request.json();
    const {
      amount,
      vatRate = 0,
      vatAmount,
      description,
      categoryId,
      billDate,
      paymentMethod = "CASH",
      receiptUrls = [],
      contactId,
      invoiceNumber,
    } = body;

    if (!amount || amount <= 0) {
      return apiResponse.badRequest("Valid amount is required");
    }

    // Calculate net amount
    const calculatedVatAmount = vatRate > 0 ? (amount * vatRate) / 100 : 0;
    const netPaid = amount + (vatAmount || calculatedVatAmount);

    // Create reimbursement (as Expense with isReimbursement=true)
    const reimbursement = await prisma.expense.create({
      data: {
        companyId: company.id,
        amount,
        vatRate,
        vatAmount: vatAmount || calculatedVatAmount,
        netPaid,
        description,
        categoryId: categoryId || null,
        contactId: contactId || null,
        invoiceNumber: invoiceNumber || null,
        billDate: billDate ? new Date(billDate) : new Date(),
        paymentMethod,
        status: "PENDING_PHYSICAL", // Will be used after PAID
        
        // Reimbursement specific fields
        isReimbursement: true,
        requesterId: session.user.id,
        reimbursementStatus: "PENDING",
        
        // Store receipts in slipUrls for now
        slipUrls: receiptUrls,
        taxInvoiceUrls: [],
        whtCertUrls: [],
        
        // Creator
        createdBy: session.user.id,
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
      entityType: "Expense",
      entityId: reimbursement.id,
      description: `สร้างคำขอเบิกจ่าย: ${description || "ไม่ระบุ"} จำนวน ${netPaid} บาท`,
    });

    // Run AI fraud detection in background
    analyzeAndUpdateExpense(reimbursement.id).catch((err) => {
      console.error("Fraud detection error:", err);
    });

    return apiResponse.created(
      { 
        reimbursement,
        _deprecated: {
          warning: "This endpoint is deprecated. Please use POST /api/reimbursement-requests",
          migrationGuide: "See REIMBURSEMENT_CONSOLIDATION_PLAN.md"
        }
      },
      "Reimbursement request created (DEPRECATED: Use /api/reimbursement-requests)"
    );
  },
  {
    permission: "reimbursements:create",
    rateLimit: { maxRequests: 20, windowMs: 60000 },
  }
);
