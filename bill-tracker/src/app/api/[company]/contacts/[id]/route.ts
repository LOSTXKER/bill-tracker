import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

/**
 * GET /api/[company]/contacts/[id]
 * Get a specific contact with defaults
 */
async function handleGet(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  const contact = await prisma.contact.findFirst({
    where: {
      id: context.params.id,
      companyId: context.company.id,
    },
    select: {
      id: true,
      name: true,
      taxId: true,
      address: true,
      phone: true,
      email: true,
      bankAccount: true,
      bankName: true,
      creditLimit: true,
      paymentTerms: true,
      notes: true,
      branchCode: true,
      peakCode: true,
      contactCategory: true,
      entityType: true,
      source: true,
      // Contact defaults for transactions
      defaultVatRate: true,
      defaultWhtEnabled: true,
      defaultWhtRate: true,
      defaultWhtType: true,
      descriptionTemplate: true,
      defaultsLastUpdatedAt: true,
    },
  });

  if (!contact) {
    return apiResponse.notFound("ไม่พบผู้ติดต่อนี้");
  }

  // Check if contact has any defaults set
  const hasDefaults = 
    contact.defaultVatRate !== null ||
    contact.defaultWhtEnabled !== null ||
    contact.descriptionTemplate !== null;

  return apiResponse.success({ 
    contact,
    hasDefaults,
  });
}

/**
 * PATCH /api/[company]/contacts/[id]
 * Update contact defaults (quick update for defaults only)
 */
async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  const body = await req.json();

  // Check if contact exists and belongs to company
  const existing = await prisma.contact.findFirst({
    where: {
      id: context.params.id,
      companyId: context.company.id,
    },
  });

  if (!existing) {
    return apiResponse.notFound("ไม่พบผู้ติดต่อนี้");
  }

  // Update contact defaults
  const contact = await prisma.contact.update({
    where: { id: context.params.id },
    data: {
      defaultVatRate: body.defaultVatRate !== undefined ? body.defaultVatRate : existing.defaultVatRate,
      defaultWhtEnabled: body.defaultWhtEnabled !== undefined ? body.defaultWhtEnabled : existing.defaultWhtEnabled,
      defaultWhtRate: body.defaultWhtRate !== undefined ? body.defaultWhtRate : existing.defaultWhtRate,
      defaultWhtType: body.defaultWhtType !== undefined ? body.defaultWhtType : existing.defaultWhtType,
      descriptionTemplate: body.descriptionTemplate !== undefined ? body.descriptionTemplate : existing.descriptionTemplate,
      defaultsLastUpdatedAt: new Date(),
    },
  });

  return apiResponse.success({ contact });
}

export const GET = withCompanyAccessFromParams(handleGet, {
  permission: "contacts:read",
});

export const PATCH = withCompanyAccessFromParams(handlePatch, {
  permission: "contacts:update",
});
