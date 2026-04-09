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
      descriptionPresets: true,
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
    (Array.isArray(contact.descriptionPresets) && (contact.descriptionPresets as unknown[]).length > 0) ||
    contact.preferredDeliveryMethod !== null ||
    contact.taxInvoiceRequestMethod !== null;

  return apiResponse.success({
    contact,
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
      descriptionPresets: body.descriptionPresets !== undefined ? body.descriptionPresets : undefined,
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
