import type { LineMessage, ApprovalNotificationData } from "../line-types";
import { formatNumber } from "../line-utils";

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
