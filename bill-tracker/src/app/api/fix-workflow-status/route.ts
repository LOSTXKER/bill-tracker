/**
 * API to fix workflow statuses for items with incorrect WHT/Document type statuses
 * This will update items that are stuck in WHT statuses but don't actually have WHT
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { ExpenseWorkflowStatus, IncomeWorkflowStatus, ExpenseDocumentType } from "@prisma/client";

// WHT-related statuses that should be skipped for non-WHT items
const EXPENSE_WHT_STATUSES: ExpenseWorkflowStatus[] = [
  ExpenseWorkflowStatus.WHT_PENDING_ISSUE, 
  ExpenseWorkflowStatus.WHT_ISSUED, 
  ExpenseWorkflowStatus.WHT_SENT_TO_VENDOR
];
const INCOME_WHT_STATUSES: IncomeWorkflowStatus[] = [
  IncomeWorkflowStatus.WHT_PENDING_CERT, 
  IncomeWorkflowStatus.WHT_CERT_RECEIVED
];

// Tax invoice statuses that should be skipped for NO_DOCUMENT or CASH_RECEIPT
const EXPENSE_TAX_INVOICE_STATUSES: ExpenseWorkflowStatus[] = [
  ExpenseWorkflowStatus.WAITING_TAX_INVOICE, 
  ExpenseWorkflowStatus.TAX_INVOICE_RECEIVED
];

// Document types that don't need tax invoice workflow
const NO_TAX_INVOICE_DOC_TYPES: ExpenseDocumentType[] = [
  ExpenseDocumentType.NO_DOCUMENT, 
  ExpenseDocumentType.CASH_RECEIPT
];

export const POST = (request: Request) => {
  return withAuth(async (req, { session }) => {
    // Only allow this for admin/owner users
    // For now, just check if user is authenticated
    
    const results = {
      expenses: {
        whtFixed: 0,
        taxInvoiceFixed: 0,
        paidCashReceiptFixed: 0,
        errors: [] as string[],
      },
      incomes: {
        whtFixed: 0,
        errors: [] as string[],
      },
    };

    try {
      // Fix Expenses with WHT status but no WHT
      const expensesWithWrongWhtStatus = await prisma.expense.findMany({
        where: {
          workflowStatus: { in: EXPENSE_WHT_STATUSES },
          isWht: false,
          deletedAt: null,
        },
        select: { id: true, workflowStatus: true, description: true },
      });

      for (const expense of expensesWithWrongWhtStatus) {
        try {
          await prisma.expense.update({
            where: { id: expense.id },
            data: { workflowStatus: ExpenseWorkflowStatus.READY_FOR_ACCOUNTING },
          });
          results.expenses.whtFixed++;
        } catch (err) {
          results.expenses.errors.push(`Expense ${expense.id}: ${err}`);
        }
      }

      // Fix Expenses with Tax Invoice status but NO_DOCUMENT or CASH_RECEIPT
      const expensesWithWrongTaxStatus = await prisma.expense.findMany({
        where: {
          workflowStatus: { in: EXPENSE_TAX_INVOICE_STATUSES },
          documentType: { in: NO_TAX_INVOICE_DOC_TYPES },
          deletedAt: null,
        },
        select: { id: true, workflowStatus: true, description: true, isWht: true },
      });

      for (const expense of expensesWithWrongTaxStatus) {
        try {
          // Determine correct next status
          // If has WHT, go to WHT_PENDING_ISSUE, otherwise go to READY_FOR_ACCOUNTING
          const nextStatus = expense.isWht 
            ? ExpenseWorkflowStatus.WHT_PENDING_ISSUE 
            : ExpenseWorkflowStatus.READY_FOR_ACCOUNTING;
          
          await prisma.expense.update({
            where: { id: expense.id },
            data: { workflowStatus: nextStatus },
          });
          results.expenses.taxInvoiceFixed++;
        } catch (err) {
          results.expenses.errors.push(`Expense ${expense.id}: ${err}`);
        }
      }

      // Fix Expenses with PAID status but CASH_RECEIPT document type
      // CASH_RECEIPT workflow should be: DRAFT → WAITING_TAX_INVOICE (รอบิลเงินสด)
      const expensesWithPaidCashReceipt = await prisma.expense.findMany({
        where: {
          workflowStatus: ExpenseWorkflowStatus.PAID,
          documentType: ExpenseDocumentType.CASH_RECEIPT,
          deletedAt: null,
        },
        select: { id: true, workflowStatus: true, description: true },
      });

      for (const expense of expensesWithPaidCashReceipt) {
        try {
          await prisma.expense.update({
            where: { id: expense.id },
            data: { workflowStatus: ExpenseWorkflowStatus.WAITING_TAX_INVOICE },
          });
          results.expenses.paidCashReceiptFixed++;
        } catch (err) {
          results.expenses.errors.push(`Expense ${expense.id}: ${err}`);
        }
      }

      // Fix Incomes with WHT status but no WHT deducted
      const incomesWithWrongWhtStatus = await prisma.income.findMany({
        where: {
          workflowStatus: { in: INCOME_WHT_STATUSES },
          isWhtDeducted: false,
          deletedAt: null,
        },
        select: { id: true, workflowStatus: true, source: true },
      });

      for (const income of incomesWithWrongWhtStatus) {
        try {
          await prisma.income.update({
            where: { id: income.id },
            data: { workflowStatus: IncomeWorkflowStatus.READY_FOR_ACCOUNTING },
          });
          results.incomes.whtFixed++;
        } catch (err) {
          results.incomes.errors.push(`Income ${income.id}: ${err}`);
        }
      }

      const totalFixed = results.expenses.whtFixed + results.expenses.taxInvoiceFixed + results.expenses.paidCashReceiptFixed + results.incomes.whtFixed;

      return apiResponse.success(
        {
          results,
          summary: {
            totalFixed,
            expensesWhtFixed: results.expenses.whtFixed,
            expensesTaxInvoiceFixed: results.expenses.taxInvoiceFixed,
            expensesPaidCashReceiptFixed: results.expenses.paidCashReceiptFixed,
            incomesWhtFixed: results.incomes.whtFixed,
          },
        },
        `แก้ไขสถานะสำเร็จ ${totalFixed} รายการ`
      );
    } catch (error) {
      console.error("Fix workflow status error:", error);
      return apiResponse.error("เกิดข้อผิดพลาดในการแก้ไขสถานะ");
    }
  })(request);
};

// GET to preview what will be fixed
export const GET = (request: Request) => {
  return withAuth(async (req, { session }) => {
    try {
      // Find Expenses with WHT status but no WHT
      const expensesWithWrongWhtStatus = await prisma.expense.findMany({
        where: {
          workflowStatus: { in: EXPENSE_WHT_STATUSES },
          isWht: false,
          deletedAt: null,
        },
        select: { 
          id: true, 
          workflowStatus: true, 
          description: true, 
          isWht: true,
          documentType: true,
          Company: { select: { code: true, name: true } },
        },
      });

      // Find Expenses with Tax Invoice status but NO_DOCUMENT or CASH_RECEIPT
      const expensesWithWrongTaxStatus = await prisma.expense.findMany({
        where: {
          workflowStatus: { in: EXPENSE_TAX_INVOICE_STATUSES },
          documentType: { in: NO_TAX_INVOICE_DOC_TYPES },
          deletedAt: null,
        },
        select: { 
          id: true, 
          workflowStatus: true, 
          description: true, 
          isWht: true,
          documentType: true,
          Company: { select: { code: true, name: true } },
        },
      });

      // Find Expenses with PAID status but CASH_RECEIPT document type
      const expensesWithPaidCashReceipt = await prisma.expense.findMany({
        where: {
          workflowStatus: ExpenseWorkflowStatus.PAID,
          documentType: ExpenseDocumentType.CASH_RECEIPT,
          deletedAt: null,
        },
        select: { 
          id: true, 
          workflowStatus: true, 
          description: true, 
          documentType: true,
          Company: { select: { code: true, name: true } },
        },
      });

      // Find Incomes with WHT status but no WHT deducted
      const incomesWithWrongWhtStatus = await prisma.income.findMany({
        where: {
          workflowStatus: { in: INCOME_WHT_STATUSES },
          isWhtDeducted: false,
          deletedAt: null,
        },
        select: { 
          id: true, 
          workflowStatus: true, 
          source: true, 
          isWhtDeducted: true,
          Company: { select: { code: true, name: true } },
        },
      });

      return apiResponse.success({
        preview: true,
        expenses: {
          wrongWhtStatus: expensesWithWrongWhtStatus,
          wrongTaxInvoiceStatus: expensesWithWrongTaxStatus,
          paidCashReceipt: expensesWithPaidCashReceipt,
        },
        incomes: {
          wrongWhtStatus: incomesWithWrongWhtStatus,
        },
        summary: {
          totalToFix: expensesWithWrongWhtStatus.length + expensesWithWrongTaxStatus.length + expensesWithPaidCashReceipt.length + incomesWithWrongWhtStatus.length,
          expensesWhtToFix: expensesWithWrongWhtStatus.length,
          expensesTaxInvoiceToFix: expensesWithWrongTaxStatus.length,
          expensesPaidCashReceiptToFix: expensesWithPaidCashReceipt.length,
          incomesWhtToFix: incomesWithWrongWhtStatus.length,
        },
      });
    } catch (error) {
      console.error("Preview fix error:", error);
      return apiResponse.error("เกิดข้อผิดพลาด");
    }
  })(request);
};
