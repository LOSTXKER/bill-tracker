import { prisma } from "@/lib/db";
import type { Expense, Prisma, PaidByType, SettlementStatus } from "@prisma/client";
import type { TransactionRequestBody, TransactionHookContext, TransactionUpdateHookContext } from "../transaction-types";
import { deduplicatePayers } from "./expense-transforms";
import { learnFromTransaction } from "../vendor-mapping";

export async function handleExpenseAfterCreate(item: Expense, body: TransactionRequestBody, context: TransactionHookContext) {
  if (item.contactId && !item.isSettlementTransfer) {
    try {
      const contactUpdate: Record<string, unknown> = {};

      if (body.updateContactDelivery && item.whtDeliveryMethod) {
        contactUpdate.preferredDeliveryMethod = item.whtDeliveryMethod;
        contactUpdate.deliveryEmail = item.whtDeliveryEmail || null;
        contactUpdate.deliveryNotes = item.whtDeliveryNotes || null;
      }

      if (body.updateContactTaxInvoiceRequest && item.taxInvoiceRequestMethod) {
        contactUpdate.taxInvoiceRequestMethod = item.taxInvoiceRequestMethod;
        contactUpdate.taxInvoiceRequestEmail = item.taxInvoiceRequestEmail || null;
        contactUpdate.taxInvoiceRequestNotes = item.taxInvoiceRequestNotes || null;
      }

      if (Object.keys(contactUpdate).length > 0) {
        await prisma.contact.update({
          where: { id: item.contactId },
          data: contactUpdate as Prisma.ContactUncheckedUpdateInput,
        });
      }
    } catch (error) {
      console.error("Failed to update contact delivery preferences:", error);
    }
  }

  if (body.payers && Array.isArray(body.payers) && body.payers.length > 0) {
    const uniquePayers = deduplicatePayers(body.payers as Array<{
      paidByType: PaidByType;
      paidByUserId?: string | null;
      paidByPettyCashFundId?: string | null;
      paidByName?: string | null;
      paidByBankName?: string | null;
      paidByBankAccount?: string | null;
      amount: number;
      settlementStatus?: SettlementStatus;
      settledAt?: string;
      settlementRef?: string;
    }>);

    // Atomic: create all payments and petty cash adjustments together
    await prisma.$transaction(async (tx) => {
      for (const payer of uniquePayers) {
        // Strip settlement status from client - only the settlement API may set this
        const settlementStatus: SettlementStatus =
          payer.paidByType === "USER" ? "PENDING" : "NOT_REQUIRED";

        await tx.expensePayment.create({
          data: {
            expenseId: item.id,
            paidByType: payer.paidByType,
            paidByUserId: payer.paidByUserId || null,
            paidByPettyCashFundId: payer.paidByPettyCashFundId || null,
            paidByName: payer.paidByName || null,
            paidByBankName: payer.paidByBankName || null,
            paidByBankAccount: payer.paidByBankAccount || null,
            amount: payer.amount,
            settlementStatus,
            settledAt: null,
            settledBy: null,
            settlementRef: null,
          },
        });

        if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
          await tx.pettyCashFund.update({
            where: { id: payer.paidByPettyCashFundId },
            data: { currentAmount: { decrement: payer.amount } },
          });

          await tx.pettyCashTransaction.create({
            data: {
              fundId: payer.paidByPettyCashFundId,
              type: "EXPENSE",
              amount: payer.amount,
              expenseId: item.id,
              description: item.description || "รายจ่าย",
              createdBy: context.session.user.id,
            },
          });
        }
      }
    });
  }

  // Learn vendor mapping from this transaction (skip settlement transfers — not real vendor activity)
  if (!item.isSettlementTransfer && (item.accountId || item.contactId)) {
    learnFromTransaction({
      companyId: context.company.id,
      contactId: item.contactId,
      contactName: item.contactName,
      accountId: item.accountId,
      transactionType: "expense",
      txId: item.id,
      vatRate: item.vatRate != null ? Number(item.vatRate) : null,
      whtRate: item.whtRate != null ? Number(item.whtRate) : null,
      whtType: item.whtType,
    }).catch(() => {});
  }
}

