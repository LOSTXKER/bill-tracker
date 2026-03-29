import { prisma } from "@/lib/db";
import type { Income } from "@prisma/client";
import type { TransactionRequestBody, TransactionHookContext } from "../transaction-types";

export async function handleIncomeAfterCreate(item: Income, body: TransactionRequestBody, _context: TransactionHookContext) {
  if (item.contactId) {
    try {
      await prisma.contact.findUnique({
        where: { id: item.contactId },
        select: { defaultsLastUpdatedAt: true },
      });

      await prisma.contact.update({
        where: { id: item.contactId },
        data: {
          defaultVatRate: item.vatRate,
          defaultWhtEnabled: item.isWhtDeducted,
          defaultWhtRate: item.whtRate,
          defaultWhtType: item.whtType,
          descriptionTemplate: item.source,
          defaultsLastUpdatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to update contact defaults:", error);
    }
  }
}
