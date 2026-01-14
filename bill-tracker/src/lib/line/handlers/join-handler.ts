/**
 * LINE Join Event Handler
 * Handles events when bot is added to a group
 */

import { prisma } from "@/lib/db";
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

  const groupId = event.source.groupId;

  // Auto-save group ID if available
  if (groupId && company) {
    await prisma.company.update({
      where: { id: company.id },
      data: { lineGroupId: groupId },
    });
  }

  // Send welcome message
  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text: `👋 สวัสดีครับ!\n\nผมคือบอทจัดการบัญชีสำหรับ ${company?.name || "บริษัทของคุณ"}\n\n✅ Group ID ถูกบันทึกอัตโนมัติแล้ว\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้`,
      },
    ],
    channelAccessToken
  );
}
