/**
 * Document Workflow API
 * จัดการสถานะเอกสารและ Timeline Events
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { DocumentEventType, ExpenseWorkflowStatus, IncomeWorkflowStatus } from "@prisma/client";

// =============================================================================
// GET: ดึงข้อมูลเอกสารที่ค้าง / รอดำเนินการ
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all"; // expense, income, all
    const status = searchParams.get("status"); // pending_docs, pending_wht, pending_accounting

    const results: {
      expenses: any[];
      incomes: any[];
      summary: {
        pendingTaxInvoice: number;
        pendingWhtIssue: number;
        pendingWhtCert: number;
        pendingAccounting: number;
        total: number;
      };
    } = {
      expenses: [],
      incomes: [],
      summary: {
        pendingTaxInvoice: 0,
        pendingWhtIssue: 0,
        pendingWhtCert: 0,
        pendingAccounting: 0,
        total: 0,
      },
    };

    // Expense: รอใบกำกับภาษี
    if (type === "all" || type === "expense") {
      const pendingTaxInvoice = await prisma.expense.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          workflowStatus: { in: ["PAID", "WAITING_TAX_INVOICE"] },
          hasTaxInvoice: false,
        },
        include: { contact: true },
        orderBy: { billDate: "desc" },
        take: 50,
      });

      // Expense: รอออกใบ 50 ทวิ (เราหักเขา)
      const pendingWhtIssue = await prisma.expense.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          isWht: true,
          workflowStatus: { in: ["TAX_INVOICE_RECEIVED", "WHT_PENDING_ISSUE"] },
          hasWhtCert: false,
        },
        include: { contact: true },
        orderBy: { billDate: "desc" },
        take: 50,
      });

      // Expense: รอส่งบัญชี
      const pendingAccounting = await prisma.expense.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          workflowStatus: "READY_FOR_ACCOUNTING",
        },
        include: { contact: true },
        orderBy: { billDate: "desc" },
        take: 50,
      });

      results.expenses = [
        ...pendingTaxInvoice.map(e => ({ ...e, pendingType: "TAX_INVOICE" })),
        ...pendingWhtIssue.map(e => ({ ...e, pendingType: "WHT_ISSUE" })),
        ...pendingAccounting.map(e => ({ ...e, pendingType: "ACCOUNTING" })),
      ];

      results.summary.pendingTaxInvoice = pendingTaxInvoice.length;
      results.summary.pendingWhtIssue = pendingWhtIssue.length;
    }

    // Income: รอใบ 50 ทวิจากลูกค้า (เขาหักเรา)
    if (type === "all" || type === "income") {
      const pendingWhtCert = await prisma.income.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          isWhtDeducted: true,
          workflowStatus: "WHT_PENDING_CERT",
          hasWhtCert: false,
        },
        include: { contact: true },
        orderBy: { receiveDate: "desc" },
        take: 50,
      });

      // Income: รอส่งบัญชี
      const pendingAccounting = await prisma.income.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          workflowStatus: "READY_FOR_ACCOUNTING",
        },
        include: { contact: true },
        orderBy: { receiveDate: "desc" },
        take: 50,
      });

      results.incomes = [
        ...pendingWhtCert.map(i => ({ ...i, pendingType: "WHT_CERT" })),
        ...pendingAccounting.map(i => ({ ...i, pendingType: "ACCOUNTING" })),
      ];

      results.summary.pendingWhtCert = pendingWhtCert.length;
    }

    results.summary.pendingAccounting = results.expenses.filter(e => e.pendingType === "ACCOUNTING").length +
                                        results.incomes.filter(i => i.pendingType === "ACCOUNTING").length;
    results.summary.total = results.expenses.length + results.incomes.length;

    return apiResponse.success(results);
  }
);

// =============================================================================
// POST: อัปเดตสถานะเอกสาร
// =============================================================================

export const POST = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const {
      transactionType, // "expense" | "income"
      transactionId,
      action, // "receive_tax_invoice", "issue_wht", "send_wht", "receive_wht", "send_to_accounting", etc.
      notes,
      metadata,
    } = body;

    if (!transactionType || !transactionId || !action) {
      return apiResponse.badRequest("transactionType, transactionId, and action are required");
    }

    const now = new Date();
    let result;

    if (transactionType === "expense") {
      const expense = await prisma.expense.findUnique({
        where: { id: transactionId },
      });

      if (!expense || expense.companyId !== company.id) {
        return apiResponse.notFound("Expense not found");
      }

      const updateData: any = {};
      let newStatus: ExpenseWorkflowStatus | null = null;
      let eventType: DocumentEventType | null = null;

      switch (action) {
        case "receive_tax_invoice":
          updateData.hasTaxInvoice = true;
          updateData.taxInvoiceAt = now;
          newStatus = expense.isWht ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
          eventType = "TAX_INVOICE_RECEIVED";
          break;

        case "issue_wht":
          updateData.hasWhtCert = true;
          updateData.whtCertIssuedAt = now;
          newStatus = "WHT_ISSUED";
          eventType = "WHT_CERT_ISSUED";
          break;

        case "send_wht":
          updateData.whtCertSentAt = now;
          newStatus = "READY_FOR_ACCOUNTING";
          eventType = "WHT_CERT_SENT";
          break;

        case "send_to_accounting":
          updateData.sentToAccountAt = now;
          newStatus = "SENT_TO_ACCOUNTANT";
          eventType = "SENT_TO_ACCOUNTANT";
          // Also update legacy status
          updateData.status = "SENT_TO_ACCOUNT";
          break;

        case "complete":
          newStatus = "COMPLETED";
          eventType = "STATUS_CHANGED";
          break;

        default:
          return apiResponse.badRequest(`Unknown action: ${action}`);
      }

      if (newStatus) {
        updateData.workflowStatus = newStatus;
      }

      // Update expense and create event
      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.expense.update({
          where: { id: transactionId },
          data: updateData,
        });

        if (eventType) {
          await tx.documentEvent.create({
            data: {
              expenseId: transactionId,
              eventType,
              eventDate: now,
              fromStatus: expense.workflowStatus,
              toStatus: newStatus,
              notes,
              metadata,
              createdBy: session.user.id,
            },
          });
        }

        return updated;
      });

    } else if (transactionType === "income") {
      const income = await prisma.income.findUnique({
        where: { id: transactionId },
      });

      if (!income || income.companyId !== company.id) {
        return apiResponse.notFound("Income not found");
      }

      const updateData: any = {};
      let newStatus: IncomeWorkflowStatus | null = null;
      let eventType: DocumentEventType | null = null;

      switch (action) {
        case "issue_invoice":
          updateData.hasInvoice = true;
          updateData.invoiceIssuedAt = now;
          newStatus = "INVOICE_ISSUED";
          eventType = "INVOICE_ISSUED";
          break;

        case "send_invoice":
          updateData.invoiceSentAt = now;
          newStatus = income.isWhtDeducted ? "WHT_PENDING_CERT" : "READY_FOR_ACCOUNTING";
          eventType = "INVOICE_SENT";
          break;

        case "receive_wht":
          updateData.hasWhtCert = true;
          updateData.whtCertReceivedAt = now;
          newStatus = "READY_FOR_ACCOUNTING";
          eventType = "WHT_CERT_RECEIVED";
          break;

        case "remind_wht":
          updateData.whtCertRemindedAt = now;
          updateData.whtCertRemindCount = { increment: 1 };
          eventType = "WHT_REMINDER_SENT";
          break;

        case "send_to_accounting":
          updateData.sentToAccountAt = now;
          newStatus = "SENT_TO_ACCOUNTANT";
          eventType = "SENT_TO_ACCOUNTANT";
          // Also update legacy status
          updateData.status = "SENT_COPY";
          break;

        case "complete":
          newStatus = "COMPLETED";
          eventType = "STATUS_CHANGED";
          break;

        default:
          return apiResponse.badRequest(`Unknown action: ${action}`);
      }

      if (newStatus) {
        updateData.workflowStatus = newStatus;
      }

      // Update income and create event
      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.income.update({
          where: { id: transactionId },
          data: updateData,
        });

        if (eventType) {
          await tx.documentEvent.create({
            data: {
              incomeId: transactionId,
              eventType,
              eventDate: now,
              fromStatus: income.workflowStatus,
              toStatus: newStatus,
              notes,
              metadata,
              createdBy: session.user.id,
            },
          });
        }

        return updated;
      });

    } else {
      return apiResponse.badRequest("transactionType must be 'expense' or 'income'");
    }

    return apiResponse.success(result);
  }
);
