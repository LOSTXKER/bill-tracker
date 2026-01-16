/**
 * WHT Summary API
 * สรุป WHT ที่ต้องนำส่ง และ deadline
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

// =============================================================================
// GET: ดึงสรุป WHT
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Get company settings
    const companySettings = await prisma.company.findUnique({
      where: { id: company.id },
      select: {
        whtDeadlineDay: true,
        whtReminderDays: true,
        whtReminderEnabled: true,
      },
    });

    const whtDeadlineDay = companySettings?.whtDeadlineDay || 7;
    const whtReminderDays = companySettings?.whtReminderDays || 3;

    // Calculate deadline (7th of next month)
    const deadlineDate = new Date(year, month, whtDeadlineDay);
    const reminderDate = new Date(deadlineDate);
    reminderDate.setDate(reminderDate.getDate() - whtReminderDays);

    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDeadline < 0;
    const isReminder = daysUntilDeadline <= whtReminderDays && daysUntilDeadline >= 0;

    // WHT ที่เราหักเขา (Expense) - ต้องนำส่ง
    const expensesWithWhtRaw = await prisma.expense.findMany({
      where: {
        companyId: company.id,
        deletedAt: null,
        isWht: true,
        billDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        Contact: { select: { name: true, taxId: true } },
      },
      orderBy: { billDate: "asc" },
    });
    const expensesWithWht = expensesWithWhtRaw.map((e) => ({ ...e, contact: e.Contact }));

    // WHT ที่เขาหักเรา (Income) - เป็นเครดิตภาษี
    const incomesWithWhtRaw = await prisma.income.findMany({
      where: {
        companyId: company.id,
        deletedAt: null,
        isWhtDeducted: true,
        receiveDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        Contact: { select: { name: true, taxId: true } },
      },
      orderBy: { receiveDate: "asc" },
    });
    const incomesWithWht = incomesWithWhtRaw.map((i) => ({ ...i, contact: i.Contact }));

    // Calculate totals
    const totalWhtToPay = expensesWithWht.reduce(
      (sum, e) => sum + (Number(e.whtAmount) || 0),
      0
    );

    const totalWhtCredit = incomesWithWht.reduce(
      (sum, i) => sum + (Number(i.whtAmount) || 0),
      0
    );

    // Group by WHT type
    const whtByType: Record<string, { count: number; amount: number }> = {};
    for (const expense of expensesWithWht) {
      const type = expense.whtType || "OTHER";
      if (!whtByType[type]) {
        whtByType[type] = { count: 0, amount: 0 };
      }
      whtByType[type].count++;
      whtByType[type].amount += Number(expense.whtAmount) || 0;
    }

    // Pending WHT certs (Income - รอใบ 50 ทวิจากลูกค้า)
    const pendingWhtCerts = await prisma.income.count({
      where: {
        companyId: company.id,
        deletedAt: null,
        isWhtDeducted: true,
        hasWhtCert: false,
        receiveDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Pending WHT issue (Expense - รอออกใบ 50 ทวิให้ vendor)
    const pendingWhtIssue = await prisma.expense.count({
      where: {
        companyId: company.id,
        deletedAt: null,
        isWht: true,
        hasWhtCert: false,
        billDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    return apiResponse.success({
      month,
      year,
      deadline: {
        date: deadlineDate.toISOString(),
        day: whtDeadlineDay,
        daysUntil: daysUntilDeadline,
        isOverdue,
        isReminder,
      },
      toPay: {
        total: totalWhtToPay,
        count: expensesWithWht.length,
        byType: whtByType,
        items: expensesWithWht.map(e => ({
          id: e.id,
          date: e.billDate,
          vendorName: e.contact?.name || e.contactName,
          vendorTaxId: e.contact?.taxId,
          amount: Number(e.amount),
          whtRate: Number(e.whtRate),
          whtAmount: Number(e.whtAmount),
          whtType: e.whtType,
          hasWhtCert: e.hasWhtCert,
          whtCertIssuedAt: e.whtCertIssuedAt,
          whtCertSentAt: e.whtCertSentAt,
        })),
      },
      credit: {
        total: totalWhtCredit,
        count: incomesWithWht.length,
        items: incomesWithWht.map(i => ({
          id: i.id,
          date: i.receiveDate,
          customerName: i.contact?.name || i.contactName,
          customerTaxId: i.contact?.taxId,
          amount: Number(i.amount),
          whtRate: Number(i.whtRate),
          whtAmount: Number(i.whtAmount),
          whtType: i.whtType,
          hasWhtCert: i.hasWhtCert,
          whtCertReceivedAt: i.whtCertReceivedAt,
        })),
      },
      pending: {
        whtCertsFromCustomers: pendingWhtCerts,
        whtCertsToIssue: pendingWhtIssue,
      },
    });
  }
);
