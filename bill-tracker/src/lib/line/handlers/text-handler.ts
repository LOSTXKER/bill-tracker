/**
 * LINE Text Message Handler
 * Handles text commands sent to the LINE bot
 */

import { prisma } from "@/lib/db";
import type { LineWebhookEvent, LineCompanyConfig } from "../types";
import { replyToLine, formatCurrency } from "../api";
import { buildExpenseBaseWhere } from "@/lib/queries/expense-filters";
import { toThaiStartOfDay, toThaiEndOfDay } from "@/lib/queries/date-utils";

/**
 * Handle text message commands
 */
export async function handleTextMessage(
  event: LineWebhookEvent,
  company: LineCompanyConfig,
  channelAccessToken: string
): Promise<void> {
  const text = event.message?.text?.toLowerCase().trim() || "";
  const replyToken = event.replyToken;

  if (!replyToken) return;

  // Command: Get Group ID
  if (text === "group id" || text === "groupid" || text === "group") {
    await handleGroupIdCommand(event, company, channelAccessToken);
    return;
  }

  // Command: Help
  if (text === "help" || text === "ช่วยเหลือ" || text === "คำสั่ง") {
    await handleHelpCommand(replyToken, channelAccessToken);
    return;
  }

  // Command: Summary
  if (text === "summary" || text === "สรุป") {
    await handleSummaryCommand(event, company, channelAccessToken);
    return;
  }

  // Default: Ignore unknown messages (do not reply)
}

/**
 * Handle "group id" command
 */
async function handleGroupIdCommand(
  event: LineWebhookEvent,
  company: LineCompanyConfig,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken!;
  const groupId = event.source.groupId;

  if (!groupId) {
    await replyToLine(
      replyToken,
      [
        {
          type: "text",
          text: "⚠️ คำสั่งนี้ใช้ได้เฉพาะใน Group เท่านั้น\n\nกรุณาเพิ่มบอทเข้า Group แล้วพิมพ์คำสั่งนี้อีกครั้ง",
        },
      ],
      channelAccessToken
    );
    return;
  }

  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `📱 Group ID:\n${groupId}\n\nคัดลอก ID นี้ไปวางในหน้าตั้งค่า LINE Bot บนเว็บ`,
      },
    ],
    channelAccessToken
  );
}

/**
 * Handle "help" command
 */
async function handleHelpCommand(
  replyToken: string,
  channelAccessToken: string
): Promise<void> {
  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `🤖 คำสั่งที่ใช้ได้:\n\n📱 group id - ดู Group ID\n📊 summary / สรุป - สรุปรายการวันนี้\n📷 ส่งรูปใบเสร็จ - วิเคราะห์ด้วย AI\n❓ help / ช่วยเหลือ - แสดงคำสั่งนี้`,
      },
    ],
    channelAccessToken
  );
}

/**
 * Handle "summary" command
 */
async function handleSummaryCommand(
  event: LineWebhookEvent,
  company: LineCompanyConfig,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken!;

  // Get today's date range (Thailand timezone)
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  const today = toThaiStartOfDay(todayStr);
  const tomorrow = toThaiEndOfDay(todayStr);

  // Fetch today's transactions
  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...buildExpenseBaseWhere(company.id),
        billDate: { gte: today, lte: tomorrow },
      },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    }),
  ]);

  // Calculate totals
  const totalExpense = expenses.reduce(
    (sum, exp) => sum + Number(exp.netPaid),
    0
  );
  const totalIncome = incomes.reduce(
    (sum, inc) => sum + Number(inc.netReceived),
    0
  );
  const netCashFlow = totalIncome - totalExpense;

  // Format and send response
  const dateStr = today.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `📊 สรุปประจำวัน ${company.name}\n${dateStr}\n\n💰 รายรับ: ฿${formatCurrency(totalIncome)} (${incomes.length} รายการ)\n💸 รายจ่าย: ฿${formatCurrency(totalExpense)} (${expenses.length} รายการ)\n${"━".repeat(30)}\n📈 สุทธิ: ฿${formatCurrency(netCashFlow)}${netCashFlow >= 0 ? " ✅" : " ⚠️"}`,
      },
    ],
    channelAccessToken
  );
}
