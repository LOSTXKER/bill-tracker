import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { createMapping } from "@/lib/ai/vendor-mapping";

/**
 * POST /api/vendor-mappings/from-transaction
 * Create a vendor mapping from an existing transaction
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();

    const {
      transactionId,
      transactionType, // "expense" or "income"
      // Override values (optional)
      vendorName,
      vendorTaxId,
      namePattern,
      accountId,
      defaultVatRate,
      paymentMethod,
      descriptionTemplate,
    } = body;

    if (!transactionId || !transactionType) {
      return apiResponse.error(
        new Error("transactionId และ transactionType จำเป็นต้องระบุ")
      );
    }

    // Find the transaction
    let transaction: any = null;
    let contactId: string | null = null;
    let extractedVendorName: string | null = vendorName || null;
    let extractedTaxId: string | null = vendorTaxId || null;
    let extractedAccountId: string | null = accountId || null;
    let extractedVatRate: number | null = defaultVatRate ?? null;
    let extractedPaymentMethod: string | null = paymentMethod || null;

    if (transactionType === "expense") {
      transaction = await prisma.expense.findFirst({
        where: { id: transactionId, companyId: company.id },
        include: { contact: true, account: true },
      });

      if (transaction) {
        contactId = transaction.contactId;
        extractedVendorName = vendorName || transaction.contact?.name || null;
        extractedTaxId = vendorTaxId || transaction.contact?.taxId || null;
        extractedAccountId = accountId || transaction.accountId;
        extractedVatRate = defaultVatRate ?? transaction.vatRate;
        extractedPaymentMethod = paymentMethod || transaction.paymentMethod;
      }
    } else if (transactionType === "income") {
      transaction = await prisma.income.findFirst({
        where: { id: transactionId, companyId: company.id },
        include: { contact: true, account: true },
      });

      if (transaction) {
        contactId = transaction.contactId;
        extractedVendorName = vendorName || transaction.contact?.name || null;
        extractedTaxId = vendorTaxId || transaction.contact?.taxId || null;
        extractedAccountId = accountId || transaction.accountId;
        extractedVatRate = defaultVatRate ?? transaction.vatRate;
        extractedPaymentMethod = paymentMethod || transaction.paymentMethod;
      }
    }

    if (!transaction) {
      return apiResponse.error(new Error("Transaction not found"));
    }

    // Validate at least one matching criteria
    if (!extractedVendorName && !extractedTaxId && !namePattern) {
      return apiResponse.error(
        new Error(
          "ไม่สามารถสร้าง Training ได้ - ไม่มีข้อมูลชื่อร้านหรือเลขผู้เสียภาษี"
        )
      );
    }

    // Create the mapping
    const mapping = await createMapping(
      company.id,
      transactionType.toUpperCase() as "EXPENSE" | "INCOME",
      {
        vendorName: extractedVendorName || undefined,
        vendorTaxId: extractedTaxId || undefined,
        namePattern: namePattern || undefined,
        contactId: contactId || undefined,
        accountId: extractedAccountId || undefined,
        defaultVatRate: extractedVatRate ?? undefined,
        paymentMethod: extractedPaymentMethod as any,
        descriptionTemplate: descriptionTemplate || undefined,
        learnSource: "AUTO",
        originalTxId: transactionId,
      }
    );

    // Audit log
    await logCreate("VendorMapping", mapping, session.user.id, company.id);

    return apiResponse.created({
      mapping: {
        id: mapping.id,
        vendorName: mapping.vendorName,
        vendorTaxId: mapping.vendorTaxId,
        namePattern: mapping.namePattern,
        contactId: mapping.contactId,
        accountId: mapping.accountId,
        defaultVatRate: mapping.defaultVatRate,
        paymentMethod: mapping.paymentMethod,
        descriptionTemplate: mapping.descriptionTemplate,
      },
      source: {
        transactionId,
        transactionType,
      },
    });
  },
  {
    permission: "settings:update",
    rateLimit: { maxRequests: 30, windowMs: 60000 },
  }
);

/**
 * GET /api/vendor-mappings/from-transaction?company=ABC
 * Get suggestions for creating mappings from existing transactions
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Find contacts that are used in transactions but don't have mappings yet
    const existingMappingContactIds = await prisma.vendorMapping.findMany({
      where: { companyId: company.id, contactId: { not: null } },
      select: { contactId: true },
    });

    const mappedContactIds = existingMappingContactIds
      .map((m) => m.contactId)
      .filter(Boolean) as string[];

    // Get top contacts from expenses that don't have mappings
    const topExpenseContacts = await prisma.expense.groupBy({
      by: ["contactId"],
      where: {
        companyId: company.id,
        contactId: { not: null, notIn: mappedContactIds },
        deletedAt: null,
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    // Get contact details
    const contactIds = topExpenseContacts
      .map((e) => e.contactId)
      .filter(Boolean) as string[];

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    const suggestions = topExpenseContacts
      .map((e) => {
        const contact = contactMap.get(e.contactId!);
        if (!contact) return null;

        return {
          contactId: contact.id,
          contactName: contact.name,
          taxId: contact.taxId,
          transactionCount: e._count.id,
        };
      })
      .filter(Boolean);

    return apiResponse.success({
      suggestions,
      totalWithoutMapping: suggestions.length,
    });
  },
  { permission: "settings:read" }
);
