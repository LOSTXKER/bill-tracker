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
  notifyEnabled: boolean;
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
        lineNotifyEnabled: true,
      },
    });

    if (
      !company?.lineChannelAccessToken ||
      !company?.lineGroupId
    ) {
      return null;
    }

    // Check if notifications are enabled
    if (!company.lineNotifyEnabled) {
      console.log(`LINE notifications disabled for company ${companyId}`);
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
      notifyEnabled: company.lineNotifyEnabled,
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
        lineNotifyEnabled: true,
      },
    });

    if (
      !company?.lineChannelAccessToken ||
      !company?.lineGroupId
    ) {
      return null;
    }

    // Check if notifications are enabled
    if (!company.lineNotifyEnabled) {
      console.log(`LINE notifications disabled for company code ${companyCode}`);
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
      notifyEnabled: company.lineNotifyEnabled,
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
 * Format number with commas and 2 decimal places
 */
function formatNumber(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Create expense notification (Flex Message)
 */
export function createExpenseFlexMessage(expense: {
  id?: string;
  companyCode?: string;
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
}, baseUrl?: string): LineMessage {
  const statusConfig: Record<string, { emoji: string; text: string; color: string; bgColor: string }> = {
    WAITING_FOR_DOC: { emoji: "📋", text: "รอใบเสร็จ", color: "#F59E0B", bgColor: "#FEF3C7" },
    PENDING_PHYSICAL: { emoji: "📄", text: "รอส่งบัญชี", color: "#EF4444", bgColor: "#FEE2E2" },
    READY_TO_SEND: { emoji: "📦", text: "พร้อมส่ง", color: "#8B5CF6", bgColor: "#EDE9FE" },
    SENT_TO_ACCOUNT: { emoji: "✅", text: "ส่งแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  };

  const status = statusConfig[expense.status] || { emoji: "⚪", text: expense.status, color: "#6B7280", bgColor: "#F3F4F6" };

  const bodyContents: object[] = [
    // Vendor/Description with icon
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "🏪", size: "xl" },
          ],
          width: "40px",
          alignItems: "center",
          justifyContent: "center",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: expense.vendorName || "ไม่ระบุผู้ขาย",
              weight: "bold",
              size: "lg",
              color: "#1F2937",
              wrap: true,
            },
            ...(expense.description ? [{
              type: "text",
              text: expense.description,
              size: "xs",
              color: "#6B7280",
              wrap: true,
              margin: "xs",
            }] : []),
          ],
          flex: 1,
        },
      ],
      spacing: "md",
    },
    // Divider
    {
      type: "box",
      layout: "vertical",
      contents: [{ type: "filler" }],
      height: "1px",
      backgroundColor: "#E5E7EB",
      margin: "lg",
    },
    // Amount breakdown
    {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ยอดก่อน VAT", size: "sm", color: "#6B7280", flex: 2 },
            { type: "text", text: `฿${formatNumber(expense.amount)}`, size: "sm", color: "#374151", align: "end", flex: 1, weight: "bold" },
          ],
        },
      ],
      margin: "lg",
      spacing: "sm",
    },
  ];

  // Add VAT row if applicable
  if (expense.vatAmount && expense.vatAmount > 0) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { 
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "VAT 7%", size: "sm", color: "#3B82F6", flex: 0 },
            {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "text", text: "ภาษี", size: "xxs", color: "#93C5FD" },
              ],
              margin: "sm",
            },
          ],
          flex: 2,
        },
        { type: "text", text: `+฿${formatNumber(expense.vatAmount)}`, size: "sm", color: "#3B82F6", align: "end", flex: 1, weight: "bold" },
      ],
    });
  }

  // Add WHT row if applicable
  if (expense.isWht && expense.whtAmount) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { 
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `หัก ณ ที่จ่าย ${expense.whtRate}%`, size: "sm", color: "#DC2626", flex: 0 },
          ],
          flex: 2,
        },
        { type: "text", text: `-฿${formatNumber(expense.whtAmount)}`, size: "sm", color: "#DC2626", align: "end", flex: 1, weight: "bold" },
      ],
    });
  }

  // Net amount box
  bodyContents.push({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "💳 โอนจริง", size: "md", color: "#374151", weight: "bold" },
        ],
        flex: 1,
      },
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: `฿${formatNumber(expense.netPaid)}`, size: "xl", color: "#059669", weight: "bold", align: "end" },
        ],
        flex: 1,
      },
    ],
    backgroundColor: "#ECFDF5",
    cornerRadius: "lg",
    paddingAll: "lg",
    margin: "lg",
  });

  // Build footer with view button if id and companyCode are provided
  const viewUrl = expense.id && expense.companyCode && baseUrl 
    ? `${baseUrl}/${expense.companyCode}/expenses/${expense.id}`
    : null;

  return {
    type: "flex",
    altText: `💸 รายจ่าย ฿${formatNumber(expense.netPaid)} - ${expense.vendorName || expense.description || "ไม่ระบุ"}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💸", size: "xxl" },
            ],
            width: "50px",
            height: "50px",
            backgroundColor: "#FEE2E2",
            cornerRadius: "25px",
            alignItems: "center",
            justifyContent: "center",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "รายจ่ายใหม่", size: "xs", color: "#9CA3AF" },
              { type: "text", text: expense.companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: status.emoji, size: "sm", align: "center" },
              { type: "text", text: status.text, size: "xxs", color: status.color, align: "center", weight: "bold" },
            ],
            backgroundColor: status.bgColor,
            cornerRadius: "md",
            paddingAll: "sm",
            width: "65px",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
        spacing: "md",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      footer: viewUrl ? {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "📄 ดูรายละเอียด",
              uri: viewUrl,
            },
            style: "primary",
            color: "#EF4444",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
      styles: {
        header: {
          separator: false,
        },
      },
    },
  };
}

/**
 * Create income notification (Flex Message)
 */
export function createIncomeFlexMessage(income: {
  id?: string;
  companyCode?: string;
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
}, baseUrl?: string): LineMessage {
  const statusConfig: Record<string, { emoji: string; text: string; color: string; bgColor: string }> = {
    NO_DOC_REQUIRED: { emoji: "⚪", text: "ไม่ต้องทำเอกสาร", color: "#6B7280", bgColor: "#F3F4F6" },
    WAITING_ISSUE: { emoji: "📝", text: "รอออกบิล", color: "#F59E0B", bgColor: "#FEF3C7" },
    WAITING_WHT_CERT: { emoji: "📋", text: "รอใบ 50 ทวิ", color: "#F59E0B", bgColor: "#FEF3C7" },
    PENDING_COPY_SEND: { emoji: "📄", text: "รอส่งสำเนา", color: "#EF4444", bgColor: "#FEE2E2" },
    SENT_COPY: { emoji: "✅", text: "ส่งแล้ว", color: "#10B981", bgColor: "#D1FAE5" },
  };

  const status = statusConfig[income.status] || { emoji: "⚪", text: income.status, color: "#6B7280", bgColor: "#F3F4F6" };

  const bodyContents: object[] = [
    // Customer/Source with icon
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "👤", size: "xl" },
          ],
          width: "40px",
          alignItems: "center",
          justifyContent: "center",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: income.customerName || "ไม่ระบุลูกค้า",
              weight: "bold",
              size: "lg",
              color: "#1F2937",
              wrap: true,
            },
            ...(income.source ? [{
              type: "text",
              text: income.source,
              size: "xs",
              color: "#6B7280",
              wrap: true,
              margin: "xs",
            }] : []),
          ],
          flex: 1,
        },
      ],
      spacing: "md",
    },
    // Divider
    {
      type: "box",
      layout: "vertical",
      contents: [{ type: "filler" }],
      height: "1px",
      backgroundColor: "#E5E7EB",
      margin: "lg",
    },
    // Amount breakdown
    {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ยอดก่อน VAT", size: "sm", color: "#6B7280", flex: 2 },
            { type: "text", text: `฿${formatNumber(income.amount)}`, size: "sm", color: "#374151", align: "end", flex: 1, weight: "bold" },
          ],
        },
      ],
      margin: "lg",
      spacing: "sm",
    },
  ];

  // Add VAT row if applicable
  if (income.vatAmount && income.vatAmount > 0) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { 
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "VAT 7%", size: "sm", color: "#3B82F6", flex: 0 },
            {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "text", text: "ภาษี", size: "xxs", color: "#93C5FD" },
              ],
              margin: "sm",
            },
          ],
          flex: 2,
        },
        { type: "text", text: `+฿${formatNumber(income.vatAmount)}`, size: "sm", color: "#3B82F6", align: "end", flex: 1, weight: "bold" },
      ],
    });
  }

  // Add WHT row if applicable
  if (income.isWhtDeducted && income.whtAmount) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { 
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `ลูกค้าหัก ${income.whtRate}%`, size: "sm", color: "#F59E0B", flex: 0 },
          ],
          flex: 2,
        },
        { type: "text", text: `-฿${formatNumber(income.whtAmount)}`, size: "sm", color: "#F59E0B", align: "end", flex: 1, weight: "bold" },
      ],
    });
  }

  // Net amount box
  bodyContents.push({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "💵 รับจริง", size: "md", color: "#374151", weight: "bold" },
        ],
        flex: 1,
      },
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: `฿${formatNumber(income.netReceived)}`, size: "xl", color: "#059669", weight: "bold", align: "end" },
        ],
        flex: 1,
      },
    ],
    backgroundColor: "#ECFDF5",
    cornerRadius: "lg",
    paddingAll: "lg",
    margin: "lg",
  });

  // Add WHT reminder if applicable
  if (income.status === "WAITING_WHT_CERT") {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "⚠️", size: "md" },
        { type: "text", text: "อย่าลืมทวงใบ 50 ทวิ จากลูกค้า!", size: "sm", color: "#B45309", flex: 1, margin: "sm", weight: "bold" },
      ],
      backgroundColor: "#FEF3C7",
      cornerRadius: "md",
      paddingAll: "md",
      margin: "md",
    });
  }

  // Build footer with view button if id and companyCode are provided
  const viewUrl = income.id && income.companyCode && baseUrl 
    ? `${baseUrl}/${income.companyCode}/incomes/${income.id}`
    : null;

  return {
    type: "flex",
    altText: `💰 รายรับ ฿${formatNumber(income.netReceived)} - ${income.customerName || income.source || "ไม่ระบุ"}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💰", size: "xxl" },
            ],
            width: "50px",
            height: "50px",
            backgroundColor: "#D1FAE5",
            cornerRadius: "25px",
            alignItems: "center",
            justifyContent: "center",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "รายรับใหม่", size: "xs", color: "#9CA3AF" },
              { type: "text", text: income.companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: status.emoji, size: "sm", align: "center" },
              { type: "text", text: status.text, size: "xxs", color: status.color, align: "center", weight: "bold" },
            ],
            backgroundColor: status.bgColor,
            cornerRadius: "md",
            paddingAll: "sm",
            width: "80px",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
        spacing: "md",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      footer: viewUrl ? {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "📄 ดูรายละเอียด",
              uri: viewUrl,
            },
            style: "primary",
            color: "#10B981",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
      styles: {
        header: {
          separator: false,
        },
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
    id?: string;
    companyCode?: string;
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
  },
  baseUrl?: string
): Promise<boolean> {
  const message = createExpenseFlexMessage(expense, baseUrl);
  return notifyCompanyById(companyId, message);
}

