import type { LineMessage, DailySummaryData } from "../line-types";
import { formatCurrencyThai, formatDateThai, formatTimeThai, formatDateShort } from "../line-utils";

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
