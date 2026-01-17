import { NextResponse } from "next/server";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import type { PaidByType } from "@prisma/client";

/**
 * GET /api/[company]/settlements/report/export
 * Export settlement report to Excel
 * 
 * Note: Only USER payer type requires settlement (COMPANY/PETTY_CASH excluded)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (year && year !== "all") {
      dateFilter.gte = new Date(`${year}-01-01`);
      dateFilter.lte = new Date(`${year}-12-31T23:59:59.999Z`);
    }

    // Base where clause - only USER type needs settlement
    const baseWhere = {
      Expense: {
        companyId: company.id,
        deletedAt: null,
      },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      paidByType: "USER" as PaidByType,
    };

    // Get all payments
    const allPayments = await prisma.expensePayment.findMany({
      where: baseWhere,
      include: {
        PaidByUser: {
          select: { id: true, name: true, email: true },
        },
        SettledByUser: {
          select: { id: true, name: true },
        },
        Expense: {
          select: {
            id: true,
            description: true,
            billDate: true,
            netPaid: true,
            invoiceNumber: true,
            Contact: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all company members
    const companyMembers = await prisma.companyAccess.findMany({
      where: { companyId: company.id },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Initialize map with all company members
    const byPersonMap = new Map<string, {
      name: string;
      email: string | null;
      totalSettled: number;
      settledCount: number;
      totalPending: number;
      pendingCount: number;
    }>();

    // Add all company members first
    companyMembers.forEach((member) => {
      const personKey = `user_${member.userId}`;
      byPersonMap.set(personKey, {
        name: member.User.name,
        email: member.User.email,
        totalSettled: 0,
        settledCount: 0,
        totalPending: 0,
        pendingCount: 0,
      });
    });

    // Overlay payment data
    allPayments.forEach((payment) => {
      if (!payment.PaidByUser || !payment.paidByUserId) {
        return; // Skip payments without user
      }

      const personKey = `user_${payment.paidByUserId}`;

      // If user is not a member (shouldn't happen), add them
      if (!byPersonMap.has(personKey)) {
        byPersonMap.set(personKey, {
          name: payment.PaidByUser.name,
          email: payment.PaidByUser.email,
          totalSettled: 0,
          settledCount: 0,
          totalPending: 0,
          pendingCount: 0,
        });
      }

      const person = byPersonMap.get(personKey)!;
      const amount = Number(payment.amount);

      if (payment.settlementStatus === "SETTLED") {
        person.totalSettled += amount;
        person.settledCount += 1;
      } else if (payment.settlementStatus === "PENDING") {
        person.totalPending += amount;
        person.pendingCount += 1;
      }
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = company.name;
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet("สรุป");
    summarySheet.columns = [
      { header: "รายการ", key: "label", width: 25 },
      { header: "ยอดเงิน (บาท)", key: "amount", width: 20 },
      { header: "จำนวนรายการ", key: "count", width: 15 },
    ];

    // Style header
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Summary data
    const totalSettled = allPayments
      .filter((p) => p.settlementStatus === "SETTLED")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = allPayments
      .filter((p) => p.settlementStatus === "PENDING")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const settledCount = allPayments.filter((p) => p.settlementStatus === "SETTLED").length;
    const pendingCount = allPayments.filter((p) => p.settlementStatus === "PENDING").length;

    summarySheet.addRow({
      label: "ยอดจ่ายแล้ว",
      amount: totalSettled,
      count: settledCount,
    });
    summarySheet.addRow({
      label: "ยอดค้างจ่าย",
      amount: totalPending,
      count: pendingCount,
    });
    summarySheet.addRow({
      label: "รวมทั้งหมด",
      amount: totalSettled + totalPending,
      count: settledCount + pendingCount,
    });

    // Format numbers
    summarySheet.getColumn("amount").numFmt = '#,##0.00';

    // Sheet 2: Per-Person Breakdown (Users only)
    const personSheet = workbook.addWorksheet("แยกตามพนักงาน");
    personSheet.columns = [
      { header: "ชื่อพนักงาน", key: "name", width: 25 },
      { header: "อีเมล", key: "email", width: 25 },
      { header: "โอนคืนแล้ว (บาท)", key: "totalSettled", width: 18 },
      { header: "รายการจ่าย", key: "settledCount", width: 12 },
      { header: "ค้างโอนคืน (บาท)", key: "totalPending", width: 18 },
      { header: "รายการค้าง", key: "pendingCount", width: 12 },
    ];

    // Style header
    personSheet.getRow(1).font = { bold: true, size: 12 };
    personSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    personSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add person data (sort by pending, then settled, then name)
    Array.from(byPersonMap.values())
      .sort((a, b) => b.totalPending - a.totalPending || b.totalSettled - a.totalSettled || a.name.localeCompare(b.name))
      .forEach((person) => {
        personSheet.addRow(person);
      });

    // Format numbers
    personSheet.getColumn("totalSettled").numFmt = '#,##0.00';
    personSheet.getColumn("totalPending").numFmt = '#,##0.00';

    // Sheet 3: All Transactions
    const transactionSheet = workbook.addWorksheet("รายการทั้งหมด");
    transactionSheet.columns = [
      { header: "วันที่", key: "date", width: 12 },
      { header: "พนักงาน", key: "payerName", width: 20 },
      { header: "รายละเอียด", key: "description", width: 30 },
      { header: "ร้านค้า", key: "vendor", width: 20 },
      { header: "เลขที่ใบเสร็จ", key: "invoiceNumber", width: 15 },
      { header: "จำนวนเงิน (บาท)", key: "amount", width: 18 },
      { header: "สถานะ", key: "status", width: 12 },
      { header: "วันที่โอนคืน", key: "settledAt", width: 12 },
      { header: "อ้างอิงการโอน", key: "settlementRef", width: 20 },
      { header: "โอนคืนโดย", key: "settledBy", width: 15 },
    ];

    // Style header
    transactionSheet.getRow(1).font = { bold: true, size: 12 };
    transactionSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF97316" },
    };
    transactionSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add transaction data
    allPayments.forEach((payment) => {
      const payerName = payment.PaidByUser?.name || "ไม่ระบุ";

      transactionSheet.addRow({
        date: payment.Expense.billDate.toLocaleDateString("th-TH"),
        payerName,
        description: payment.Expense.description || "-",
        vendor: payment.Expense.Contact?.name || "-",
        invoiceNumber: payment.Expense.invoiceNumber || "-",
        amount: Number(payment.amount),
        status: payment.settlementStatus === "SETTLED" ? "โอนคืนแล้ว" : "รอโอนคืน",
        settledAt: payment.settledAt 
          ? payment.settledAt.toLocaleDateString("th-TH") 
          : "-",
        settlementRef: payment.settlementRef || "-",
        settledBy: payment.SettledByUser?.name || "-",
      });
    });

    // Format numbers
    transactionSheet.getColumn("amount").numFmt = '#,##0.00';

    // Highlight pending rows
    transactionSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell("status");
        if (statusCell.value === "รอโอนคืน") {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF3CD" },
          };
        }
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename
    const yearLabel = year && year !== "all" ? `_${parseInt(year) + 543}` : "";
    const filename = `รายงานการจ่ายคืน_${company.code}${yearLabel}.xlsx`;

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  },
  { permission: "settlements:read" }
);
