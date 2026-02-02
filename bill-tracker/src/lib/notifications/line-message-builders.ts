/**
 * LINE Message Builders
 * 
 * Functions for creating LINE Flex Messages.
 */

import type {
  LineMessage,
  MessageFormatOptions,
  ApprovalNotificationData,
  DailySummaryData,
} from "./line-types";
import { 
  EXPENSE_STATUS_CONFIG, 
  INCOME_STATUS_CONFIG, 
  DEFAULT_STATUS 
} from "./line-types";
import { formatNumber, formatCurrencyThai, formatDateThai, formatTimeThai, formatDateShort } from "./line-utils";

// =============================================================================
// Expense Messages
// =============================================================================

interface ExpenseMessageData {
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
}

/**
 * Create expense notification (Flex Message)
 */
export function createExpenseFlexMessage(
  expense: ExpenseMessageData, 
  baseUrl?: string, 
  formatOptions?: MessageFormatOptions
): LineMessage {
  const options: MessageFormatOptions = {
    showDetailLink: true,
    showVatBreakdown: true,
    showWhtInfo: true,
    ...formatOptions,
  };

  const status = EXPENSE_STATUS_CONFIG[expense.status] || DEFAULT_STATUS;

  const bodyContents: object[] = [
    // Vendor/Description with icon
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [{ type: "text", text: "🏪", size: "xl" }],
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
  if (options.showVatBreakdown && expense.vatAmount && expense.vatAmount > 0) {
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
              contents: [{ type: "text", text: "ภาษี", size: "xxs", color: "#93C5FD" }],
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
  if (options.showWhtInfo && expense.isWht && expense.whtAmount) {
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
        contents: [{ type: "text", text: "💳 โอนจริง", size: "md", color: "#374151", weight: "bold" }],
        flex: 1,
      },
      {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: `฿${formatNumber(expense.netPaid)}`, size: "xl", color: "#059669", weight: "bold", align: "end" }],
        flex: 1,
      },
    ],
    backgroundColor: "#ECFDF5",
    cornerRadius: "lg",
    paddingAll: "lg",
    margin: "lg",
  });

  // Build footer with view button
  const viewUrl = options.showDetailLink && expense.id && expense.companyCode && baseUrl 
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
            contents: [{ type: "text", text: "💸", size: "xxl" }],
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
            action: { type: "uri", label: "📄 ดูรายละเอียด", uri: viewUrl },
            style: "primary",
            color: "#EF4444",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
      styles: { header: { separator: false } },
    },
  };
}

// =============================================================================
// Income Messages
// =============================================================================

interface IncomeMessageData {
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
}

/**
 * Create income notification (Flex Message)
 */
export function createIncomeFlexMessage(
  income: IncomeMessageData, 
  baseUrl?: string, 
  formatOptions?: MessageFormatOptions
): LineMessage {
  const options: MessageFormatOptions = {
    showDetailLink: true,
    showVatBreakdown: true,
    showWhtInfo: true,
    ...formatOptions,
  };

  const status = INCOME_STATUS_CONFIG[income.status] || DEFAULT_STATUS;

  const bodyContents: object[] = [
    // Customer/Source with icon
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [{ type: "text", text: "👤", size: "xl" }],
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
  if (options.showVatBreakdown && income.vatAmount && income.vatAmount > 0) {
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
              contents: [{ type: "text", text: "ภาษี", size: "xxs", color: "#93C5FD" }],
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
  if (options.showWhtInfo && income.isWhtDeducted && income.whtAmount) {
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
        contents: [{ type: "text", text: "💵 รับจริง", size: "md", color: "#374151", weight: "bold" }],
        flex: 1,
      },
      {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: `฿${formatNumber(income.netReceived)}`, size: "xl", color: "#059669", weight: "bold", align: "end" }],
        flex: 1,
      },
    ],
    backgroundColor: "#ECFDF5",
    cornerRadius: "lg",
    paddingAll: "lg",
    margin: "lg",
  });

  // Add WHT reminder if applicable
  if (income.status === "WHT_PENDING_CERT") {
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

  // Build footer with view button
  const viewUrl = options.showDetailLink && income.id && income.companyCode && baseUrl 
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
            contents: [{ type: "text", text: "💰", size: "xxl" }],
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
            action: { type: "uri", label: "📄 ดูรายละเอียด", uri: viewUrl },
            style: "primary",
            color: "#10B981",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
      styles: { header: { separator: false } },
    },
  };
}

// =============================================================================
// Daily Summary Messages
// =============================================================================

/**
 * Create daily summary notification (Flex Message)
 */
