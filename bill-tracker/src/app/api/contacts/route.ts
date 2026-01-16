import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate, logUpdate, logDelete } from "@/lib/audit/logger";

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
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
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

    const contact = await prisma.contact.create({
      data: {
        id: crypto.randomUUID(),
        companyId: company.id,
        peakCode: body.peakCode || null,
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
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await logCreate("Contact", contact, session.user.id, company.id);

    return apiResponse.created({ contact });
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

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        peakCode: data.peakCode ?? existing.peakCode,
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
      },
    });

    // Create audit log
    await logUpdate("Contact", contact.id, existing, contact, session.user.id, company.id);

    return apiResponse.success({ contact });
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

    // Check if used in transactions (only count non-deleted items)
    const [expenseCount, incomeCount] = await Promise.all([
      prisma.expense.count({ where: { contactId: id, deletedAt: null } }),
      prisma.income.count({ where: { contactId: id, deletedAt: null } }),
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
