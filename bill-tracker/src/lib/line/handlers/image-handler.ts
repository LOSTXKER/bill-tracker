/**
 * LINE Image Message Handler
 * Handles image messages (receipt OCR) sent to the LINE bot
 */

import type { LineWebhookEvent, LineCompanyConfig } from "../types";
import { replyToLine, pushMessageToLine, downloadLineImage } from "../api";
import { analyzeImage } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("line-image-handler");

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

    // Convert buffer to base64
    const base64Image = imageBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Analyze with AI
    const prompt = `วิเคราะห์ใบเสร็จ/เอกสารนี้ แล้วสรุปข้อมูลสำคัญ:

ตอบเป็นภาษาไทย ในรูปแบบข้อความธรรมดา (ไม่ใช่ JSON) ประมาณ 5-10 บรรทัด

ข้อมูลที่ต้องการ:
- ชื่อร้าน/บริษัท
- เลขประจำตัวผู้เสียภาษี (ถ้ามี)
- วันที่
- รายการสินค้า/บริการ (ถ้ามี)
- ยอดก่อน VAT
- VAT (ถ้ามี)
- ยอดรวม
- หัก ณ ที่จ่าย (ถ้ามี)
- ยอดสุทธิที่ต้องจ่าย

ถ้าไม่มีข้อมูลใดให้ข้ามไป`;

    const result = await analyzeImage(dataUrl, prompt, {
      temperature: 0.2,
      maxTokens: 1024,
    });

    if (result.error) {
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

    // Send OCR result
    await pushMessageToLine(
      recipient,
      [
        {
          type: "text",
          text: `✅ ผลการวิเคราะห์\n${"━".repeat(20)}\n${result.data}`,
        },
      ],
      channelAccessToken
    );

    log.info("Receipt analyzed via LINE", { companyId: company.id });
  } catch (error) {
    log.error("LINE OCR error", error);
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
