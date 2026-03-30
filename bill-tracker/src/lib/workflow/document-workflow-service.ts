import { prisma } from "@/lib/db";
import type { Expense, Income, Contact } from "@prisma/client";
import {
  DocumentEventType,
  WorkflowStatus,
  Prisma,
} from "@prisma/client";
import { REVERT_MAP } from "./status-rules";
import { checkPermissionFromAccess } from "@/lib/permissions/checker";

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
        workflowStatus: "ACTIVE",
        hasTaxInvoice: false,
        documentType: { not: "NO_DOCUMENT" },
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
        workflowStatus: "ACTIVE",
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
        workflowStatus: "ACTIVE",
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

async function checkRevertPermission(
  userId: string,
  companyId: string,
  transactionType: string,
) {
  const access = await prisma.companyAccess.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!access) {
    throw new WorkflowError("ไม่มีสิทธิ์เข้าถึง", "FORBIDDEN");
  }

  const requiredPerm = transactionType === "expense"
    ? "expenses:change-status"
    : "incomes:change-status";

  if (checkPermissionFromAccess(access, requiredPerm)) return;

  throw new WorkflowError(
    "คุณไม่มีสิทธิ์ย้อนสถานะ",
    "FORBIDDEN"
  );
}

function resolveExpenseAction(
  action: string,
  expense: { isWht: boolean; workflowStatus: string; documentType: string; hasTaxInvoice: boolean; hasWhtCert: boolean; whtCertSentAt: Date | null },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: WorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
  let newStatus: WorkflowStatus | null = null;
  let eventType: DocumentEventType | null = null;

  switch (action) {
    case "mark_tax_invoice_requested": {
      updateData.taxInvoiceRequestedAt = now;
      eventType = "TAX_INVOICE_REQUESTED";
      break;
    }
    case "cancel_tax_invoice_request": {
      updateData.taxInvoiceRequestedAt = null;
      eventType = "TAX_INVOICE_REQUESTED";
      break;
    }
    case "receive_tax_invoice": {
      updateData.hasTaxInvoice = true;
      updateData.taxInvoiceAt = now;
      eventType = "TAX_INVOICE_RECEIVED";
      break;
    }
    case "skip_to_wht":
    case "skip_to_accounting": {
      eventType = "STATUS_CHANGED";
      break;
    }
    case "issue_wht": {
      updateData.hasWhtCert = true;
      updateData.whtCertIssuedAt = now;
      eventType = "WHT_CERT_ISSUED";
      break;
    }
    case "send_wht": {
      updateData.whtCertSentAt = now;
      eventType = "WHT_CERT_SENT";
      break;
    }
    case "undo_receive_tax_invoice": {
      updateData.hasTaxInvoice = false;
      updateData.taxInvoiceAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_issue_wht": {
      updateData.hasWhtCert = false;
      updateData.whtCertIssuedAt = null;
      updateData.whtCertSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_send_wht": {
      updateData.whtCertSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
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
      newStatus = targetStatus as WorkflowStatus;
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
  income: { isWhtDeducted: boolean; workflowStatus: string; hasInvoice: boolean; invoiceSentAt: Date | null; hasWhtCert: boolean },
  targetStatus: string | undefined,
  now: Date
): {
  updateData: Record<string, unknown>;
  newStatus: WorkflowStatus | null;
  eventType: DocumentEventType | null;
} {
  const updateData: Record<string, unknown> = {};
  let newStatus: WorkflowStatus | null = null;
  let eventType: DocumentEventType | null = null;

  switch (action) {
    case "issue_invoice": {
      updateData.hasInvoice = true;
      updateData.invoiceIssuedAt = now;
      eventType = "INVOICE_ISSUED";
      break;
    }
    case "send_invoice": {
      updateData.invoiceSentAt = now;
      eventType = "INVOICE_SENT";
      break;
    }
    case "receive_wht": {
      updateData.hasWhtCert = true;
      updateData.whtCertReceivedAt = now;
      eventType = "WHT_CERT_RECEIVED";
      break;
    }
    case "remind_wht":
      updateData.whtCertRemindedAt = now;
      updateData.whtCertRemindCount = { increment: 1 };
      eventType = "WHT_REMINDER_SENT";
      break;
    case "undo_issue_invoice": {
      updateData.hasInvoice = false;
      updateData.invoiceIssuedAt = null;
      updateData.invoiceSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_send_invoice": {
      updateData.invoiceSentAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
    case "undo_receive_wht": {
      updateData.hasWhtCert = false;
      updateData.whtCertReceivedAt = null;
      eventType = "STATUS_CHANGED";
      break;
    }
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
      newStatus = targetStatus as WorkflowStatus;
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
    await checkRevertPermission(userId, companyId, transactionType);
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

    if (action === "revert") {
      const allowed = REVERT_MAP[expense.workflowStatus];
      if (!allowed || allowed !== targetStatus) {
        throw new WorkflowError(
          `ไม่สามารถย้อนจาก ${expense.workflowStatus} ไป ${targetStatus} ได้`,
          "BAD_REQUEST"
        );
      }
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

    if (action === "revert") {
      const allowed = REVERT_MAP[income.workflowStatus];
      if (!allowed || allowed !== targetStatus) {
        throw new WorkflowError(
          `ไม่สามารถย้อนจาก ${income.workflowStatus} ไป ${targetStatus} ได้`,
          "BAD_REQUEST"
        );
      }
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