export function createDailySummaryFlexMessage(summary: DailySummaryData): LineMessage {
  const dateStr = formatDateThai(summary.date);

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
          { type: "text", text: `📊 ${summary.companyName}`, weight: "bold", size: "lg" },
          { type: "text", text: dateStr, size: "sm", color: "#666666" },
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
          { type: "separator", margin: "lg" },
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
                { type: "separator", margin: "lg" },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  contents: [
                    { type: "text", text: "⚠️ รายการค้าง", weight: "bold", size: "sm", color: "#F59E0B" },
                    ...(summary.pendingDocs > 0
                      ? [{ type: "text", text: `📄 เอกสารรอส่ง: ${summary.pendingDocs} รายการ`, size: "sm", margin: "sm" }]
                      : []),
                    ...(summary.waitingWhtCerts > 0
                      ? [{ type: "text", text: `📋 รอใบ 50 ทวิ: ${summary.waitingWhtCerts} รายการ`, size: "sm", margin: "sm" }]
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

// =============================================================================
// Test Messages
// =============================================================================

/**
 * Create test notification (Flex Message)
 */
export function createTestFlexMessage(companyName: string): LineMessage {
  const now = new Date();
  const timeStr = formatTimeThai(now);
  const dateStr = formatDateShort(now);

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
            contents: [{ type: "text", text: "🔔", size: "xxl" }],
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
      styles: { header: { separator: false } },
    },
  };
}

// =============================================================================
// Approval Messages
// =============================================================================

/**
 * Create approval request notification (Flex Message)
 */
export function createApprovalRequestFlexMessage(data: ApprovalNotificationData, baseUrl?: string): LineMessage {
  const typeLabel = data.type === "expense" ? "รายจ่าย" : "รายรับ";
  const emoji = data.type === "expense" ? "💸" : "💰";
  const color = data.type === "expense" ? "#EF4444" : "#10B981";
  const bgColor = data.type === "expense" ? "#FEE2E2" : "#D1FAE5";
  
  const viewUrl = baseUrl 
    ? `${baseUrl}/${data.companyCode}/${data.type === "expense" ? "expenses" : "incomes"}/${data.id}`
    : null;

  return {
    type: "flex",
    altText: `⏳ รออนุมัติ${typeLabel} ฿${formatNumber(data.amount)} - ${data.vendorOrCustomer || data.description || "ไม่ระบุ"}`,
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
            contents: [{ type: "text", text: "⏳", size: "xxl" }],
            width: "50px",
            height: "50px",
            backgroundColor: "#FEF3C7",
            cornerRadius: "25px",
            alignItems: "center",
            justifyContent: "center",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `คำขออนุมัติ${typeLabel}`, size: "xs", color: "#9CA3AF" },
              { type: "text", text: data.companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "⏳", size: "sm", align: "center" },
              { type: "text", text: "รออนุมัติ", size: "xxs", color: "#B45309", align: "center", weight: "bold" },
            ],
            backgroundColor: "#FEF3C7",
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
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [{ type: "text", text: emoji, size: "xl" }],
                width: "40px",
                alignItems: "center",
                justifyContent: "center",
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: data.vendorOrCustomer || "ไม่ระบุ", weight: "bold", size: "lg", color: "#1F2937", wrap: true },
                  ...(data.description ? [{ type: "text", text: data.description, size: "xs", color: "#6B7280", wrap: true, margin: "xs" }] : []),
                ],
                flex: 1,
              },
            ],
            spacing: "md",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [{ type: "filler" }],
            height: "1px",
            backgroundColor: "#E5E7EB",
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: `${emoji} ${typeLabel === "รายจ่าย" ? "โอนจริง" : "รับจริง"}`, size: "md", color: "#374151", weight: "bold", flex: 1 },
              { type: "text", text: `฿${formatNumber(data.amount)}`, size: "xl", color: color, weight: "bold", align: "end", flex: 1 },
            ],
            backgroundColor: bgColor,
            cornerRadius: "lg",
            paddingAll: "lg",
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "👤 ผู้ส่งคำขอ:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.submitterName, size: "sm", color: "#374151", weight: "bold", align: "end", flex: 1 },
            ],
            margin: "lg",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      footer: viewUrl ? {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "📋 ดูและอนุมัติ", uri: viewUrl },
            style: "primary",
            color: "#F59E0B",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
    },
  };
}

/**
 * Create approval granted notification (Flex Message)
 */