/**
 * Send income notification to company
 */
export async function notifyIncome(
  companyId: string,
  income: {
    id?: string;
    companyCode?: string;
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
  },
  baseUrl?: string
): Promise<boolean> {
  const message = createIncomeFlexMessage(income, baseUrl);
  return notifyCompanyById(companyId, message);
}

/**
 * Create test notification (Flex Message)
 */
export function createTestFlexMessage(companyName: string): LineMessage {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

  return {
    type: "flex",
    altText: `🔔 ทดสอบการแจ้งเตือน - ${companyName}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "🔔", size: "xxl" },
            ],
            width: "50px",
            height: "50px",
            backgroundColor: "#DBEAFE",
            cornerRadius: "25px",
            alignItems: "center",
            justifyContent: "center",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "ทดสอบการแจ้งเตือน", size: "xs", color: "#9CA3AF" },
              { type: "text", text: companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
        spacing: "md",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "✅ การเชื่อมต่อสำเร็จ!", weight: "bold", size: "lg", color: "#059669", align: "center" },
              { type: "text", text: "LINE Bot พร้อมส่งการแจ้งเตือนแล้ว", size: "sm", color: "#6B7280", align: "center", margin: "md" },
            ],
            backgroundColor: "#ECFDF5",
            cornerRadius: "lg",
            paddingAll: "xl",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [{ type: "filler" }],
            height: "1px",
            backgroundColor: "#E5E7EB",
            margin: "xl",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📅 วันที่ส่ง", size: "sm", color: "#6B7280", flex: 1 },
                  { type: "text", text: dateStr, size: "sm", color: "#374151", align: "end", flex: 1, weight: "bold" },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🕐 เวลา", size: "sm", color: "#6B7280", flex: 1 },
                  { type: "text", text: timeStr, size: "sm", color: "#374151", align: "end", flex: 1, weight: "bold" },
                ],
                margin: "md",
              },
            ],
            margin: "xl",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💡 Tip: สร้างรายรับ/รายจ่ายใหม่เพื่อรับการแจ้งเตือนอัตโนมัติ", size: "xs", color: "#9CA3AF", wrap: true, align: "center" },
            ],
            margin: "xl",
            paddingAll: "md",
            backgroundColor: "#F3F4F6",
            cornerRadius: "md",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      styles: {
        header: {
          separator: false,
        },
      },
    },
  };
}

/**
 * Send test notification to company (bypasses notifyEnabled check)
 */
export async function sendTestNotification(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
      },
    });

    if (!company) {
      return { success: false, error: "ไม่พบบริษัท" };
    }

    if (!company.lineChannelAccessToken) {
      return { success: false, error: "ยังไม่ได้ตั้งค่า Channel Access Token" };
    }

    if (!company.lineGroupId) {
      return { success: false, error: "ยังไม่ได้ตั้งค่า Group ID" };
    }

    const message = createTestFlexMessage(company.name);
    const success = await sendLineMessage({
      channelAccessToken: company.lineChannelAccessToken,
      to: company.lineGroupId,
      messages: [message],
    });

    if (!success) {
      return { success: false, error: "ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบ Channel Access Token และ Group ID" };
    }

    return { success: true };
  } catch (error) {
    console.error("Test notification error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการส่งข้อความ" };
  }
}
