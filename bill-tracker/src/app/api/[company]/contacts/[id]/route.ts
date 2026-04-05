import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

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
      defaultVatRate: true,
      defaultWhtEnabled: true,
      defaultWhtRate: true,
      defaultWhtType: true,
      descriptionTemplate: true,
      descriptionPresets: true,
      defaultAccountId: true,
      DefaultAccount: { select: { id: true, code: true, name: true } },
      defaultsLastUpdatedAt: true,
      preferredDeliveryMethod: true,
      deliveryEmail: true,
      deliveryNotes: true,
      taxInvoiceRequestMethod: true,
      taxInvoiceRequestEmail: true,
      taxInvoiceRequestNotes: true,
    },
  });

  if (!contact) {
    return apiResponse.notFound("ไม่พบผู้ติดต่อนี้");
  }

  const hasDefaults =
    contact.defaultVatRate !== null ||
    contact.defaultWhtEnabled !== null ||
    contact.descriptionTemplate !== null ||
    contact.defaultAccountId !== null ||
    (Array.isArray(contact.descriptionPresets) && (contact.descriptionPresets as unknown[]).length > 0) ||
    contact.preferredDeliveryMethod !== null ||
    contact.taxInvoiceRequestMethod !== null;

  return apiResponse.success({
    contact: {
      ...contact,
      defaultAccountCode: contact.DefaultAccount?.code ?? null,
      defaultAccountName: contact.DefaultAccount?.name ?? null,
    },
    hasDefaults,
  });
}

async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  const body = await req.json();

  const existing = await prisma.contact.findFirst({
    where: {
      id: context.params.id,
      companyId: context.company.id,
    },
  });

  if (!existing) {
    return apiResponse.notFound("ไม่พบผู้ติดต่อนี้");
  }

  const contact = await prisma.contact.update({
    where: { id: context.params.id },
    data: {
      defaultVatRate: body.defaultVatRate !== undefined ? body.defaultVatRate : existing.defaultVatRate,
      defaultWhtEnabled: body.defaultWhtEnabled !== undefined ? body.defaultWhtEnabled : existing.defaultWhtEnabled,
      defaultWhtRate: body.defaultWhtRate !== undefined ? body.defaultWhtRate : existing.defaultWhtRate,
      defaultWhtType: body.defaultWhtType !== undefined ? body.defaultWhtType : existing.defaultWhtType,
      descriptionTemplate: body.descriptionTemplate !== undefined ? body.descriptionTemplate : existing.descriptionTemplate,
      descriptionPresets: body.descriptionPresets !== undefined ? body.descriptionPresets : undefined,
      defaultAccountId: body.defaultAccountId !== undefined ? body.defaultAccountId : existing.defaultAccountId,
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
