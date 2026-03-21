import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit/logger";

interface AccountingRowInput {
  date: string;
  invoiceNumber?: string;
  vendorName: string;
  taxId?: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface MatchInput {
  expenseId?: string;
  incomeId?: string;
  systemAmount: number;
  systemVat: number;
  systemVendor: string;
  acctDate: string;
  acctInvoice?: string;
  acctVendor: string;
  acctTaxId?: string;
  acctBase: number;
  acctVat: number;
  acctTotal: number;
  matchType: string;
  confidence?: number;
  aiReason?: string;
  amountDiff?: number;
  notes?: string;
  isPayOnBehalf?: boolean;
  payOnBehalfFrom?: string;
  status?: string;
}

interface CreateSessionBody {
  month: number;
  year: number;
  type: "expense" | "income";
  sourceFileName?: string;
  sourceFileUrl?: string;
  notes?: string;
  matches: MatchInput[];
  accountingRows?: AccountingRowInput[];
  totalSystemAmount: number;
  totalAccountAmount: number;
  unmatchedSystemCount: number;
  unmatchedAccountCount: number;
}

export const POST = withCompanyAccessFromParams(
  async (request, { session, company }) => {
    const body = (await request.json()) as CreateSessionBody;

    if (!body.month || !body.year || !body.type) {
      throw ApiErrors.badRequest("month, year, type are required");
    }

    const matchedCount = (body.matches ?? []).filter(
      (m) => m.expenseId || m.incomeId
    ).length;

    const result = await prisma.$transaction(async (tx) => {
      const sess = await tx.reconcileSession.upsert({
        where: {
          companyId_month_year_type: {
            companyId: company.id,
            month: body.month,
            year: body.year,
            type: body.type,
          },
        },
        create: {
          companyId: company.id,
          month: body.month,
          year: body.year,
          type: body.type,
          sourceFileName: body.sourceFileName,
          sourceFileUrl: body.sourceFileUrl,
          notes: body.notes,
          matchedCount,
          unmatchedSystemCount: body.unmatchedSystemCount ?? 0,
          unmatchedAccountCount: body.unmatchedAccountCount ?? 0,
          totalSystemAmount: body.totalSystemAmount ?? 0,
          totalAccountAmount: body.totalAccountAmount ?? 0,
          createdBy: session.user.id,
          Matches: {
            create: (body.matches ?? []).map(toMatchCreate),
          },
        },
        update: {
          sourceFileName: body.sourceFileName,
          sourceFileUrl: body.sourceFileUrl,
          notes: body.notes,
          matchedCount,
          unmatchedSystemCount: body.unmatchedSystemCount ?? 0,
          unmatchedAccountCount: body.unmatchedAccountCount ?? 0,
          totalSystemAmount: body.totalSystemAmount ?? 0,
          totalAccountAmount: body.totalAccountAmount ?? 0,
          status: "IN_PROGRESS",
          completedAt: null,
          completedBy: null,
          Matches: {
            deleteMany: {},
            create: (body.matches ?? []).map(toMatchCreate),
          },
        },
      });

      if (body.accountingRows && body.accountingRows.length > 0) {
        await tx.reconcileAccountingRow.deleteMany({
          where: { sessionId: sess.id },
        });
        await tx.reconcileAccountingRow.createMany({
          data: body.accountingRows.map((r, i) => ({
            sessionId: sess.id,
            rowIndex: i,
            date: r.date,
            invoiceNumber: r.invoiceNumber || null,
            vendorName: r.vendorName,
            taxId: r.taxId || null,
            baseAmount: r.baseAmount,
            vatAmount: r.vatAmount,
            totalAmount: r.totalAmount,
          })),
        });
      }

      return sess;
    });

    await createAuditLog({
      userId: session.user.id,
      companyId: company.id,
      action: "CREATE",
      entityType: "ReconcileSession",
      entityId: result.id,
      changes: {
        month: body.month,
        year: body.year,
        type: body.type,
        matchedCount,
      },
      description: `บันทึกผลเทียบรายงาน ${body.month}/${body.year} (${body.type}) — จับคู่ได้ ${matchedCount} รายการ`,
    });

    return apiResponse.created(result);
  },
  { permission: "reports:read" }
);

export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;

    const sessions = await prisma.reconcileSession.findMany({
      where: {
        companyId: company.id,
        ...(year && { year }),
        ...(month && { month }),
        ...(type && { type }),
        ...(status && { status: status as any }),
      },
      include: {
        _count: { select: { Matches: true, AccountingRows: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
    });

    return apiResponse.success(sessions);
  },
  { permission: "reports:read" }
);

function toMatchCreate(m: MatchInput) {
  return {
    expenseId: m.expenseId || null,
    incomeId: m.incomeId || null,
    systemAmount: m.systemAmount,
    systemVat: m.systemVat,
    systemVendor: m.systemVendor,
    acctDate: m.acctDate,
    acctInvoice: m.acctInvoice || null,
    acctVendor: m.acctVendor,
    acctTaxId: m.acctTaxId || null,
    acctBase: m.acctBase,
    acctVat: m.acctVat,
    acctTotal: m.acctTotal,
    matchType: m.matchType,
    confidence: m.confidence ?? null,
    aiReason: m.aiReason || null,
    amountDiff: m.amountDiff ?? null,
    notes: m.notes || null,
    isPayOnBehalf: m.isPayOnBehalf ?? false,
    payOnBehalfFrom: m.payOnBehalfFrom || null,
    status: m.status ?? "pending",
  };
}
