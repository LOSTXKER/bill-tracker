import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logCreate, logUpdate, logDelete } from "@/lib/audit/logger";
import {
  getMappings,
  createMapping,
  updateMapping,
  deleteMapping,
} from "@/lib/ai/vendor-mapping";

/**
 * GET /api/vendor-mappings?company=ABC&search=...&type=EXPENSE
 * List vendor mappings with optional search and type filter
 */
export const GET = withCompanyAccess(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const transactionType = searchParams.get("type") as "EXPENSE" | "INCOME" | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { mappings, total } = await getMappings(company.id, {
      search,
      transactionType: transactionType || undefined,
      limit,
      offset,
    });

    return apiResponse.success({
      mappings: mappings.map((m) => ({
        id: m.id,
        transactionType: m.transactionType,
        vendorName: m.vendorName,
        vendorTaxId: m.vendorTaxId,
        namePattern: m.namePattern,
        contactId: m.contactId,
        contactName: m.contact?.name,
        accountId: m.accountId,
        accountName: m.account?.name,
        defaultVatRate: m.defaultVatRate,
        paymentMethod: m.paymentMethod,
        descriptionTemplate: m.descriptionTemplate,
        useCount: m.useCount,
        lastUsedAt: m.lastUsedAt,
        learnSource: m.learnSource,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + mappings.length < total,
      },
    });
  },
  { permission: "settings:read" }
);

/**
 * POST /api/vendor-mappings
 * Create a new vendor mapping
 */
export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();

    const {
      transactionType,
      vendorName,
      vendorTaxId,
      namePattern,
      contactId,
      accountId,
      defaultVatRate,
      paymentMethod,
      descriptionTemplate,
      learnSource,
    } = body;

    // Validate transaction type
    if (!transactionType || !["EXPENSE", "INCOME"].includes(transactionType)) {
      return apiResponse.error(
        new Error("transactionType is required (EXPENSE or INCOME)")
      );
    }

    // Validate at least one matching criteria
    if (!vendorName && !vendorTaxId && !namePattern) {
      return apiResponse.error(
        new Error("ต้องระบุอย่างน้อยหนึ่งเกณฑ์: ชื่อร้าน, เลขผู้เสียภาษี, หรือ Pattern")
      );
    }

    const mapping = await createMapping(
      company.id,
      transactionType as "EXPENSE" | "INCOME",
      {
        vendorName,
        vendorTaxId,
        namePattern,
        contactId,
        accountId,
        defaultVatRate,
        paymentMethod,
        descriptionTemplate,
        learnSource: learnSource || "MANUAL",
      }
    );

    // Audit log
    await logCreate("VendorMapping", mapping, session.user.id, company.id);

    return apiResponse.created({
      mapping: {
        id: mapping.id,
        transactionType: mapping.transactionType,
        vendorName: mapping.vendorName,
        vendorTaxId: mapping.vendorTaxId,
        namePattern: mapping.namePattern,
        contactId: mapping.contactId,
        accountId: mapping.accountId,
        defaultVatRate: mapping.defaultVatRate,
        paymentMethod: mapping.paymentMethod,
        descriptionTemplate: mapping.descriptionTemplate,
      },
    });
  },
  {
    permission: "settings:update",
    rateLimit: { maxRequests: 30, windowMs: 60000 },
  }
);

/**
 * PATCH /api/vendor-mappings
 * Update a vendor mapping
 */
export const PATCH = withCompanyAccess(
  async (request, { company, session }) => {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return apiResponse.error(new Error("Mapping ID is required"));
    }

    // Only allow updating these specific fields (filter out companyCode, transactionType, etc.)
    const allowedFields = {
      vendorName: body.vendorName,
      vendorTaxId: body.vendorTaxId,
      namePattern: body.namePattern,
      contactId: body.contactId,
      accountId: body.accountId,
      defaultVatRate: body.defaultVatRate,
      paymentMethod: body.paymentMethod,
      descriptionTemplate: body.descriptionTemplate,
    };

    // Remove undefined values
    const data = Object.fromEntries(
      Object.entries(allowedFields).filter(([, v]) => v !== undefined)
    );

    const updated = await updateMapping(id, company.id, data);

    if (!updated) {
      return apiResponse.error(new Error("Mapping not found"));
    }

    // Audit log
    await logUpdate("VendorMapping", id, {}, updated, session.user.id, company.id);

    return apiResponse.success({
      mapping: {
        id: updated.id,
        transactionType: updated.transactionType,
        vendorName: updated.vendorName,
        vendorTaxId: updated.vendorTaxId,
        namePattern: updated.namePattern,
        contactId: updated.contactId,
        accountId: updated.accountId,
        defaultVatRate: updated.defaultVatRate,
        paymentMethod: updated.paymentMethod,
        descriptionTemplate: updated.descriptionTemplate,
      },
    });
  },
  { permission: "settings:update" }
);

/**
 * DELETE /api/vendor-mappings?id=...&company=ABC
 * Delete a vendor mapping
 */
export const DELETE = withCompanyAccess(
  async (request, { company, session }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiResponse.error(new Error("Mapping ID is required"));
    }

    const deleted = await deleteMapping(id, company.id);

    if (!deleted) {
      return apiResponse.error(new Error("Mapping not found"));
    }

    // Audit log
    await logDelete("VendorMapping", { id }, session.user.id, company.id);

    return apiResponse.success({ message: "ลบสำเร็จ" });
  },
  { permission: "settings:update" }
);
