/**
 * LINE Join Event Handler
 * Handles events when bot is added to a group
 */

import type { LineWebhookEvent, LineCompanyConfig } from "../types";
import { replyToLine } from "../api";

/**
 * Handle join event (bot added to group)
 */
export async function handleJoinEvent(
  event: LineWebhookEvent,
  company: LineCompanyConfig,
  channelAccessToken: string
): Promise<void> {
  const replyToken = event.replyToken;
  if (!replyToken) return;

  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `👋 สวัสดีครับ!\n\nผมคือบอทจัดการบัญชีสำหรับ ${company?.name || "บริษัทของคุณ"}\n\nพิมพ์ "group id" เพื่อดู Group ID สำหรับตั้งค่าบนเว็บ\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้`,
      },
    ],
    channelAccessToken
  );
}
