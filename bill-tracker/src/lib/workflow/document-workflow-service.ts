import { prisma } from "@/lib/db";
import type { Expense, Income, Contact } from "@prisma/client";
import {
  DocumentEventType,
  ExpenseWorkflowStatus,
  IncomeWorkflowStatus,
  Prisma,
} from "@prisma/client";

type ExpenseWithContact = Expense & { Contact: Contact | null; contact: Contact | null };
type IncomeWithContact = Income & { Contact: Contact | null; contact: Contact | null };

export type WorkflowExpenseItem = ExpenseWithContact & { pendingType: string };
export type WorkflowIncomeItem = IncomeWithContact & { pendingType: string };

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST"
  ) {
    super(message);
  }
}

export interface WorkflowPendingResults {
  expenses: WorkflowExpenseItem[];
  incomes: WorkflowIncomeItem[];
  summary: {
    pendingTaxInvoice: number;
    pendingWhtIssue: number;
    pendingWhtCert: number;
    pendingAccounting: number;
    total: number;
  };
}

export async function getWorkflowPendingItems(
  companyId: string,
  type: string
): Promise<WorkflowPendingResults> {
  const results: WorkflowPendingResults = {
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

  if (type === "all" || type === "expense") {
    const pendingTaxInvoiceRaw = await prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        workflowStatus: { in: ["PAID", "WAITING_TAX_INVOICE"] },
        hasTaxInvoice: false,
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingTaxInvoice = pendingTaxInvoiceRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    const pendingWhtIssueRaw = await prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        isWht: true,
        workflowStatus: { in: ["TAX_INVOICE_RECEIVED", "WHT_PENDING_ISSUE"] },
        hasWhtCert: false,
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingWhtIssue = pendingWhtIssueRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    const pendingAccountingRaw = await prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        workflowStatus: "READY_FOR_ACCOUNTING",
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingAccounting = pendingAccountingRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    results.expenses = [
      ...pendingTaxInvoice.map((e) => ({ ...e, pendingType: "TAX_INVOICE" })),
      ...pendingWhtIssue.map((e) => ({ ...e, pendingType: "WHT_ISSUE" })),
      ...pendingAccounting.map((e) => ({ ...e, pendingType: "ACCOUNTING" })),
    ];

    results.summary.pendingTaxInvoice = pendingTaxInvoice.length;
    results.summary.pendingWhtIssue = pendingWhtIssue.length;
  }

  if (type === "all" || type === "income") {
    const pendingWhtCertRaw = await prisma.income.findMany({
      where: {
        companyId,
        deletedAt: null,
        isWhtDeducted: true,
        workflowStatus: "WHT_PENDING_CERT",
        hasWhtCert: false,
      },
      include: { Contact: true },
      orderBy: { receiveDate: "desc" },
      take: 50,
    });
    const pendingWhtCert = pendingWhtCertRaw.map((i) => ({
      ...i,
      contact: i.Contact,
    }));

    const pendingAccountingIncomeRaw = await prisma.income.findMany({
      where: {
        companyId,
        deletedAt: null,
        workflowStatus: "READY_FOR_ACCOUNTING",
      },
      include: { Contact: true },
      orderBy: { receiveDate: "desc" },
      take: 50,
    });
    const pendingAccountingIncome = pendingAccountingIncomeRaw.map((i) => ({
      ...i,
      contact: i.Contact,
    }));

    results.incomes = [
      ...pendingWhtCert.map((i) => ({ ...i, pendingType: "WHT_CERT" })),
      ...pendingAccountingIncome.map((i) => ({
        ...i,
        pendingType: "ACCOUNTING",
      })),
    ];

    results.summary.pendingWhtCert = pendingWhtCert.length;
  }

  results.summary.pendingAccounting =
    results.expenses.filter((e) => e.pendingType === "ACCOUNTING").length +
    results.incomes.filter((i) => i.pendingType === "ACCOUNTING").length;
  results.summary.total = results.expenses.length + results.incomes.length;

  return results;
}

export interface WorkflowActionParams {
  companyId: string;
  userId: string;
  transactionType: "expense" | "income";
  transactionId: string;
  action: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  targetStatus?: string;
}

async function checkRevertPermission(userId: string, companyId: string) {
  const access = await prisma.companyAccess.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!access?.isOwner) {
    throw new WorkflowError(
      "เฉพาะ Owner เท่านั้นที่สามารถย้อนสถานะได้",
      "FORBIDDEN"
    );
  }
}

