import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/reimbursement-requests?company=ABC
 * ดึงรายการคำขอเบิกจ่าย
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {
      companyId: company.id,
    };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.reimbursementRequest.findMany({
      where,
      include: {
        approver: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true },
        },
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
 * สร้างคำขอเบิกจ่ายใหม่ (Anonymous - ไม่ต้อง auth)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyId,
      requesterName,
      requesterPhone,
      requesterEmail,
      bankName,
      bankAccountNo,
      bankAccountName,
      amount,
      vatRate = 0,
      vatAmount,
      description,
      contactId,
      invoiceNumber,
      billDate,
      paymentMethod = "CASH",
      receiptUrls = [],
    } = body;

    // Validation
    if (!companyId) {
      return apiResponse.badRequest("Company ID is required");
    }

    if (!requesterName || !requesterName.trim()) {
      return apiResponse.badRequest("Requester name is required");
    }

    if (!bankName || !bankAccountNo || !bankAccountName) {
      return apiResponse.badRequest("Bank information is required");
    }

    if (!amount || amount <= 0) {
      return apiResponse.badRequest("Valid amount is required");
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return apiResponse.notFound("Company not found");
    }

    // Calculate net amount
    const calculatedVatAmount = vatRate > 0 ? (amount * vatRate) / 100 : 0;
    const netAmount = amount + (vatAmount || calculatedVatAmount);

    // Create reimbursement request (Anonymous)
    const reimbursementRequest = await prisma.reimbursementRequest.create({
      data: {
        company: { connect: { id: company.id } },
        requesterName: requesterName.trim(),
        requesterPhone: requesterPhone?.trim() || null,
        requesterEmail: requesterEmail?.trim() || null,
        bankName: bankName.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankAccountName: bankAccountName.trim(),
        amount,
        vatRate,
        vatAmount: vatAmount || calculatedVatAmount,
        netAmount,
        description: description?.trim() || null,
        contact: contactId ? { connect: { id: contactId } } : undefined,
        invoiceNumber: invoiceNumber || null,
        billDate: billDate ? new Date(billDate) : new Date(),
        paymentMethod,
        receiptUrls,
        status: "PENDING",
      },
      select: {
        id: true,
        trackingCode: true,
        requesterName: true,
        netAmount: true,
        createdAt: true,
      },
    });

    // Skip audit log for anonymous submission (no user to link)
    // Audit trail is maintained via trackingCode and createdAt timestamp

    // TODO: Run AI fraud detection in background
    // analyzeReimbursementRequest(reimbursementRequest.id).catch(console.error);

    return apiResponse.created(
      {
        trackingCode: reimbursementRequest.trackingCode,
        trackingUrl: `/track/${reimbursementRequest.trackingCode}`,
      },
      "Reimbursement request created successfully"
    );
  } catch (error) {
    console.error("Error creating reimbursement request:", error);
    return apiResponse.error("Failed to create reimbursement request");
  }
}
