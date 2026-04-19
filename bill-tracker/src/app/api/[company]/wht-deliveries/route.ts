/**
 * WHT Deliveries API
 * จัดการรายการที่เกี่ยวข้องกับใบหัก ณ ที่จ่าย 4 stage:
 *   stage=pending-issue   → expense ที่ isWht แต่ยังไม่ได้ออกใบ 50 ทวิ (hasWhtCert=false)
 *   stage=pending-send    → expense ที่ออกใบ 50 ทวิแล้วแต่ยังไม่ส่งให้ vendor (default)
 *   stage=incoming-wait   → income ที่ลูกค้าหัก ณ ที่จ่ายไว้แต่ยังไม่ส่งใบ 50 ทวิ มาให้
 *   stage=recently-done   → expense/income ที่เพิ่งทำสำเร็จในช่วง 30 วันล่าสุด (รองรับ undo)
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { DocumentEventType } from "@prisma/client";
import { getDeliveryMethod } from "@/lib/constants/delivery-methods";
import { reimbursementFilter, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";

type Stage = "pending-issue" | "pending-send" | "incoming-wait" | "recently-done";

function parseStage(value: string | null): Stage {
  if (
    value === "pending-issue" ||
    value === "incoming-wait" ||
    value === "recently-done"
  )
    return value;
  return "pending-send";
}

// =============================================================================
// GET: ดึงรายการ WHT ตาม stage
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { company }) => {
    const { searchParams } = new URL(req.url);
    const stage = parseStage(searchParams.get("stage"));
    const groupBy = searchParams.get("groupBy") || "contact";
    const days = Math.min(
      Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1),
      365
    );

    if (stage === "incoming-wait") {
      return getIncomingWaitData(company.id, groupBy);
    }

    if (stage === "recently-done") {
      return getRecentlyDoneData(company.id, days);
    }

    return getExpenseStageData(company.id, stage, groupBy);
  },
  { permission: "expenses:read" }
);

async function getExpenseStageData(
  companyId: string,
  stage: Exclude<Stage, "incoming-wait">,
  groupBy: string
) {
  const stageWhere =
    stage === "pending-issue"
      ? { hasWhtCert: false }
      : { hasWhtCert: true, whtCertSentAt: null };

  const pendingExpenses = await prisma.expense.findMany({
    where: {
      ...reimbursementFilter,
      companyId,
      deletedAt: null,
      isWht: true,
      workflowStatus: "ACTIVE",
      ...stageWhere,
    },
    select: {
      id: true,
      billDate: true,
      description: true,
      amount: true,
      whtAmount: true,
      whtRate: true,
      whtCertUrls: true,
      contactId: true,
      whtDeliveryMethod: true,
      whtDeliveryEmail: true,
      whtDeliveryNotes: true,
      Contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          preferredDeliveryMethod: true,
          deliveryEmail: true,
          deliveryNotes: true,
        },
      },
    },
    orderBy: [{ Contact: { name: "asc" } }, { billDate: "desc" }],
  });

  const expenses = pendingExpenses.map((e) => ({ ...e, contact: e.Contact }));

  if (groupBy === "contact") {
    const grouped = expenses.reduce((acc, expense) => {
      const contactId = expense.contactId || "no-contact";
      const contactName = expense.contact?.name || "ไม่ระบุผู้ติดต่อ";

      const expenseDeliveryMethod =
        expense.whtDeliveryMethod || expense.contact?.preferredDeliveryMethod || null;
      const expenseDeliveryEmail =
        expense.whtDeliveryMethod === "EMAIL"
          ? expense.whtDeliveryEmail || expense.contact?.deliveryEmail || expense.contact?.email
          : expense.contact?.deliveryEmail || expense.contact?.email;
      const expenseDeliveryNotes =
        expense.whtDeliveryNotes || expense.contact?.deliveryNotes || null;

      if (!acc[contactId]) {
        acc[contactId] = {
          contactId,
          contactName,
          contact: expense.contact,
          deliveryMethod: expenseDeliveryMethod,
          deliveryEmail: expenseDeliveryEmail || null,
          deliveryNotes: expenseDeliveryNotes,
          mixedDeliveryMethods: false,
          expenses: [],
          totalAmount: 0,
          totalWhtAmount: 0,
          count: 0,
        };
      } else {
        // Detect if multiple expenses in this group have differing delivery methods
        const currentMethod = acc[contactId].deliveryMethod;
        if (currentMethod !== expenseDeliveryMethod) {
          acc[contactId].mixedDeliveryMethods = true;
        }
      }

      acc[contactId].expenses.push({
        id: expense.id,
        billDate: expense.billDate,
        description: expense.description,
        amount: expense.amount,
        whtAmount: expense.whtAmount,
        whtRate: expense.whtRate,
        whtCertUrls: expense.whtCertUrls,
        whtDeliveryMethod: expense.whtDeliveryMethod,
        whtDeliveryEmail: expense.whtDeliveryEmail,
        whtDeliveryNotes: expense.whtDeliveryNotes,
      });
      acc[contactId].totalAmount += Number(expense.amount) || 0;
      acc[contactId].totalWhtAmount += Number(expense.whtAmount) || 0;
      acc[contactId].count += 1;

      return acc;
    }, {} as Record<string, any>);

    const groupedArray = Object.values(grouped).sort((a, b) =>
      a.contactName.localeCompare(b.contactName, "th")
    );

    return apiResponse.success({
      stage,
      kind: "expense",
      groups: groupedArray,
      totalPending: expenses.length,
      totalContacts: groupedArray.length,
    });
  }

  return apiResponse.success({
    stage,
    kind: "expense",
    expenses,
    totalPending: expenses.length,
  });
}

async function getIncomingWaitData(companyId: string, groupBy: string) {
  const incomes = await prisma.income.findMany({
    where: {
      ...buildIncomeBaseWhere(companyId),
      workflowStatus: "ACTIVE",
      isWhtDeducted: true,
      hasWhtCert: false,
    },
    select: {
      id: true,
      receiveDate: true,
      source: true,
      invoiceNumber: true,
      amount: true,
      whtAmount: true,
      whtRate: true,
      contactId: true,
      whtCertRemindCount: true,
      whtCertRemindedAt: true,
      Contact: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: [{ Contact: { name: "asc" } }, { receiveDate: "desc" }],
  });

  if (groupBy === "contact") {
    const grouped = incomes.reduce((acc, income) => {
      const contactId = income.contactId || "no-contact";
      const contactName = income.Contact?.name || "ไม่ระบุลูกค้า";

      if (!acc[contactId]) {
        acc[contactId] = {
          contactId,
          contactName,
          contact: income.Contact,
          incomes: [],
          totalAmount: 0,
          totalWhtAmount: 0,
          count: 0,
        };
      }

      acc[contactId].incomes.push({
        id: income.id,
        receiveDate: income.receiveDate,
        source: income.source,
        invoiceNumber: income.invoiceNumber,
        amount: income.amount,
        whtAmount: income.whtAmount,
        whtRate: income.whtRate,
        whtCertRemindCount: income.whtCertRemindCount,
        whtCertRemindedAt: income.whtCertRemindedAt,
      });
      acc[contactId].totalAmount += Number(income.amount) || 0;
      acc[contactId].totalWhtAmount += Number(income.whtAmount) || 0;
      acc[contactId].count += 1;

      return acc;
    }, {} as Record<string, any>);

    const groupedArray = Object.values(grouped).sort((a, b) =>
      a.contactName.localeCompare(b.contactName, "th")
    );

    return apiResponse.success({
      stage: "incoming-wait" as const,
      kind: "income",
      groups: groupedArray,
      totalPending: incomes.length,
      totalContacts: groupedArray.length,
    });
  }

  return apiResponse.success({
    stage: "incoming-wait" as const,
    kind: "income",
    incomes,
    totalPending: incomes.length,
  });
}

// =============================================================================
// stage=recently-done: รายการที่เพิ่งทำสำเร็จในช่วง N วันล่าสุด
// รองรับ undo ผ่าน /document-workflow
// =============================================================================

async function getRecentlyDoneData(companyId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [issuedExpenses, sentExpenses, receivedIncomes] = await Promise.all([
    // Expense ที่เพิ่งออกใบ 50 ทวิ (แต่ยังไม่ส่ง) — รองรับ undo_issue_wht
    prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId,
        deletedAt: null,
        isWht: true,
        hasWhtCert: true,
        whtCertSentAt: null,
        whtCertIssuedAt: { gte: since },
      },
      select: {
        id: true,
        billDate: true,
        description: true,
        whtAmount: true,
        whtRate: true,
        whtCertIssuedAt: true,
        Contact: { select: { id: true, name: true } },
      },
      orderBy: { whtCertIssuedAt: "desc" },
      take: 100,
    }),
    // Expense ที่เพิ่งถูก mark ส่งให้ vendor — รองรับ undo_send_wht
    prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId,
        deletedAt: null,
        isWht: true,
        hasWhtCert: true,
        whtCertSentAt: { gte: since },
      },
      select: {
        id: true,
        billDate: true,
        description: true,
        whtAmount: true,
        whtRate: true,
        whtCertSentAt: true,
        whtDeliveryMethod: true,
        Contact: {
          select: { id: true, name: true, preferredDeliveryMethod: true },
        },
      },
      orderBy: { whtCertSentAt: "desc" },
      take: 100,
    }),
    // Income ที่เพิ่งบันทึกว่าได้รับใบ 50 ทวิ — รองรับ undo_receive_wht
    prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(companyId),
        isWhtDeducted: true,
        hasWhtCert: true,
        whtCertReceivedAt: { gte: since },
      },
      select: {
        id: true,
        receiveDate: true,
        source: true,
        invoiceNumber: true,
        whtAmount: true,
        whtRate: true,
        whtCertReceivedAt: true,
        Contact: { select: { id: true, name: true } },
      },
      orderBy: { whtCertReceivedAt: "desc" },
      take: 100,
    }),
  ]);

  type RecentItem =
    | {
        kind: "expense-issued";
        id: string;
        date: Date;
        eventDate: Date;
        contactId: string | null;
        contactName: string;
        description: string | null;
        whtAmount: number;
        whtRate: number | null;
        deliveryMethod?: string | null;
      }
    | {
        kind: "expense-sent";
        id: string;
        date: Date;
        eventDate: Date;
        contactId: string | null;
        contactName: string;
        description: string | null;
        whtAmount: number;
        whtRate: number | null;
        deliveryMethod?: string | null;
      }
    | {
        kind: "income-received";
        id: string;
        date: Date;
        eventDate: Date;
        contactId: string | null;
        contactName: string;
        description: string | null;
        whtAmount: number;
        whtRate: number | null;
      };

  const items: RecentItem[] = [
    ...issuedExpenses.map(
      (e): RecentItem => ({
        kind: "expense-issued",
        id: e.id,
        date: e.billDate,
        eventDate: e.whtCertIssuedAt!,
        contactId: e.Contact?.id ?? null,
        contactName: e.Contact?.name ?? "ไม่ระบุผู้ติดต่อ",
        description: e.description,
        whtAmount: Number(e.whtAmount) || 0,
        whtRate: e.whtRate ? Number(e.whtRate) : null,
      })
    ),
    ...sentExpenses.map(
      (e): RecentItem => ({
        kind: "expense-sent",
        id: e.id,
        date: e.billDate,
        eventDate: e.whtCertSentAt!,
        contactId: e.Contact?.id ?? null,
        contactName: e.Contact?.name ?? "ไม่ระบุผู้ติดต่อ",
        description: e.description,
        whtAmount: Number(e.whtAmount) || 0,
        whtRate: e.whtRate ? Number(e.whtRate) : null,
        deliveryMethod:
          e.whtDeliveryMethod || e.Contact?.preferredDeliveryMethod || null,
      })
    ),
    ...receivedIncomes.map(
      (i): RecentItem => ({
        kind: "income-received",
        id: i.id,
        date: i.receiveDate,
        eventDate: i.whtCertReceivedAt!,
        contactId: i.Contact?.id ?? null,
        contactName: i.Contact?.name ?? "ไม่ระบุลูกค้า",
        description: i.source || i.invoiceNumber,
        whtAmount: Number(i.whtAmount) || 0,
        whtRate: i.whtRate ? Number(i.whtRate) : null,
      })
    ),
  ].sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  return apiResponse.success({
    stage: "recently-done" as const,
    items,
    totalPending: items.length,
    days,
  });
}

// =============================================================================
// POST: Mark WHT as sent (only for stage=pending-send)
// =============================================================================

export const POST = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const {
      expenseIds, // Array of expense IDs to mark as sent
      deliveryMethod, // 'EMAIL' | 'PHYSICAL' | 'LINE' | 'PICKUP' | 'GOOGLE_DRIVE'
      notes,
    } = body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return apiResponse.badRequest("expenseIds is required and must be a non-empty array");
    }

    if (!deliveryMethod) {
      return apiResponse.badRequest("deliveryMethod is required");
    }

    const now = new Date();
    const eventType: DocumentEventType = "WHT_CERT_SENT";

    const result = await prisma.$transaction(async (tx) => {
      const expenses = await tx.expense.findMany({
        where: {
          id: { in: expenseIds },
          companyId: company.id,
          deletedAt: null,
          isWht: true,
          workflowStatus: "ACTIVE",
          hasWhtCert: true,
          whtCertSentAt: null,
        },
      });

      if (expenses.length !== expenseIds.length) {
        throw new Error("บางรายการไม่พบหรือไม่อยู่ในสถานะที่สามารถส่งได้");
      }

      await tx.expense.updateMany({
        where: { id: { in: expenseIds } },
        data: { whtCertSentAt: now },
      });

      const methodInfo = getDeliveryMethod(deliveryMethod);
      await tx.documentEvent.createMany({
        data: expenses.map((expense) => ({
          id: crypto.randomUUID(),
          expenseId: expense.id,
          eventType,
          eventDate: now,
          fromStatus: expense.workflowStatus,
          toStatus: expense.workflowStatus,
          notes: notes || `ส่ง WHT ทาง ${methodInfo?.label || deliveryMethod}`,
          metadata: { deliveryMethod },
          createdBy: session.user.id,
        })),
      });

      return {
        updatedCount: expenses.length,
        expenses: expenses.map((e) => e.id),
      };
    });

    return apiResponse.success({
      message: `อัปเดตสถานะ ${result.updatedCount} รายการสำเร็จ`,
      ...result,
    });
  },
  { permission: "expenses:change-status" }
);
