import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

/**
 * LINE Bot Webhook Handler
 * Receives events from LINE Messaging API and processes them
 */

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  timestamp: number;
  message?: {
    type: string;
    id: string;
    text?: string;
    contentProvider?: {
      type: string;
    };
  };
  mode?: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

/**
 * Verify LINE webhook signature
 */
function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * Send reply message to LINE
 */
async function replyToLine(
  replyToken: string,
  messages: any[],
  channelAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("LINE reply error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to reply to LINE:", error);
    return false;
  }
}

/**
 * Handle text message commands
 */
async function handleTextMessage(
  event: LineWebhookEvent,
  company: any,
  channelAccessToken: string
): Promise<void> {
  const text = event.message?.text?.toLowerCase().trim() || "";
  const replyToken = event.replyToken;

  if (!replyToken) return;

  // Command: Get Group ID
  if (text === "group id" || text === "groupid" || text === "group") {
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

    // Update company with group ID
    await prisma.company.update({
      where: { id: company.id },
      data: { lineGroupId: groupId },
    });

    await replyToLine(
      replyToken,
      [
        {
          type: "text",
          text: `✅ บันทึก Group ID สำเร็จ!\n\n📱 Group ID:\n${groupId}\n\nคุณสามารถคัดลอก ID นี้ไปใช้ในการตั้งค่าบนเว็บได้แล้ว`,
        },
      ],
      channelAccessToken
    );
    return;
  }

  // Command: Help
  if (text === "help" || text === "ช่วยเหลือ" || text === "คำสั่ง") {
    await replyToLine(
      replyToken,
      [
        {
          type: "text",
          text: `🤖 คำสั่งที่ใช้ได้:\n\n📱 group id - ดู Group ID\n📊 summary / สรุป - สรุปรายการวันนี้\n💰 budget / งบประมาณ - สถานะงบประมาณ\n📷 ส่งรูปใบเสร็จ - วิเคราะห์ด้วย AI\n❓ help / ช่วยเหลือ - แสดงคำสั่งนี้`,
        },
      ],
      channelAccessToken
    );
    return;
  }

  // Command: Summary
  if (text === "summary" || text === "สรุป") {
    // Get today's expenses and incomes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          companyId: company.id,
          billDate: {
            gte: today,
            lt: tomorrow,
          },
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

    const totalExpense = expenses.reduce(
      (sum, exp) => sum + Number(exp.netPaid),
      0
    );
    const totalIncome = incomes.reduce(
      (sum, inc) => sum + Number(inc.netReceived),
      0
    );
    const netCashFlow = totalIncome - totalExpense;

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

    await replyToLine(
      replyToken,
      [
        {
          type: "text",
          text: `📊 สรุปประจำวัน ${company.name}\n${today.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}\n\n💰 รายรับ: ฿${formatCurrency(totalIncome)} (${incomes.length} รายการ)\n💸 รายจ่าย: ฿${formatCurrency(totalExpense)} (${expenses.length} รายการ)\n${"━".repeat(30)}\n📈 สุทธิ: ฿${formatCurrency(netCashFlow)}${netCashFlow >= 0 ? " ✅" : " ⚠️"}`,
        },
      ],
      channelAccessToken
    );
    return;
  }

  // Command: Budget
  if (text === "budget" || text === "งบประมาณ") {
    // Get current month's budgets
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgets = await prisma.budget.findMany({
      where: {
        companyId: company.id,
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
    });

    if (budgets.length === 0) {
      await replyToLine(
        replyToken,
        [
          {
            type: "text",
            text: "📊 ยังไม่มีงบประมาณที่ตั้งไว้สำหรับเดือนนี้\n\nกรุณาตั้งงบประมาณในหน้าเว็บก่อนครับ",
          },
        ],
        channelAccessToken
      );
      return;
    }

    // Get expenses for current month
    const expenses = await prisma.expense.findMany({
      where: {
        companyId: company.id,
        billDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const categoryLabels: Record<string, string> = {
      MATERIAL: "วัตถุดิบ",
      UTILITY: "สาธารณูปโภค",
      MARKETING: "การตลาด",
      SALARY: "เงินเดือน",
      FREELANCE: "ฟรีแลนซ์",
      TRANSPORT: "ค่าขนส่ง",
      RENT: "ค่าเช่า",
      OFFICE: "สำนักงาน",
      OTHER: "อื่นๆ",
    };

    let budgetText = `💰 งบประมาณเดือน${now.toLocaleDateString("th-TH", { month: "long" })}\n\n`;

    for (const budget of budgets) {
      const spent = expenses
        .filter((exp) => exp.category === budget.category)
        .reduce((sum, exp) => sum + Number(exp.netPaid), 0);

      const budgetAmount = Number(budget.amount);
      const percentage = (spent / budgetAmount) * 100;
      const emoji =
        percentage >= 100 ? "🔴" : percentage >= 80 ? "🟠" : "🟢";

      budgetText += `${emoji} ${categoryLabels[budget.category] || budget.category}\n`;
      budgetText += `   ใช้ไป: ฿${spent.toLocaleString("th-TH")}\n`;
      budgetText += `   งบ: ฿${budgetAmount.toLocaleString("th-TH")}\n`;
      budgetText += `   ${percentage.toFixed(0)}%\n\n`;
    }

    await replyToLine(replyToken, [{ type: "text", text: budgetText }], channelAccessToken);
    return;
  }

  // Default: Unknown command
  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: '❓ ไม่เข้าใจคำสั่ง\n\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้',
      },
    ],
    channelAccessToken
  );
}

/**
 * Handle image message (receipt OCR)
 */
async function handleImageMessage(
  event: LineWebhookEvent,
  company: any,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken;
  if (!replyToken) return;

  // TODO: Implement OCR in later phase
  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: "📷 ได้รับรูปใบเสร็จแล้ว!\n\n🤖 ฟีเจอร์วิเคราะห์ด้วย AI กำลังพัฒนา...\nกรุณารอการอัพเดทในเร็วๆ นี้",
      },
    ],
    channelAccessToken
  );
}

