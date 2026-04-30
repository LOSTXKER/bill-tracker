import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate, logUpdate, logDelete } from "@/lib/audit/logger";

/**
 * Normalize "nullable string" inputs from the client: trim whitespace and turn
 * empty strings into `null`. Important for fields that participate in a UNIQUE
 * constraint because Postgres allows many NULLs but rejects duplicate `""`.
 */
function nullifyBlank(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Given a Prisma P2002 error on Contact, try to fetch the existing row that
 * collided and build a user-friendly Thai message that names the culprit.
 */
async function buildContactConflictMessage(
  err: Prisma.PrismaClientKnownRequestError,
  companyId: string,
  payload: { peakCode?: string | null },
): Promise<string> {
  const target = err.meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : typeof target === "string"
      ? [target]
      : [];
  const hitsPeakCode = fields.some((f) =>
    f.toLowerCase().includes("peakcode"),
  );

  if (hitsPeakCode && payload.peakCode) {
    const conflict = await prisma.contact.findFirst({
      where: { companyId, peakCode: payload.peakCode },
      select: { id: true, name: true, peakCode: true },
    });
    if (conflict) {
      return `รหัส Peak "${conflict.peakCode}" ถูกใช้กับ "${conflict.name}" อยู่แล้ว`;
    }
    return `รหัส Peak "${payload.peakCode}" ถูกใช้กับ Contact อื่นในบริษัทนี้แล้ว`;
  }

  if (hitsPeakCode) {
    // Empty/blank peakCode that slipped through as "" — tell the user how to
    // fix it so we don't leak a mysterious "row with '' peakCode" error.
    return "กรุณาระบุรหัส Peak หรือเว้นว่างไว้ (ห้ามส่งค่าว่างๆ ซ้ำกัน)";
  }

  return "ข้อมูลนี้ซ้ำกับรายการที่มีอยู่แล้ว";
}

/**
 * GET /api/contacts?company=ABC&search=...
 * List contacts with optional search
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where = {
      companyId: company.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { taxId: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
          { peakCode: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { _count: { select: { Expense: true, Income: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    // Don't cache - let SWR handle caching on client side
    return apiResponse.success({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { permission: "contacts:read" }
);

/**
 * POST /api/contacts
 * Create a new contact
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();

    const peakCode = nullifyBlank(body.peakCode) ?? null;

    try {
      const contact = await prisma.contact.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          peakCode,
          contactCategory: body.contactCategory || "VENDOR",
          entityType: body.entityType || "COMPANY",
          businessType: body.businessType || null,
          nationality: body.nationality || "ไทย",
          prefix: body.prefix || null,
          firstName: body.firstName || null,
          lastName: body.lastName || null,
          name: body.name,
          taxId: body.taxId || null,
          branchCode: body.branchCode || "00000",
          address: body.address || null,
          subDistrict: body.subDistrict || null,
          district: body.district || null,
          province: body.province || null,
          postalCode: body.postalCode || null,
          country: body.country || "Thailand",
          contactPerson: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          bankAccount: body.bankAccount || null,
          bankName: body.bankName || null,
          creditLimit: body.creditLimit,
          paymentTerms: body.paymentTerms,
          notes: body.notes || null,
          // Transaction presets
          descriptionPresets: Array.isArray(body.descriptionPresets) ? body.descriptionPresets : [],
          defaultsLastUpdatedAt: (Array.isArray(body.descriptionPresets) && body.descriptionPresets.length > 0)
            ? new Date()
            : null,
          // Delivery preferences
          preferredDeliveryMethod: body.preferredDeliveryMethod?.toUpperCase() || null,
          deliveryEmail: body.deliveryEmail || null,
          deliveryNotes: body.deliveryNotes || null,
          // Tax Invoice Request preferences
          taxInvoiceRequestMethod: body.taxInvoiceRequestMethod?.toUpperCase() || null,
          taxInvoiceRequestEmail: body.taxInvoiceRequestEmail || null,
          taxInvoiceRequestNotes: body.taxInvoiceRequestNotes || null,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await logCreate("Contact", contact, session.user.id, company.id);

      return apiResponse.created({ contact });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const message = await buildContactConflictMessage(err, company.id, {
          peakCode,
        });
        return apiResponse.conflict(message, "DUPLICATE_CONTACT");
      }
      throw err;
    }
  },
  {
    permission: "contacts:create",
    rateLimit: { maxRequests: 30, windowMs: 60000 },
  }
);

/**
 * PATCH /api/contacts
 * Update a contact
 */
export const PATCH = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return apiResponse.error(new Error("Contact ID is required"));
    }

    // Get existing contact
    const existing = await prisma.contact.findFirst({
      where: { id, companyId: company.id },
    });

    if (!existing) {
      return apiResponse.error(new Error("Contact not found"));
    }

    const isUpdatingDefaults = data.descriptionPresets !== undefined;

    // Normalize peakCode so "" from a cleared input becomes NULL; otherwise
    // Postgres enforces UNIQUE on the literal empty string and refuses a 2nd
    // contact with an empty peakCode.
    const nextPeakCode =
      data.peakCode !== undefined
        ? (nullifyBlank(data.peakCode) ?? null)
        : existing.peakCode;

    try {
      const contact = await prisma.contact.update({
        where: { id },
        data: {
          peakCode: nextPeakCode,
          contactCategory: data.contactCategory ?? existing.contactCategory,
          entityType: data.entityType ?? existing.entityType,
          businessType: data.businessType ?? existing.businessType,
          nationality: data.nationality ?? existing.nationality,
          prefix: data.prefix ?? existing.prefix,
          firstName: data.firstName ?? existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          name: data.name ?? existing.name,
          taxId: data.taxId ?? existing.taxId,
          branchCode: data.branchCode ?? existing.branchCode,
          address: data.address ?? existing.address,
          subDistrict: data.subDistrict ?? existing.subDistrict,
          district: data.district ?? existing.district,
          province: data.province ?? existing.province,
          postalCode: data.postalCode ?? existing.postalCode,
          country: data.country ?? existing.country,
          contactPerson: data.contactPerson ?? existing.contactPerson,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          bankAccount: data.bankAccount ?? existing.bankAccount,
          bankName: data.bankName ?? existing.bankName,
          creditLimit: data.creditLimit ?? existing.creditLimit,
          paymentTerms: data.paymentTerms ?? existing.paymentTerms,
          notes: data.notes ?? existing.notes,
          // Transaction presets
          descriptionPresets: data.descriptionPresets !== undefined ? data.descriptionPresets : undefined,
          defaultsLastUpdatedAt: isUpdatingDefaults ? new Date() : existing.defaultsLastUpdatedAt,
          // Delivery preferences
          preferredDeliveryMethod: data.preferredDeliveryMethod !== undefined ? (data.preferredDeliveryMethod?.toUpperCase() || null) : existing.preferredDeliveryMethod,
          deliveryEmail: data.deliveryEmail !== undefined ? data.deliveryEmail : existing.deliveryEmail,
          deliveryNotes: data.deliveryNotes !== undefined ? data.deliveryNotes : existing.deliveryNotes,
          // Tax Invoice Request preferences
          taxInvoiceRequestMethod: data.taxInvoiceRequestMethod !== undefined ? (data.taxInvoiceRequestMethod?.toUpperCase() || null) : existing.taxInvoiceRequestMethod,
          taxInvoiceRequestEmail: data.taxInvoiceRequestEmail !== undefined ? data.taxInvoiceRequestEmail : existing.taxInvoiceRequestEmail,
          taxInvoiceRequestNotes: data.taxInvoiceRequestNotes !== undefined ? data.taxInvoiceRequestNotes : existing.taxInvoiceRequestNotes,
        },
      });

      // Create audit log
      await logUpdate("Contact", contact.id, existing, contact, session.user.id, company.id);

      return apiResponse.success({ contact });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const message = await buildContactConflictMessage(err, company.id, {
          peakCode: nextPeakCode,
        });
        return apiResponse.conflict(message, "DUPLICATE_CONTACT");
      }
      throw err;
    }
  },
  { permission: "contacts:update" }
);

/**
 * DELETE /api/contacts?id=...&company=ABC
 * Delete a contact
 */
export const DELETE = withCompanyAccess(
  async (request, { company, session }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiResponse.error(new Error("Contact ID is required"));
    }

    // Check if used in transactions (scoped to company, non-deleted only)
    const [expenseCount, incomeCount] = await Promise.all([
      prisma.expense.count({ where: { contactId: id, companyId: company.id, deletedAt: null } }),
      prisma.income.count({ where: { contactId: id, companyId: company.id, deletedAt: null } }),
    ]);

    if (expenseCount + incomeCount > 0) {
      return apiResponse.error(
        new Error(
          `ไม่สามารถลบได้ มีรายการที่เชื่อมโยงอยู่ ${expenseCount + incomeCount} รายการ`
        )
      );
    }

    // Get contact before deleting
    const contact = await prisma.contact.findFirst({
      where: { id, companyId: company.id },
    });

    if (!contact) {
      return apiResponse.error(new Error("Contact not found"));
    }

    await prisma.contact.delete({ where: { id } });

    // Create audit log
    await logDelete("Contact", contact, session.user.id, company.id);

    return apiResponse.success({ message: "ลบสำเร็จ" });
  },
  { permission: "contacts:delete" }
);
