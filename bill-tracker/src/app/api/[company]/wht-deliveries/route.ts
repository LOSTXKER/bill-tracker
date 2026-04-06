/**
 * WHT Deliveries API
 * จัดการรายการรอส่งใบหัก ณ ที่จ่าย
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { DocumentEventType } from "@prisma/client";
import { getDeliveryMethod } from "@/lib/constants/delivery-methods";
import { reimbursementFilter } from "@/lib/queries/expense-filters";

// =============================================================================
// GET: ดึงรายการ WHT ที่รอส่ง
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get("groupBy") || "contact"; // contact | none

    // Get all expenses with WHT that need to be sent
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId: company.id,
        deletedAt: null,
        isWht: true,
        hasWhtCert: true,
        workflowStatus: "ACTIVE",
        whtCertSentAt: null,
      },
      select: {
        id: true,
        billDate: true,
        description: true,
        amount: true,
        whtAmount: true,
        whtRate: true,
        whtCertUrls: true,
        contactId: true,
        // Expense-level delivery method fields
        whtDeliveryMethod: true,
        whtDeliveryEmail: true,
        whtDeliveryNotes: true,
        Contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            preferredDeliveryMethod: true,
            deliveryEmail: true,
            deliveryNotes: true,
          },
        },
      },
      orderBy: [
        { Contact: { name: "asc" } },
        { billDate: "desc" },
      ],
    });

    // Transform to include contact data
    const expenses = pendingExpenses.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    if (groupBy === "contact") {
      // Group by contact
      const grouped = expenses.reduce((acc, expense) => {
        const contactId = expense.contactId || "no-contact";
        const contactName = expense.contact?.name || "ไม่ระบุผู้ติดต่อ";
        
        // Use expense-level delivery method if set, otherwise fall back to contact's preference
        const expenseDeliveryMethod = expense.whtDeliveryMethod || expense.contact?.preferredDeliveryMethod || null;
        const expenseDeliveryEmail = expense.whtDeliveryMethod === "EMAIL" 
          ? (expense.whtDeliveryEmail || expense.contact?.deliveryEmail || expense.contact?.email)
          : (expense.contact?.deliveryEmail || expense.contact?.email);
        const expenseDeliveryNotes = expense.whtDeliveryNotes || expense.contact?.deliveryNotes || null;
        
        if (!acc[contactId]) {
          acc[contactId] = {
            contactId,
            contactName,
            contact: expense.contact,
            // Initial delivery method from first expense (may be updated per-expense)
            deliveryMethod: expenseDeliveryMethod,
            deliveryEmail: expenseDeliveryEmail || null,
            deliveryNotes: expenseDeliveryNotes,
            expenses: [],
            totalAmount: 0,
            totalWhtAmount: 0,
            count: 0,
          };
        }
        
        acc[contactId].expenses.push({
          id: expense.id,
          billDate: expense.billDate,
          description: expense.description,
          amount: expense.amount,
          whtAmount: expense.whtAmount,
          whtRate: expense.whtRate,
          whtCertUrls: expense.whtCertUrls,
          // Include expense-level delivery method for per-expense display
          whtDeliveryMethod: expense.whtDeliveryMethod,
          whtDeliveryEmail: expense.whtDeliveryEmail,
          whtDeliveryNotes: expense.whtDeliveryNotes,
        });
        acc[contactId].totalAmount += Number(expense.amount) || 0;
        acc[contactId].totalWhtAmount += Number(expense.whtAmount) || 0;
        acc[contactId].count += 1;
        
        return acc;
      }, {} as Record<string, any>);

      const groupedArray = Object.values(grouped).sort((a, b) => 
        a.contactName.localeCompare(b.contactName, "th")
      );

      return apiResponse.success({
        groups: groupedArray,
        totalPending: expenses.length,
        totalContacts: groupedArray.length,
      });
    }

    // Return flat list
    return apiResponse.success({
      expenses,
      totalPending: expenses.length,
    });
  },
  { permission: "expenses:read" }
);

// =============================================================================
// POST: Mark WHT as sent (single or bulk)
// =============================================================================

export const POST = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const { 
      expenseIds, // Array of expense IDs to mark as sent
      deliveryMethod, // 'email' | 'physical' | 'line' | 'pickup'
      notes,
    } = body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return apiResponse.badRequest("expenseIds is required and must be a non-empty array");
    }

    if (!deliveryMethod) {
      return apiResponse.badRequest("deliveryMethod is required");
    }

    const now = new Date();
    const eventType: DocumentEventType = "WHT_CERT_SENT";

    const result = await prisma.$transaction(async (tx) => {
      const expenses = await tx.expense.findMany({
        where: {
          id: { in: expenseIds },
          companyId: company.id,
          deletedAt: null,
          isWht: true,
          workflowStatus: "ACTIVE",
          hasWhtCert: true,
          whtCertSentAt: null,
        },
      });

      if (expenses.length !== expenseIds.length) {
        throw new Error("บางรายการไม่พบหรือไม่อยู่ในสถานะที่สามารถส่งได้");
      }

      // Use updateMany + createMany to avoid N individual round-trips
      await tx.expense.updateMany({
        where: { id: { in: expenseIds } },
        data: { whtCertSentAt: now },
      });

      const methodInfo = getDeliveryMethod(deliveryMethod);
      await tx.documentEvent.createMany({
        data: expenses.map((expense) => ({
          id: crypto.randomUUID(),
          expenseId: expense.id,
          eventType,
          eventDate: now,
          fromStatus: expense.workflowStatus,
          toStatus: expense.workflowStatus,
          notes: notes || `ส่ง WHT ทาง ${methodInfo?.label || deliveryMethod}`,
          metadata: { deliveryMethod },
          createdBy: session.user.id,
        })),
      });

      return {
        updatedCount: expenses.length,
        expenses: expenses.map((e) => e.id),
      };
    });

    return apiResponse.success({
      message: `อัปเดตสถานะ ${result.updatedCount} รายการสำเร็จ`,
      ...result,
    });
  },
  { permission: "expenses:change-status" }
);

