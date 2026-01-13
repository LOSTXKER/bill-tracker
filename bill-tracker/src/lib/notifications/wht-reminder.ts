/**
 * WHT & Document Reminder Notifications
 * ส่งแจ้งเตือนผ่าน LINE เมื่อ:
 * 1. ใกล้กำหนดนำส่ง WHT
 * 2. เอกสารค้างนานเกินกำหนด
 */

import { prisma } from "@/lib/db";
import { sendTextMessage } from "./line-messaging";

interface WhtReminderResult {
  success: boolean;
  companiesNotified: number;
  errors: string[];
}

interface PendingDocsSummary {
  pendingTaxInvoice: number;
  pendingWhtIssue: number;
  pendingWhtCert: number;
  totalWhtToPay: number;
  oldestPendingDays: number;
}

/**
 * ส่งแจ้งเตือน WHT Deadline ให้ทุกบริษัทที่เปิดใช้งาน
 */
export async function sendWhtDeadlineReminders(): Promise<WhtReminderResult> {
  const result: WhtReminderResult = {
    success: true,
    companiesNotified: 0,
    errors: [],
  };

  try {
    // Get all companies with WHT reminder enabled
    const companies = await prisma.company.findMany({
      where: {
        whtReminderEnabled: true,
        lineNotifyEnabled: true,
        lineChannelAccessToken: { not: null },
      },
      select: {
        id: true,
        code: true,
        name: true,
        whtDeadlineDay: true,
        whtReminderDays: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const company of companies) {
      try {
        // Calculate deadline (next month's deadline day)
        const deadlineDate = new Date(currentYear, currentMonth + 1, company.whtDeadlineDay);
        const daysUntilDeadline = Math.ceil(
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if we should send reminder
        if (daysUntilDeadline <= company.whtReminderDays && daysUntilDeadline >= 0) {
          // Get WHT summary for current month
          const startOfMonth = new Date(currentYear, currentMonth, 1);
          const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

          const expensesWithWht = await prisma.expense.aggregate({
            where: {
              companyId: company.id,
              deletedAt: null,
              isWht: true,
              billDate: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { whtAmount: true },
            _count: true,
          });

          const totalWhtAmount = Number(expensesWithWht._sum.whtAmount) || 0;
          const whtCount = expensesWithWht._count || 0;

          if (totalWhtAmount > 0) {
            // Send LINE notification
            const message = formatWhtReminderMessage({
              companyName: company.name,
              deadlineDate,
              daysUntilDeadline,
              totalWhtAmount,
              whtCount,
              isOverdue: daysUntilDeadline < 0,
            });

            await sendTextMessage(
              company.lineChannelAccessToken!,
              company.lineGroupId!,
              message
            );

            result.companiesNotified++;
          }
        }
      } catch (error) {
        result.errors.push(`Company ${company.code}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Global error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * ส่งแจ้งเตือนเอกสารที่ค้างนาน
 */
export async function sendPendingDocsReminders(): Promise<WhtReminderResult> {
  const result: WhtReminderResult = {
    success: true,
    companiesNotified: 0,
    errors: [],
  };

  try {
    // Get all companies with document reminder enabled
    const companies = await prisma.company.findMany({
      where: {
        docReminderEnabled: true,
        lineNotifyEnabled: true,
        lineChannelAccessToken: { not: null },
      },
      select: {
        id: true,
        code: true,
        name: true,
        docReminderDays: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    const now = new Date();

    for (const company of companies) {
      try {
        const reminderCutoff = new Date(now);
        reminderCutoff.setDate(reminderCutoff.getDate() - company.docReminderDays);

        // Get pending documents summary
        const summary = await getPendingDocsSummary(company.id, reminderCutoff);

        if (summary.pendingTaxInvoice > 0 || summary.pendingWhtIssue > 0 || summary.pendingWhtCert > 0) {
          const message = formatPendingDocsMessage({
            companyName: company.name,
            summary,
            reminderDays: company.docReminderDays,
          });

          await sendTextMessage(
            company.lineChannelAccessToken!,
            company.lineGroupId!,
            message
          );

          result.companiesNotified++;
        }
      } catch (error) {
        result.errors.push(`Company ${company.code}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Global error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Get pending documents summary for a company
 */
async function getPendingDocsSummary(companyId: string, cutoffDate: Date): Promise<PendingDocsSummary> {
  // Pending tax invoices
  const pendingTaxInvoice = await prisma.expense.count({
    where: {
      companyId,
      deletedAt: null,
      workflowStatus: { in: ["PAID", "WAITING_TAX_INVOICE"] },
      hasTaxInvoice: false,
      billDate: { lte: cutoffDate },
    },
  });

  // Pending WHT issue (we need to issue)
  const pendingWhtIssue = await prisma.expense.count({
    where: {
      companyId,
      deletedAt: null,
      isWht: true,
      workflowStatus: { in: ["TAX_INVOICE_RECEIVED", "WHT_PENDING_ISSUE"] },
      hasWhtCert: false,
      billDate: { lte: cutoffDate },
    },
  });

  // Pending WHT cert from customers
  const pendingWhtCert = await prisma.income.count({
    where: {
      companyId,
      deletedAt: null,
      isWhtDeducted: true,
      workflowStatus: "WHT_PENDING_CERT",
      hasWhtCert: false,
      receiveDate: { lte: cutoffDate },
    },
  });

  // Total WHT to pay
  const whtAgg = await prisma.expense.aggregate({
    where: {
      companyId,
      deletedAt: null,
      isWht: true,
      billDate: { lte: cutoffDate },
    },
    _sum: { whtAmount: true },
  });

  // Find oldest pending document
  const oldestExpense = await prisma.expense.findFirst({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { hasTaxInvoice: false, workflowStatus: { in: ["PAID", "WAITING_TAX_INVOICE"] } },
        { isWht: true, hasWhtCert: false },
      ],
    },
    orderBy: { billDate: "asc" },
    select: { billDate: true },
  });

  const oldestIncome = await prisma.income.findFirst({
    where: {
      companyId,
      deletedAt: null,
      isWhtDeducted: true,
      hasWhtCert: false,
    },
    orderBy: { receiveDate: "asc" },
    select: { receiveDate: true },
  });

  let oldestPendingDays = 0;
  const now = new Date();
  
  if (oldestExpense?.billDate) {
    oldestPendingDays = Math.max(
      oldestPendingDays,
      Math.ceil((now.getTime() - oldestExpense.billDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  }
  
  if (oldestIncome?.receiveDate) {
    oldestPendingDays = Math.max(
      oldestPendingDays,
      Math.ceil((now.getTime() - oldestIncome.receiveDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  return {
    pendingTaxInvoice,
    pendingWhtIssue,
    pendingWhtCert,
    totalWhtToPay: Number(whtAgg._sum.whtAmount) || 0,
    oldestPendingDays,
  };
}

/**
 * Format WHT reminder message
 */
function formatWhtReminderMessage(params: {
  companyName: string;
  deadlineDate: Date;
  daysUntilDeadline: number;
  totalWhtAmount: number;
  whtCount: number;
  isOverdue: boolean;
}): string {
  const { companyName, deadlineDate, daysUntilDeadline, totalWhtAmount, whtCount, isOverdue } = params;
  
  const formattedDate = deadlineDate.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedAmount = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(totalWhtAmount);

  if (isOverdue) {
    return `🚨 แจ้งเตือน WHT - ${companyName}

⚠️ เลยกำหนดนำส่ง WHT แล้ว ${Math.abs(daysUntilDeadline)} วัน!
📅 กำหนดเดิม: ${formattedDate}
💰 ยอดที่ต้องนำส่ง: ${formattedAmount}
📄 จำนวน: ${whtCount} รายการ

กรุณาดำเนินการนำส่งโดยด่วน!`;
  }

  return `📢 แจ้งเตือน WHT - ${companyName}

⏰ ใกล้กำหนดนำส่ง WHT อีก ${daysUntilDeadline} วัน
📅 กำหนดนำส่ง: ${formattedDate}
💰 ยอดที่ต้องนำส่ง: ${formattedAmount}
📄 จำนวน: ${whtCount} รายการ

อย่าลืมเตรียมเอกสารให้พร้อม!`;
}

/**
 * Format pending documents message
 */
function formatPendingDocsMessage(params: {
  companyName: string;
  summary: PendingDocsSummary;
  reminderDays: number;
}): string {
  const { companyName, summary, reminderDays } = params;

  const lines = [`📋 เอกสารค้าง - ${companyName}`, ""];
  
  if (summary.pendingTaxInvoice > 0) {
    lines.push(`🧾 รอใบกำกับภาษี: ${summary.pendingTaxInvoice} รายการ`);
  }
  
  if (summary.pendingWhtIssue > 0) {
    lines.push(`📝 รอออกใบ 50 ทวิ: ${summary.pendingWhtIssue} รายการ`);
  }
  
  if (summary.pendingWhtCert > 0) {
    lines.push(`📩 รอใบ 50 ทวิจากลูกค้า: ${summary.pendingWhtCert} รายการ`);
  }

  lines.push("");
  lines.push(`⏱️ ค้างนานสุด: ${summary.oldestPendingDays} วัน`);
  lines.push(`(แจ้งเตือนเอกสารที่ค้างเกิน ${reminderDays} วัน)`);

  return lines.join("\n");
}
