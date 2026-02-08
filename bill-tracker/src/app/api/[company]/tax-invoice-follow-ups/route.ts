/**
 * Tax Invoice Follow-ups API
 * จัดการรายการรอใบกำกับภาษี - ให้พนักงานบัญชีรู้ว่าต้องตามร้านไหน ช่องทางไหน
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { DocumentEventType } from "@prisma/client";

// =============================================================================
// GET: ดึงรายการ expense ที่รอใบกำกับภาษี (จัดกลุ่มตาม Vendor)
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get("groupBy") || "contact"; // contact | none

    // Get all expenses waiting for tax invoice
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        companyId: company.id,
        deletedAt: null,
        documentType: "TAX_INVOICE",
        workflowStatus: "WAITING_TAX_INVOICE",
      },
      select: {
        id: true,
        billDate: true,
        description: true,
        amount: true,
        vatAmount: true,
        netPaid: true,
        contactId: true,
        taxInvoiceRequestedAt: true,
        // Expense-level request method fields
        taxInvoiceRequestMethod: true,
        taxInvoiceRequestEmail: true,
        taxInvoiceRequestNotes: true,
        Contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxInvoiceRequestMethod: true,
            taxInvoiceRequestEmail: true,
            taxInvoiceRequestNotes: true,
          },
        },
      },
      orderBy: [
        { Contact: { name: "asc" } },
        { billDate: "asc" },
      ],
    });

    // Transform to include contact data
    const expenses = pendingExpenses.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    if (groupBy === "contact") {
      // Group by contact
      const now = new Date();
      const grouped = expenses.reduce((acc, expense) => {
        const contactId = expense.contactId || "no-contact";
        const contactName = expense.contact?.name || "ไม่ระบุผู้ติดต่อ";

        // Use expense-level request method if set, otherwise fall back to contact's preference
        const requestMethod = expense.taxInvoiceRequestMethod || expense.contact?.taxInvoiceRequestMethod || null;
        const requestEmail = expense.taxInvoiceRequestMethod === "email"
          ? (expense.taxInvoiceRequestEmail || expense.contact?.taxInvoiceRequestEmail || expense.contact?.email)
          : (expense.contact?.taxInvoiceRequestEmail || expense.contact?.email);
        const requestNotes = expense.taxInvoiceRequestNotes || expense.contact?.taxInvoiceRequestNotes || null;

        if (!acc[contactId]) {
          acc[contactId] = {
            contactId,
            contactName,
            contact: expense.contact,
            requestMethod,
            requestEmail: requestEmail || null,
            requestNotes,
            contactPhone: expense.contact?.phone || null,
            expenses: [],
            totalAmount: 0,
            count: 0,
            oldestDays: 0,
          };
        }

        // Use UTC date-only to avoid timezone issues (e.g. billDate today showing -1 day)
        const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const billDateObj = new Date(expense.billDate);
        const billUtc = Date.UTC(billDateObj.getFullYear(), billDateObj.getMonth(), billDateObj.getDate());
        const daysPending = Math.max(0, Math.floor((nowUtc - billUtc) / (1000 * 60 * 60 * 24)));

        acc[contactId].expenses.push({
          id: expense.id,
          billDate: expense.billDate,
          description: expense.description,
          amount: expense.amount,
          vatAmount: expense.vatAmount,
          netPaid: expense.netPaid,
          daysPending,
          taxInvoiceRequestedAt: expense.taxInvoiceRequestedAt,
          // Include expense-level request method for per-expense display
          taxInvoiceRequestMethod: expense.taxInvoiceRequestMethod,
          taxInvoiceRequestEmail: expense.taxInvoiceRequestEmail,
          taxInvoiceRequestNotes: expense.taxInvoiceRequestNotes,
        });
        acc[contactId].totalAmount += Number(expense.amount) || 0;
        acc[contactId].count += 1;
        if (daysPending > acc[contactId].oldestDays) {
          acc[contactId].oldestDays = daysPending;
        }

        return acc;
      }, {} as Record<string, any>);

      const groupedArray = Object.values(grouped).sort((a, b) =>
        b.oldestDays - a.oldestDays // Sort by oldest first (most urgent)
      );

      // Calculate global oldest
      const globalOldestDays = groupedArray.length > 0
        ? Math.max(...groupedArray.map((g) => g.oldestDays))
        : 0;

      return apiResponse.success({
        groups: groupedArray,
        totalPending: expenses.length,
        totalContacts: groupedArray.length,
        totalAmount: expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        oldestDays: globalOldestDays,
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
// POST: Mark expenses as requested or received (single or bulk)
// =============================================================================

export const POST = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const {
      expenseIds, // Array of expense IDs
      action, // 'mark_requested' | 'mark_received'
      requestMethod, // delivery method used for requesting
      notes,
    } = body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return apiResponse.badRequest("expenseIds is required and must be a non-empty array");
    }

    if (!action || !["mark_requested", "mark_received", "cancel_requested"].includes(action)) {
      return apiResponse.badRequest("action must be 'mark_requested', 'mark_received', or 'cancel_requested'");
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Verify all expenses belong to this company and are in correct status
      const expenses = await tx.expense.findMany({
        where: {
          id: { in: expenseIds },
          companyId: company.id,
          deletedAt: null,
          workflowStatus: "WAITING_TAX_INVOICE",
        },
      });

      if (expenses.length !== expenseIds.length) {
        throw new Error("บางรายการไม่พบหรือไม่อยู่ในสถานะ 'รอใบกำกับ'");
      }

      if (action === "mark_requested") {
        // Just record that we've requested the tax invoice
        await tx.expense.updateMany({
          where: { id: { in: expenseIds } },
          data: {
            taxInvoiceRequestedAt: now,
            ...(requestMethod && { taxInvoiceRequestMethod: requestMethod }),
          },
        });

        // Create document events
        const events = expenses.map((expense) => ({
          id: crypto.randomUUID(),
          expenseId: expense.id,
          eventType: "TAX_INVOICE_REQUESTED" as DocumentEventType,
          eventDate: now,
          fromStatus: expense.workflowStatus,
          toStatus: expense.workflowStatus, // Status doesn't change
          notes: notes || `ขอใบกำกับภาษี${requestMethod ? ` ทาง${getRequestMethodLabel(requestMethod)}` : ""}`,
          metadata: { action: "mark_requested", requestMethod },
          createdBy: session.user.id,
        }));

        await tx.documentEvent.createMany({ data: events });

        return {
          action: "mark_requested",
          updatedCount: expenses.length,
          expenses: expenses.map((e) => e.id),
        };
      } else if (action === "cancel_requested") {
        // Clear taxInvoiceRequestedAt to undo the request
        await tx.expense.updateMany({
          where: { id: { in: expenseIds } },
          data: {
            taxInvoiceRequestedAt: null,
          },
        });

        // Create document events for audit trail
        const events = expenses.map((expense) => ({
          id: crypto.randomUUID(),
          expenseId: expense.id,
          eventType: "TAX_INVOICE_REQUESTED" as DocumentEventType,
          eventDate: now,
          fromStatus: expense.workflowStatus,
          toStatus: expense.workflowStatus, // Status doesn't change
          notes: notes || "ยกเลิกการขอใบกำกับภาษี",
          metadata: { action: "cancel_requested" },
          createdBy: session.user.id,
        }));

        await tx.documentEvent.createMany({ data: events });

        return {
          action: "cancel_requested",
          updatedCount: expenses.length,
          expenses: expenses.map((e) => e.id),
        };
      } else {
        // mark_received: Change status to TAX_INVOICE_RECEIVED
        const updatePromises = expenses.map(async (expense) => {
          // Determine next status based on WHT requirement
          const newStatus = expense.isWht ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";

          await tx.expense.update({
            where: { id: expense.id },
            data: {
              workflowStatus: newStatus,
              hasTaxInvoice: true,
              taxInvoiceAt: now,
            },
          });

          await tx.documentEvent.create({
            data: {
              id: crypto.randomUUID(),
              expenseId: expense.id,
              eventType: "TAX_INVOICE_RECEIVED" as DocumentEventType,
              eventDate: now,
              fromStatus: expense.workflowStatus,
              toStatus: newStatus,
              notes: notes || "ได้รับใบกำกับภาษีแล้ว",
              metadata: { action: "mark_received" },
              createdBy: session.user.id,
            },
          });
        });

        await Promise.all(updatePromises);

        return {
          action: "mark_received",
          updatedCount: expenses.length,
          expenses: expenses.map((e) => e.id),
        };
      }
    });

    const message = result.action === "mark_requested"
      ? `บันทึกการขอใบกำกับ ${result.updatedCount} รายการสำเร็จ`
      : result.action === "cancel_requested"
        ? `ยกเลิกการขอใบกำกับ ${result.updatedCount} รายการสำเร็จ`
        : `รับใบกำกับ ${result.updatedCount} รายการสำเร็จ`;

    return apiResponse.success({
      message,
      ...result,
    });
  },
  { permission: "expenses:change-status" }
);

// Helper function
function getRequestMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    email: "อีเมล",
    physical: "ไปรับเอง/ส่งคนไป",
    line: "LINE",
    pickup: "ไปรับที่ร้าน",
    google_drive: "Google Drive",
  };
  return labels[method] || method;
}
