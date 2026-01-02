/**
 * LINE Messaging API Integration
 * Send notifications to LINE users/groups when transactions are created
 * 
 * Setup:
 * 1. Create LINE Official Account at https://developers.line.biz/
 * 2. Create Messaging API channel
 * 3. Get Channel Access Token from LINE Developers Console
 * 4. Configure credentials in Company settings
 */

import { prisma } from "@/lib/db";

const LINE_API_URL = "https://api.line.me/v2/bot/message";

interface CompanyLineConfig {
  channelAccessToken: string;
  groupId: string;
}

/**
 * Get LINE configuration for a company from database
 */
export async function getCompanyLineConfig(
  companyId: string
): Promise<CompanyLineConfig | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    if (
      !company?.lineChannelAccessToken ||
      !company?.lineGroupId
    ) {
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
    };
  } catch (error) {
    console.error("Failed to get LINE config:", error);
    return null;
  }
}

/**
 * Get LINE configuration by company code
 */
export async function getCompanyLineConfigByCode(
  companyCode: string
): Promise<CompanyLineConfig | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: {
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    if (
      !company?.lineChannelAccessToken ||
      !company?.lineGroupId
    ) {
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
    };
  } catch (error) {
    console.error("Failed to get LINE config:", error);
    return null;
  }
}

interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

interface SendMessageOptions {
  channelAccessToken: string;
  to: string; // User ID or Group ID
  messages: LineMessage[];
}

/**
 * Send message via LINE Messaging API (Push Message)
 */
export async function sendLineMessage({
  channelAccessToken,
  to,
  messages,
}: SendMessageOptions): Promise<boolean> {
  if (!channelAccessToken || !to) {
    console.warn("LINE Messaging API not configured");
    return false;
  }

  try {
    const response = await fetch(`${LINE_API_URL}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("LINE Messaging API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE Messaging API failed:", error);
    return false;
  }
}

/**
 * Send simple text message
 */
export async function sendTextMessage(
  channelAccessToken: string,
  to: string,
  text: string
): Promise<boolean> {
  return sendLineMessage({
    channelAccessToken,
    to,
    messages: [{ type: "text", text }],
  });
}

/**
 * Format currency for notifications
 */
function formatCurrencyThai(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Create expense notification (Flex Message)
 */
export function createExpenseFlexMessage(expense: {
  companyName: string;
  vendorName?: string;
  description?: string;
  amount: number;
  vatAmount?: number;
  isWht: boolean;
  whtRate?: number;
  whtAmount?: number;
  netPaid: number;
  status: string;
}): LineMessage {
  const statusEmoji = {
    WAITING_FOR_DOC: "🟠",
    PENDING_PHYSICAL: "🔴",
    READY_TO_SEND: "🟡",
    SENT_TO_ACCOUNT: "🟢",
  }[expense.status] || "⚪";

  const statusText = {
    WAITING_FOR_DOC: "รอใบเสร็จจากร้าน",
    PENDING_PHYSICAL: "รอส่งบัญชี",
    READY_TO_SEND: "พร้อมส่ง",
    SENT_TO_ACCOUNT: "ส่งแล้ว",
  }[expense.status] || expense.status;

  return {
    type: "flex",
    altText: `💸 รายจ่าย ${formatCurrencyThai(expense.netPaid)}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `💸 ${expense.companyName}`,
            weight: "bold",
            color: "#EF4444",
            size: "md",
          },
        ],
        backgroundColor: "#FEF2F2",
        paddingAll: "12px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: expense.vendorName || expense.description || "ไม่ระบุ",
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "ยอดก่อน VAT", size: "sm", color: "#666666", flex: 1 },
              { type: "text", text: formatCurrencyThai(expense.amount), size: "sm", align: "end", flex: 1 },
            ],
          },
          ...(expense.vatAmount && expense.vatAmount > 0
            ? [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "VAT 7%", size: "sm", color: "#3B82F6", flex: 1 },
                    { type: "text", text: `+${formatCurrencyThai(expense.vatAmount)}`, size: "sm", color: "#3B82F6", align: "end", flex: 1 },
                  ],
                },
              ]
            : []),
          ...(expense.isWht && expense.whtAmount
            ? [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: `หัก ณ ที่จ่าย ${expense.whtRate}%`, size: "sm", color: "#EF4444", flex: 2 },
                    { type: "text", text: `-${formatCurrencyThai(expense.whtAmount)}`, size: "sm", color: "#EF4444", align: "end", flex: 1 },
                  ],
                },
              ]
            : []),
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "โอนจริง", weight: "bold", size: "md", flex: 1 },
              { type: "text", text: formatCurrencyThai(expense.netPaid), weight: "bold", size: "md", color: "#10B981", align: "end", flex: 1 },
            ],
          },
        ],
        paddingAll: "12px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${statusEmoji} ${statusText}`,
            size: "sm",
            color: "#666666",
            align: "center",
          },
        ],
        paddingAll: "12px",
        backgroundColor: "#F9FAFB",
      },
    },
  };
}