export function createApprovalGrantedFlexMessage(data: ApprovalNotificationData, baseUrl?: string): LineMessage {
  const typeLabel = data.type === "expense" ? "รายจ่าย" : "รายรับ";
  const emoji = data.type === "expense" ? "💸" : "💰";
  
  const viewUrl = baseUrl 
    ? `${baseUrl}/${data.companyCode}/${data.type === "expense" ? "expenses" : "incomes"}/${data.id}`
    : null;

  return {
    type: "flex",
    altText: `✅ อนุมัติแล้ว ${typeLabel} ฿${formatNumber(data.amount)} - ${data.vendorOrCustomer || data.description || "ไม่ระบุ"}`,
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
            contents: [{ type: "text", text: "✅", size: "xxl" }],
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
              { type: "text", text: `อนุมัติ${typeLabel}แล้ว`, size: "xs", color: "#9CA3AF" },
              { type: "text", text: data.companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "✅", size: "sm", align: "center" },
              { type: "text", text: "อนุมัติแล้ว", size: "xxs", color: "#059669", align: "center", weight: "bold" },
            ],
            backgroundColor: "#D1FAE5",
            cornerRadius: "md",
            paddingAll: "sm",
            width: "70px",
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
            layout: "horizontal",
            contents: [
              { type: "text", text: `${emoji} ${typeLabel}:`, size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: `฿${formatNumber(data.amount)}`, size: "md", color: "#374151", weight: "bold", align: "end", flex: 1 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "📝 รายละเอียด:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.vendorOrCustomer || data.description || "-", size: "sm", color: "#374151", align: "end", flex: 1, wrap: true },
            ],
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [{ type: "filler" }],
            height: "1px",
            backgroundColor: "#E5E7EB",
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "👤 ผู้ส่งคำขอ:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.submitterName, size: "sm", color: "#374151", align: "end", flex: 1 },
            ],
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "✍️ ผู้อนุมัติ:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.approverName || "-", size: "sm", color: "#059669", weight: "bold", align: "end", flex: 1 },
            ],
            margin: "md",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      footer: viewUrl ? {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "📄 ดูรายละเอียด", uri: viewUrl },
            style: "primary",
            color: "#10B981",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
    },
  };
}

/**
 * Create rejection notification (Flex Message)
 */
export function createRejectionFlexMessage(data: ApprovalNotificationData, baseUrl?: string): LineMessage {
  const typeLabel = data.type === "expense" ? "รายจ่าย" : "รายรับ";
  const emoji = data.type === "expense" ? "💸" : "💰";
  
  const viewUrl = baseUrl 
    ? `${baseUrl}/${data.companyCode}/${data.type === "expense" ? "expenses" : "incomes"}/${data.id}`
    : null;

  return {
    type: "flex",
    altText: `❌ ปฏิเสธ${typeLabel} ฿${formatNumber(data.amount)} - ${data.vendorOrCustomer || data.description || "ไม่ระบุ"}`,
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
            contents: [{ type: "text", text: "❌", size: "xxl" }],
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
              { type: "text", text: `ปฏิเสธ${typeLabel}`, size: "xs", color: "#9CA3AF" },
              { type: "text", text: data.companyName, weight: "bold", size: "lg", color: "#111827" },
            ],
            flex: 1,
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "❌", size: "sm", align: "center" },
              { type: "text", text: "ปฏิเสธ", size: "xxs", color: "#DC2626", align: "center", weight: "bold" },
            ],
            backgroundColor: "#FEE2E2",
            cornerRadius: "md",
            paddingAll: "sm",
            width: "60px",
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
            layout: "horizontal",
            contents: [
              { type: "text", text: `${emoji} ${typeLabel}:`, size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: `฿${formatNumber(data.amount)}`, size: "md", color: "#374151", weight: "bold", align: "end", flex: 1 },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "📝 รายละเอียด:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.vendorOrCustomer || data.description || "-", size: "sm", color: "#374151", align: "end", flex: 1, wrap: true },
            ],
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [{ type: "filler" }],
            height: "1px",
            backgroundColor: "#E5E7EB",
            margin: "lg",
          },
          ...(data.rejectedReason ? [{
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💬 เหตุผลที่ปฏิเสธ:", size: "sm", color: "#DC2626", weight: "bold" },
              { type: "text", text: data.rejectedReason, size: "sm", color: "#374151", wrap: true, margin: "sm" },
            ],
            backgroundColor: "#FEF2F2",
            cornerRadius: "md",
            paddingAll: "md",
            margin: "lg",
          }] : []),
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "👤 ผู้ส่งคำขอ:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.submitterName, size: "sm", color: "#374151", align: "end", flex: 1 },
            ],
            margin: "lg",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "✍️ ผู้ปฏิเสธ:", size: "sm", color: "#6B7280", flex: 1 },
              { type: "text", text: data.approverName || "-", size: "sm", color: "#DC2626", weight: "bold", align: "end", flex: 1 },
            ],
            margin: "md",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#F9FAFB",
      },
      footer: viewUrl ? {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "📄 ดูและแก้ไข", uri: viewUrl },
            style: "primary",
            color: "#EF4444",
            height: "sm",
          },
        ],
        paddingAll: "lg",
        backgroundColor: "#FFFFFF",
      } : undefined,
    },
  };
}
