import { withCompanyAccess } from "./with-company-access";
import { apiResponse } from "./response";
import { getBaseIncludes } from "./transaction-includes";
import type { TransactionRouteConfig } from "./transaction-types";

export function createListHandler<TModel>(config: TransactionRouteConfig<TModel, unknown, unknown>) {
  return withCompanyAccess(
    async (request, { company, session }) => {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const workflowStatus = searchParams.get("workflowStatus");
      const approvalStatus = searchParams.get("approvalStatus");
      const tab = searchParams.get("tab");
      const category = searchParams.get("category");
      const contact = searchParams.get("contact");
      const search = searchParams.get("search");
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");
      const includeDeleted = searchParams.get("includeDeleted") === "true";
      const includeReimbursements = searchParams.get("includeReimbursements") === "true";
      const onlyMine = searchParams.get("onlyMine") === "true";
      const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
      const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20") || 20), 100);
      const sortBy = searchParams.get("sortBy") || "createdAt";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

      const where: Record<string, unknown> = {
        companyId: company.id,
        ...(status && { [config.fields.statusField]: status }),
        ...(workflowStatus && { workflowStatus }),
        ...(approvalStatus && { approvalStatus }),
        ...(category && { accountId: category }),
        ...(contact && { contactId: contact }),
        ...(!includeDeleted && { deletedAt: null }),
        ...(onlyMine && { createdBy: session.user.id }),
      };

      // Tab-based filtering
      if (tab === "draft") {
        where.workflowStatus = "DRAFT";
        where.createdBy = session.user.id;
      } else if (tab === "pending") {
        where.approvalStatus = "PENDING";
      } else if (tab === "rejected") {
        where.approvalStatus = "REJECTED";
        where.createdBy = session.user.id;
      } else if (tab === "active") {
        where.workflowStatus = { notIn: ["DRAFT", "PENDING_APPROVAL"] };
        where.OR = [
          { approvalStatus: "NOT_REQUIRED" },
          { approvalStatus: "APPROVED" },
        ];
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (dateFrom) {
          const d = new Date(dateFrom);
          if (!isNaN(d.getTime())) dateFilter.gte = d;
        }
        if (dateTo) {
          const d = new Date(dateTo);
          if (!isNaN(d.getTime())) dateFilter.lte = d;
        }
        if (Object.keys(dateFilter).length > 0) {
          where[config.fields.dateField] = dateFilter;
        }
      }

      // Search filter (truncate to prevent abuse)
      const sanitizedSearch = search?.trim().substring(0, 100);
      if (sanitizedSearch) {
        if (where.OR) {
          const existingOr = where.OR;
          delete where.OR;
          where.AND = [
            { OR: existingOr },
            { OR: [{ description: { contains: sanitizedSearch, mode: "insensitive" } }] },
          ];
        } else {
          where.OR = [
            { description: { contains: sanitizedSearch, mode: "insensitive" } },
          ];
        }
      }

      // For expenses, filter out reimbursements that are not PAID
      if (config.modelName === "expense" && !includeReimbursements && !tab) {
        if (!where.OR) {
          where.OR = [
            { isReimbursement: false },
            { isReimbursement: true, reimbursementStatus: "PAID" },
          ];
        }
      }

      const includes = getBaseIncludes(config.modelName, { includeSubmitter: true });

      const [items, total] = await Promise.all([
        config.prismaModel.findMany({
          where,
          include: includes,
          orderBy: [
            { [sortBy]: sortOrder },
            ...(sortBy !== "createdAt" ? [{ createdAt: "desc" }] : []),
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        config.prismaModel.count({ where }),
      ]);

      return apiResponse.success({
        [config.modelName + "s"]: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
    { permission: config.permissions.read }
  );
}
