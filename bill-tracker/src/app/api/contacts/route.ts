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
        companyId: company.id,
        name: body.name,
        taxId: body.taxId,
        address: body.address,
        phone: body.phone,
        email: body.email,
        bankAccount: body.bankAccount,
        bankName: body.bankName,
        creditLimit: body.creditLimit,
        paymentTerms: body.paymentTerms,
        notes: body.notes,
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
        name: data.name,
        taxId: data.taxId,
        address: data.address,
        phone: data.phone,
        email: data.email,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
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

    // Check if used in transactions
    const [expenseCount, incomeCount] = await Promise.all([
      prisma.expense.count({ where: { contactId: id } }),
      prisma.income.count({ where: { contactId: id } }),
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