/**
 * Create income notification (Flex Message)
 */
export function createIncomeFlexMessage(income: {
  companyName: string;
  customerName?: string;
  source?: string;
  amount: number;
  vatAmount?: number;
  isWhtDeducted: boolean;
  whtRate?: number;
  whtAmount?: number;
  netReceived: number;
  status: string;
}): LineMessage {
  const statusEmoji = {
    NO_DOC_REQUIRED: "⚪",
    WAITING_ISSUE: "🟠",
    WAITING_WHT_CERT: "🟠",
    PENDING_COPY_SEND: "🔴",
    SENT_COPY: "🟢",
  }[income.status] || "⚪";

  const statusText = {
    NO_DOC_REQUIRED: "ไม่ต้องทำเอกสาร",
    WAITING_ISSUE: "รอออกบิล",
    WAITING_WHT_CERT: "รอใบ 50 ทวิ",
    PENDING_COPY_SEND: "รอส่งสำเนา",
    SENT_COPY: "ส่งแล้ว",
  }[income.status] || income.status;

  return {
    type: "flex",
    altText: `💰 รายรับ ${formatCurrencyThai(income.netReceived)}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `💰 ${income.companyName}`,
            weight: "bold",
            color: "#10B981",
            size: "md",
          },
        ],
        backgroundColor: "#ECFDF5",
        paddingAll: "12px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: income.customerName || income.source || "ไม่ระบุ",
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "ยอดก่อน VAT", size: "sm", color: "#666666", flex: 1 },
              { type: "text", text: formatCurrencyThai(income.amount), size: "sm", align: "end", flex: 1 },
            ],
          },
          ...(income.vatAmount && income.vatAmount > 0
            ? [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "VAT 7%", size: "sm", color: "#3B82F6", flex: 1 },
                    { type: "text", text: `+${formatCurrencyThai(income.vatAmount)}`, size: "sm", color: "#3B82F6", align: "end", flex: 1 },
                  ],
                },
              ]
            : []),
          ...(income.isWhtDeducted && income.whtAmount
            ? [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: `ลูกค้าหัก ${income.whtRate}%`, size: "sm", color: "#F59E0B", flex: 2 },
                    { type: "text", text: `-${formatCurrencyThai(income.whtAmount)}`, size: "sm", color: "#F59E0B", align: "end", flex: 1 },
                  ],
                },
              ]
            : []),
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "รับจริง", weight: "bold", size: "md", flex: 1 },
              { type: "text", text: formatCurrencyThai(income.netReceived), weight: "bold", size: "md", color: "#10B981", align: "end", flex: 1 },
            ],
          },
        ],
        paddingAll: "12px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${statusEmoji} ${statusText}`,
            size: "sm",
            color: "#666666",
            align: "center",
          },
          ...(income.status === "WAITING_WHT_CERT"
            ? [
                {
                  type: "text",
                  text: "⚠️ อย่าลืมทวงใบ 50 ทวิ!",
                  size: "xs",
                  color: "#F59E0B",
                  align: "center",
                  margin: "sm",
                },
              ]
            : []),
        ],
        paddingAll: "12px",
        backgroundColor: "#F9FAFB",
      },
    },
  };
}

/**
 * Create daily summary notification (Flex Message)
 */
