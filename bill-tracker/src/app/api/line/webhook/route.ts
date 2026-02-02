/**
 * LINE Bot Webhook Handler
 * Receives events from LINE Messaging API and processes them
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createApiLogger } from "@/lib/utils/logger";
import {
  verifySignature,
  handleTextMessage,
  handleImageMessage,
  handleJoinEvent,
  type LineWebhookBody,
  type LineCompanyConfig,
} from "@/lib/line";

const log = createApiLogger("line/webhook");

/**
 * POST /api/line/webhook
 * Receive events from LINE Messaging API
 */
export async function POST(request: NextRequest) {
  try {
    // Validate signature header
    const signature = request.headers.get("x-line-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Parse request body
    const bodyText = await request.text();
    const body: LineWebhookBody = JSON.parse(bodyText);

    // Process each event
    for (const event of body.events) {
      log.debug("LINE Event received", { type: event.type, sourceType: event.source?.type });

      // Find company with matching LINE configuration
      const companies = await prisma.company.findMany({
        where: {
          lineChannelSecret: { not: null },
          lineChannelAccessToken: { not: null },
        },
      });

      for (const company of companies) {
        if (!company.lineChannelSecret || !company.lineChannelAccessToken) {
          continue;
        }

        // Verify signature matches this company's secret
        const isValid = verifySignature(
          bodyText,
          signature,
          company.lineChannelSecret
        );

        if (!isValid) {
          continue; // Try next company
        }

        // Create typed company config
        const companyConfig: LineCompanyConfig = {
          id: company.id,
          name: company.name,
          lineChannelSecret: company.lineChannelSecret,
          lineChannelAccessToken: company.lineChannelAccessToken,
          lineGroupId: company.lineGroupId,
        };

        // Auto-save Group ID from any event (in case join event wasn't received)
        const eventGroupId = event.source?.groupId;
        if (eventGroupId && !company.lineGroupId) {
          log.info("Auto-saving Group ID", { groupId: eventGroupId, company: company.name });
          await prisma.company.update({
            where: { id: company.id },
            data: { lineGroupId: eventGroupId },
          });
          // Update local config
          companyConfig.lineGroupId = eventGroupId;
          
          // Send welcome message for newly detected group (only if not a join event, to avoid duplicate)
          if (event.type !== "join" && event.replyToken) {
            const { replyToLine } = await import("@/lib/line/api");
            await replyToLine(
              event.replyToken,
              [
                {
                  type: "text",
                  text: `✅ เชื่อมต่อ ${company.name} สำเร็จ!\n\nบอทพร้อมส่งแจ้งเตือนรายรับ-รายจ่ายแล้ว\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้`,
                },
              ],
              company.lineChannelAccessToken
            );
            // Skip further processing for this event since we've already replied
            break;
          }
        }

        // Process event based on type
        switch (event.type) {
          case "message":
            if (event.message?.type === "text") {
              await handleTextMessage(
                event,
                companyConfig,
                company.lineChannelAccessToken
              );
            } else if (event.message?.type === "image") {
              await handleImageMessage(
                event,
                companyConfig,
                company.lineChannelAccessToken
              );
            }
            break;

          case "join":
            await handleJoinEvent(
              event,
              companyConfig,
              company.lineChannelAccessToken
            );
            break;

          default:
            log.debug("Unhandled event type", { type: event.type });
        }

        // Event processed, no need to check other companies
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("LINE webhook error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/line/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "LINE Bot webhook is running",
  });
}