function resolveExpenseAction(
  action: string,
  expense: { isWht: boolean; workflowStatus: string },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: ExpenseWorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
  let newStatus: ExpenseWorkflowStatus | null = null;
  let eventType: DocumentEventType | null = null;

  switch (action) {
    case "receive_tax_invoice":
      updateData.hasTaxInvoice = true;
      updateData.taxInvoiceAt = now;
      newStatus = expense.isWht ? "WHT_PENDING_ISSUE" : "READY_FOR_ACCOUNTING";
      eventType = "TAX_INVOICE_RECEIVED";
      break;
    case "skip_to_wht":
      newStatus = "WHT_PENDING_ISSUE";
      eventType = "STATUS_CHANGED";
      break;
    case "skip_to_accounting":
      newStatus = "READY_FOR_ACCOUNTING";
      eventType = "STATUS_CHANGED";
      break;
    case "issue_wht":
      updateData.hasWhtCert = true;
      updateData.whtCertIssuedAt = now;
      newStatus = "WHT_ISSUED";
      eventType = "WHT_CERT_ISSUED";
      break;
    case "send_wht":
      updateData.whtCertSentAt = now;
      newStatus = "WHT_SENT_TO_VENDOR";
      eventType = "WHT_CERT_SENT";
      break;
    case "send_to_accounting":
      updateData.sentToAccountAt = now;
      newStatus = "SENT_TO_ACCOUNTANT";
      eventType = "SENT_TO_ACCOUNTANT";
      updateData.status = "SENT_TO_ACCOUNT";
      break;
    case "complete":
      newStatus = "COMPLETED";
      eventType = "STATUS_CHANGED";
      break;
    case "revert":
      newStatus = targetStatus as ExpenseWorkflowStatus;
      eventType = "STATUS_CHANGED";
      break;
    default:
      throw new WorkflowError(`Unknown action: ${action}`, "BAD_REQUEST");
  }

  if (newStatus) updateData.workflowStatus = newStatus;
  return { updateData, newStatus, eventType };
}

function resolveIncomeAction(
  action: string,
  income: { isWhtDeducted: boolean; workflowStatus: string },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: IncomeWorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
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
      newStatus = income.isWhtDeducted
        ? "WHT_PENDING_CERT"
        : "READY_FOR_ACCOUNTING";
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
      updateData.status = "SENT_COPY";
      break;
    case "complete":
      newStatus = "COMPLETED";
      eventType = "STATUS_CHANGED";
      break;
    case "revert":
      newStatus = targetStatus as IncomeWorkflowStatus;
      eventType = "STATUS_CHANGED";
      break;
    default:
      throw new WorkflowError(`Unknown action: ${action}`, "BAD_REQUEST");
  }

  if (newStatus) updateData.workflowStatus = newStatus;
  return { updateData, newStatus, eventType };
}

export async function executeWorkflowAction(
  params: WorkflowActionParams
): Promise<Expense | Income> {
  const {
    companyId,
    userId,
    transactionType,
    transactionId,
    action,
    notes,
    metadata,
    targetStatus,
  } = params;

  if (action === "revert") {
    await checkRevertPermission(userId, companyId);
    if (!targetStatus) {
      throw new WorkflowError(
        "targetStatus is required for revert action",
        "BAD_REQUEST"
      );
    }
  }

  const now = new Date();

  if (transactionType === "expense") {
    const expense = await prisma.expense.findUnique({
      where: { id: transactionId },
    });
    if (!expense || expense.companyId !== companyId) {
      throw new WorkflowError("Expense not found", "NOT_FOUND");
    }

    const { updateData, newStatus, eventType } = resolveExpenseAction(
      action,
      expense,
      targetStatus,
      now
    );

    return prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: transactionId },
        data: updateData as Prisma.ExpenseUpdateInput,
      });
      if (eventType) {
        await tx.documentEvent.create({
          data: {
            id: crypto.randomUUID(),
            expenseId: transactionId,
            eventType,
            eventDate: now,
            fromStatus: expense.workflowStatus,
            toStatus: newStatus,
            notes: notes || null,
            metadata: metadata as Prisma.InputJsonValue ?? undefined,
            createdBy: userId,
          },
        });
      }
      return updated;
    });
  }

  if (transactionType === "income") {
    const income = await prisma.income.findUnique({
      where: { id: transactionId },
    });
    if (!income || income.companyId !== companyId) {
      throw new WorkflowError("Income not found", "NOT_FOUND");
    }

    const { updateData, newStatus, eventType } = resolveIncomeAction(
      action,
      income,
      targetStatus,
      now
    );

    return prisma.$transaction(async (tx) => {
      const updated = await tx.income.update({
        where: { id: transactionId },
        data: updateData as Prisma.IncomeUpdateInput,
      });
      if (eventType) {
        await tx.documentEvent.create({
          data: {
            id: crypto.randomUUID(),
            incomeId: transactionId,
            eventType,
            eventDate: now,
            fromStatus: income.workflowStatus,
            toStatus: newStatus,
            notes: notes || null,
            metadata: metadata as Prisma.InputJsonValue ?? undefined,
            createdBy: userId,
          },
        });
      }
      return updated;
    });
  }

  throw new WorkflowError(
    "transactionType must be 'expense' or 'income'",
    "BAD_REQUEST"
  );
}
