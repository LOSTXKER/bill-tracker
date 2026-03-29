import type { LineMessage, MessageFormatOptions } from "../line-types";
import { EXPENSE_STATUS_CONFIG, DEFAULT_STATUS } from "../line-types";
import { formatNumber } from "../line-utils";

export interface ExpenseMessageData {
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