/**
 * Handle join event (bot added to group)
 */
async function handleJoinEvent(
  event: LineWebhookEvent,
  company: any,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken;
  if (!replyToken) return;

  const groupId = event.source.groupId;
  if (groupId && company) {
    // Auto-save group ID
    await prisma.company.update({
      where: { id: company.id },
      data: { lineGroupId: groupId },
    });
  }

  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `👋 สวัสดีครับ!\n\nผมคือบอทจัดการบัญชีสำหรับ ${company?.name || "บริษัทของคุณ"}\n\n✅ Group ID ถูกบันทึกอัตโนมัติแล้ว\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้`,
      },
    ],
    channelAccessToken
  );
}

/**
 * POST /api/line/webhook
 * Receive events from LINE Messaging API
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-line-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const bodyText = await request.text();
    const body: LineWebhookBody = JSON.parse(bodyText);

    // Find company by channel access token (we'll need to match against stored token)
    // For now, we'll process events for all companies that have LINE configured
    // In production, you might want to use destination (bot's user ID) to match

    for (const event of body.events) {
      console.log("LINE Event:", event.type, event);

      // Try to find company by checking all companies with LINE configured
      const companies = await prisma.company.findMany({
        where: {
          lineChannelSecret: { not: null },
          lineChannelAccessToken: { not: null },
        },
      });

      for (const company of companies) {
        if (!company.lineChannelSecret || !company.lineChannelAccessToken) {
          continue;
        }

        // Verify signature
        const isValid = verifySignature(
          bodyText,
          signature,
          company.lineChannelSecret
        );

        if (!isValid) {
          continue; // Try next company
        }

        // Signature is valid, process event
        switch (event.type) {
          case "message":
            if (event.message?.type === "text") {
              await handleTextMessage(
                event,
                company,
                company.lineChannelAccessToken
              );
            } else if (event.message?.type === "image") {
              await handleImageMessage(
                event,
                company,
                company.lineChannelAccessToken
              );
            }
            break;

          case "join":
            await handleJoinEvent(
              event,
              company,
              company.lineChannelAccessToken
            );
            break;

          default:
            console.log("Unhandled event type:", event.type);
        }

        // Event processed, no need to check other companies
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LINE webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/line/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "LINE Bot webhook is running",
  });
}
