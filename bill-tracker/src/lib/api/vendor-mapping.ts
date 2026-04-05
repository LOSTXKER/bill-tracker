import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

/**
 * Learn from a completed transaction to build VendorMapping entries.
 * Called after expense/income create or update when both contactId and accountId are present.
 */
export async function learnFromTransaction(params: {
  companyId: string;
  contactId: string | null;
  contactName: string | null;
  accountId: string | null;
  transactionType: "expense" | "income";
  txId: string;
  vatRate?: number | null;
  whtRate?: number | null;
  whtType?: string | null;
  paymentMethod?: string | null;
}) {
  const { companyId, contactId, contactName, accountId, transactionType, txId } = params;

  if (!accountId) return;

  try {
    let vendorTaxId: string | null = null;
    let vendorName: string | null = contactName || null;

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { taxId: true, name: true },
      });
      if (contact) {
        vendorTaxId = contact.taxId;
        vendorName = contact.name;
      }
    }

    if (!vendorTaxId && !vendorName) return;

    const uniqueKey = vendorTaxId
      ? { companyId_vendorTaxId_transactionType: { companyId, vendorTaxId, transactionType } }
      : undefined;

    if (uniqueKey) {
      await prisma.vendorMapping.upsert({
        where: uniqueKey,
        update: {
          accountId,
          vendorName,
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
          learnSource: "user",
          originalTxId: txId,
          ...(params.vatRate != null ? { defaultVatRate: params.vatRate } : {}),
          ...(params.whtRate != null ? { defaultWhtRate: params.whtRate } : {}),
          ...(params.whtType ? { defaultWhtType: params.whtType } : {}),
          ...(params.paymentMethod ? { paymentMethod: params.paymentMethod as any } : {}),
        },
        create: {
          id: randomUUID(),
          companyId,
          vendorTaxId,
          vendorName,
          accountId,
          transactionType,
          useCount: 1,
          lastUsedAt: new Date(),
          learnSource: "user",
          originalTxId: txId,
          updatedAt: new Date(),
          ...(params.vatRate != null ? { defaultVatRate: params.vatRate } : {}),
          ...(params.whtRate != null ? { defaultWhtRate: params.whtRate } : {}),
          ...(params.whtType ? { defaultWhtType: params.whtType } : {}),
          ...(params.paymentMethod ? { paymentMethod: params.paymentMethod as any } : {}),
        },
      });
    } else if (vendorName) {
      // No taxId — create by name if no existing mapping
      const existing = await prisma.vendorMapping.findFirst({
        where: { companyId, vendorName, transactionType },
      });

      if (existing) {
        await prisma.vendorMapping.update({
          where: { id: existing.id },
          data: {
            accountId,
            useCount: { increment: 1 },
            lastUsedAt: new Date(),
            learnSource: "user",
            originalTxId: txId,
          },
        });
      } else {
        await prisma.vendorMapping.create({
          data: {
            id: randomUUID(),
            companyId,
            vendorName,
            namePattern: vendorName.toLowerCase(),
            accountId,
            transactionType,
            useCount: 1,
            lastUsedAt: new Date(),
            learnSource: "user",
            originalTxId: txId,
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to learn vendor mapping:", error);
  }
}