export async function handleExpenseAfterUpdate(item: Expense, body: TransactionRequestBody, context: TransactionUpdateHookContext<Expense>) {
  if (body.payers && Array.isArray(body.payers)) {
    const existingPayments = await prisma.expensePayment.findMany({
      where: { expenseId: item.id },
    });

    const settledUserPayments = existingPayments.filter(
      (p) => p.paidByType === "USER" && p.settlementStatus === "SETTLED"
    );
    const settledUserIds = new Set(settledUserPayments.map((p) => p.paidByUserId));

    const uniquePayers = body.payers.length > 0
      ? deduplicatePayers(body.payers as Array<{
          paidByType: PaidByType;
          paidByUserId?: string | null;
          paidByPettyCashFundId?: string | null;
          paidByName?: string | null;
          paidByBankName?: string | null;
          paidByBankAccount?: string | null;
          amount: number;
        }>)
      : [];

    // Atomic: reverse old petty cash, delete old payments, create new ones
    await prisma.$transaction(async (tx) => {
      // Reverse petty cash for old payments being removed
      for (const payment of existingPayments) {
        if (payment.paidByType === "PETTY_CASH" && payment.paidByPettyCashFundId) {
          await tx.pettyCashFund.update({
            where: { id: payment.paidByPettyCashFundId },
            data: { currentAmount: { increment: Number(payment.amount) } },
          });

          await tx.pettyCashTransaction.create({
            data: {
              fundId: payment.paidByPettyCashFundId,
              type: "ADJUSTMENT",
              amount: Number(payment.amount),
              description: `คืนเงินจากการแก้ไขรายจ่าย: ${item.description || "ไม่ระบุ"}`,
              createdBy: context.session.user.id,
            },
          });
        }
      }

      // Delete all non-settled payments
      await tx.expensePayment.deleteMany({
        where: {
          expenseId: item.id,
          NOT: { AND: [{ paidByType: "USER" }, { settlementStatus: "SETTLED" }] },
        },
      });

      // Create new payments
      for (const payer of uniquePayers) {
        if (payer.paidByType === "USER" && payer.paidByUserId && settledUserIds.has(payer.paidByUserId)) {
          continue;
        }

        const settlementStatus: SettlementStatus = payer.paidByType === "USER" ? "PENDING" : "NOT_REQUIRED";

        await tx.expensePayment.create({
          data: {
            expenseId: item.id,
            paidByType: payer.paidByType,
            paidByUserId: payer.paidByUserId || null,
            paidByPettyCashFundId: payer.paidByPettyCashFundId || null,
            paidByName: payer.paidByName || null,
            paidByBankName: payer.paidByBankName || null,
            paidByBankAccount: payer.paidByBankAccount || null,
            amount: payer.amount,
            settlementStatus,
          },
        });

        if (payer.paidByType === "PETTY_CASH" && payer.paidByPettyCashFundId) {
          await tx.pettyCashFund.update({
            where: { id: payer.paidByPettyCashFundId },
            data: { currentAmount: { decrement: payer.amount } },
          });

          await tx.pettyCashTransaction.create({
            data: {
              fundId: payer.paidByPettyCashFundId,
              type: "EXPENSE",
              amount: payer.amount,
              expenseId: item.id,
              description: item.description || "รายจ่าย (แก้ไข)",
              createdBy: context.session.user.id,
            },
          });
        }
      }
    });
  }

  if (body.updateContactDelivery && item.contactId && item.whtDeliveryMethod) {
    try {
      await prisma.contact.update({
        where: { id: item.contactId },
        data: {
          preferredDeliveryMethod: item.whtDeliveryMethod,
          deliveryEmail: item.whtDeliveryEmail || null,
          deliveryNotes: item.whtDeliveryNotes || null,
        },
      });
    } catch (error) {
      console.error("Failed to update contact delivery preferences:", error);
    }
  }

  if (body.updateContactTaxInvoiceRequest && item.contactId && item.taxInvoiceRequestMethod) {
    try {
      await prisma.contact.update({
        where: { id: item.contactId },
        data: {
          taxInvoiceRequestMethod: item.taxInvoiceRequestMethod,
          taxInvoiceRequestEmail: item.taxInvoiceRequestEmail || null,
          taxInvoiceRequestNotes: item.taxInvoiceRequestNotes || null,
        },
      });
    } catch (error) {
      console.error("Failed to update contact tax invoice request preferences:", error);
    }
  }

  // Learn vendor mapping from updated transaction (skip settlement transfers)
  if (!item.isSettlementTransfer && (item.accountId || item.contactId)) {
    learnFromTransaction({
      companyId: context.company.id,
      contactId: item.contactId,
      contactName: item.contactName,
      accountId: item.accountId,
      transactionType: "expense",
      txId: item.id,
      vatRate: item.vatRate != null ? Number(item.vatRate) : null,
      whtRate: item.whtRate != null ? Number(item.whtRate) : null,
      whtType: item.whtType,
    }).catch(() => {});
  }
}
