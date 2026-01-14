/**
 * LINE Image Message Handler
 * Handles image messages (receipt OCR) sent to the LINE bot
 */

import type { LineWebhookEvent, LineCompanyConfig } from "../types";
import { replyToLine, pushMessageToLine, downloadLineImage } from "../api";
import {
  analyzeReceipt,
  formatReceiptData,
  validateReceiptData,
  getDocumentTypeName,
} from "@/lib/ai/receipt-ocr";

/**
 * Handle image message (receipt OCR)
 */
export async function handleImageMessage(
  event: LineWebhookEvent,
  company: LineCompanyConfig,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken;
  const messageId = event.message?.id;

  if (!replyToken || !messageId) return;

  // Get recipient for push messages
  const recipient = event.source.groupId || event.source.userId || "";

  // Send processing message first
  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: "📷 ได้รับรูปใบเสร็จแล้ว!\n\n🤖 กำลังวิเคราะห์ด้วย AI... กรุณารอสักครู่",
      },
    ],
    channelAccessToken
  );

  try {
    // Download image from LINE
    const imageBuffer = await downloadLineImage(messageId, channelAccessToken);

    if (!imageBuffer) {
      await pushMessageToLine(
        recipient,
        [
          {
            type: "text",
            text: "❌ ไม่สามารถดาวน์โหลดรูปได้\nกรุณาลองส่งใหม่อีกครั้ง",
          },
        ],
        channelAccessToken
      );
      return;
    }

    // Analyze receipt with AI
    const result = await analyzeReceipt(imageBuffer, "image/jpeg");

    if ("error" in result) {
      await pushMessageToLine(
        recipient,
        [
          {
            type: "text",
            text: `❌ ไม่สามารถวิเคราะห์ใบเสร็จได้\n\nข้อผิดพลาด: ${result.error}`,
          },
        ],
        channelAccessToken
      );
      return;
    }

    // Validate data completeness
    const validation = validateReceiptData(result);

    // Format result for LINE
    let responseText = formatReceiptData(result);

    // Add validation warnings if any
    if (validation.missingFields.length > 0) {
      responseText += `\n\n⚠️ ข้อมูลที่ขาด: ${validation.missingFields.join(", ")}`;
    }
    if (validation.warnings.length > 0 && validation.warnings.length <= 3) {
      responseText += `\n\n💡 หมายเหตุ: ${validation.warnings.join(", ")}`;
    }

    // Add document type info
    if (result.documentType) {
      responseText = `📑 ${getDocumentTypeName(result.documentType)}\n${"━".repeat(20)}\n${responseText}`;
    }

    // Send OCR result
    await pushMessageToLine(
      recipient,
      [
        {
          type: "text",
          text: responseText,
        },
      ],
      channelAccessToken
    );

    // Log OCR analysis
    console.log(
      `[LINE OCR] Company ${company.id}: analyzed receipt, confidence=${result.confidence.overall}%`
    );
  } catch (error) {
    console.error("LINE OCR error:", error);
    await pushMessageToLine(
      recipient,
      [
        {
          type: "text",
          text: "❌ เกิดข้อผิดพลาดในการวิเคราะห์\nกรุณาลองใหม่อีกครั้ง",
        },
      ],
      channelAccessToken
    );
  }
}
