import type { LineMessage, MessageFormatOptions } from "../line-types";
import { INCOME_STATUS_CONFIG, DEFAULT_STATUS } from "../line-types";
import { formatNumber } from "../line-utils";

export interface IncomeMessageData {
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
  hasWhtCert?: boolean;
}

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
            { type: "text", text: `฿${formatNumber(income.amount)}`, size: "sm", color: "#374151", align: "end", flex: 1, weight: "bold" },
          ],
        },
      ],
      margin: "lg",
      spacing: "sm",
    },
  ];

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

  if (income.status === "ACTIVE" && income.isWhtDeducted && !income.hasWhtCert) {
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
