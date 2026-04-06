/**
 * document-workflow-service.ts
 *
 * Core orchestrator for the document workflow module.
 * - Exports `WorkflowError`, `WorkflowActionParams`, `executeWorkflowAction`
 * - Re-exports query types and functions from document-workflow-queries.ts
 *
 * Action-resolution logic lives in document-workflow-actions.ts.
 * Data-fetching for pending items lives in document-workflow-queries.ts.
 */

import { prisma } from "@/lib/db";
import type { Expense, Income } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { REVERT_MAP } from "./status-rules";
import { checkPermissionFromAccess } from "@/lib/permissions/checker";
import { resolveExpenseAction, resolveIncomeAction, WorkflowError } from "./document-workflow-actions";

// Re-export the error class so callers can import it from the canonical entry point
export { WorkflowError };

// Re-export everything callers need from the split modules
export type {
  WorkflowExpenseItem,
  WorkflowIncomeItem,
  WorkflowPendingResults,
} from "./document-workflow-queries";
export { getWorkflowPendingItems } from "./document-workflow-queries";

// =============================================================================
// Action execution
// =============================================================================

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
  transactionType: string
) {
  const access = await prisma.companyAccess.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!access) {
    throw new WorkflowError("ไม่มีสิทธิ์เข้าถึง", "FORBIDDEN");
  }

  const requiredPerm =
    transactionType === "expense" ? "expenses:change-status" : "incomes:change-status";

  if (checkPermissionFromAccess(access, requiredPerm)) return;

  throw new WorkflowError("คุณไม่มีสิทธิ์ย้อนสถานะ", "FORBIDDEN");
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
            metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
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
            metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
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