export function createDailySummaryFlexMessage(summary: {
  companyName: string;
  date: Date;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  pendingDocs: number;
  waitingWhtCerts: number;
}): LineMessage {
  const dateStr = summary.date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    type: "flex",
    altText: `📊 สรุปประจำวัน ${summary.companyName}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `📊 ${summary.companyName}`,
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: dateStr,
            size: "sm",
            color: "#666666",
          },
        ],
        backgroundColor: "#F1F5F9",
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "💰 รายรับ", size: "md", flex: 1 },
              { type: "text", text: formatCurrencyThai(summary.totalIncome), size: "md", color: "#10B981", align: "end", weight: "bold", flex: 1 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "💸 รายจ่าย", size: "md", flex: 1 },
              { type: "text", text: formatCurrencyThai(summary.totalExpense), size: "md", color: "#EF4444", align: "end", weight: "bold", flex: 1 },
            ],
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            contents: [
              { type: "text", text: "📈 สุทธิ", size: "lg", weight: "bold", flex: 1 },
              {
                type: "text",
                text: formatCurrencyThai(summary.netCashFlow),
                size: "lg",
                color: summary.netCashFlow >= 0 ? "#10B981" : "#EF4444",
                align: "end",
                weight: "bold",
                flex: 1,
              },
            ],
          },
          ...(summary.pendingDocs > 0 || summary.waitingWhtCerts > 0
            ? [
                {
                  type: "separator",
                  margin: "lg",
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  contents: [
                    {
                      type: "text",
                      text: "⚠️ รายการค้าง",
                      weight: "bold",
                      size: "sm",
                      color: "#F59E0B",
                    },
                    ...(summary.pendingDocs > 0
                      ? [
                          {
                            type: "text",
                            text: `📄 เอกสารรอส่ง: ${summary.pendingDocs} รายการ`,
                            size: "sm",
                            margin: "sm",
                          },
                        ]
                      : []),
                    ...(summary.waitingWhtCerts > 0
                      ? [
                          {
                            type: "text",
                            text: `📋 รอใบ 50 ทวิ: ${summary.waitingWhtCerts} รายการ`,
                            size: "sm",
                            margin: "sm",
                          },
                        ]
                      : []),
                  ],
                },
              ]
            : []),
        ],
        paddingAll: "16px",
      },
    },
  };
}

/**
 * Send reply message (for webhook responses)
 */
export async function sendReplyMessage(
  replyToken: string,
  messages: LineMessage[],
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
    console.error("Failed to send reply:", error);
    return false;
  }
}

/**
 * Send notification to company's configured LINE channel (by company ID)
 */
export async function notifyCompanyById(
  companyId: string,
  message: LineMessage
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    console.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Send notification to company's configured LINE channel (by company code)
 */
export async function notifyCompany(
  companyCode: string,
  message: LineMessage
): Promise<boolean> {
  const config = await getCompanyLineConfigByCode(companyCode);
  
  if (!config) {
    console.warn(`LINE not configured for company ${companyCode}`);
    return false;
  }

  return sendLineMessage({
    channelAccessToken: config.channelAccessToken,
    to: config.groupId,
    messages: [message],
  });
}

/**
 * Simple text notification (by company ID)
 */
export async function notifyCompanyTextById(
  companyId: string,
  text: string
): Promise<boolean> {
  const config = await getCompanyLineConfig(companyId);
  
  if (!config) {
    console.warn(`LINE not configured for company ${companyId}`);
    return false;
  }

  return sendTextMessage(config.channelAccessToken, config.groupId, text);
}

/**
 * Simple text notification (by company code - backward compatible)
 */
export async function notifyCompanyText(
  companyCode: string,
  text: string
): Promise<boolean> {
  const config = await getCompanyLineConfigByCode(companyCode);
  
  if (!config) {
    console.warn(`LINE not configured for company ${companyCode}`);
    return false;
  }

  return sendTextMessage(config.channelAccessToken, config.groupId, text);
}

/**
 * Send expense notification to company
 */
export async function notifyExpense(
  companyId: string,
  expense: {
    companyName: string;
    vendorName?: string;
    description?: string;
    amount: number;
    vatAmount?: number;
    isWht: boolean;
    whtRate?: number;
    whtAmount?: number;
    netPaid: number;
    status: string;
  }
): Promise<boolean> {
  const message = createExpenseFlexMessage(expense);
  return notifyCompanyById(companyId, message);
}

/**
 * Send income notification to company
 */
export async function notifyIncome(
  companyId: string,
  income: {
    companyName: string;
    customerName?: string;
    source?: string;
    amount: number;
    vatAmount?: number;
    isWhtDeducted: boolean;
    whtRate?: number;
    whtAmount?: number;
    netReceived: number;
    status: string;
  }
): Promise<boolean> {
  const message = createIncomeFlexMessage(income);
  return notifyCompanyById(companyId, message);
}
