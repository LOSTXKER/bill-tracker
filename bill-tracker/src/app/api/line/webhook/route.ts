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

type CompanyWithLine = {
  id: string;
  name: string;
  lineChannelSecret: string | null;
  lineChannelAccessToken: string | null;
  lineGroupId: string | null;
};

/**
 * Find the correct company for a LINE event.
 * Strictly matches by groupId — will NOT process events from unconfigured groups.
 * This allows the bot to be shared across multiple systems without interference.
 */
function findMatchingCompany(
  companies: CompanyWithLine[],
  bodyText: string,
  signature: string,
  eventGroupId?: string
): CompanyWithLine | null {
  const validCompanies = companies.filter(
    (c) => c.lineChannelSecret && c.lineChannelAccessToken &&
      verifySignature(bodyText, signature, c.lineChannelSecret)
  );

  if (validCompanies.length === 0) return null;

  // Group event — strictly match by groupId only
  if (eventGroupId) {
    return validCompanies.find((c) => c.lineGroupId === eventGroupId) || null;
  }

  // 1-on-1 chat (no groupId) — use first matching company
  return validCompanies[0];
}

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

    // Find all companies with LINE configuration
    const companies = await prisma.company.findMany({
      where: {
        lineChannelSecret: { not: null },
        lineChannelAccessToken: { not: null },
      },
    });

    // Process each event
    for (const event of body.events) {
      log.debug("LINE Event received", { type: event.type, sourceType: event.source?.type });

      const eventGroupId = event.source?.groupId;

      // Find the matching company for this event (strict groupId match)
      const company = findMatchingCompany(companies, bodyText, signature, eventGroupId);

      if (!company) {
        log.debug("Ignoring event from unconfigured group", { eventGroupId });
        continue;
      }

      const companyConfig: LineCompanyConfig = {
        id: company.id,
        name: company.name,
        lineChannelSecret: company.lineChannelSecret!,
        lineChannelAccessToken: company.lineChannelAccessToken!,
        lineGroupId: company.lineGroupId,
      };

      // Process event based on type
      switch (event.type) {
        case "message":
          if (event.message?.type === "text") {
            await handleTextMessage(event, companyConfig, company.lineChannelAccessToken!);
          } else if (event.message?.type === "image") {
            await handleImageMessage(event, companyConfig, company.lineChannelAccessToken!);
          }
          break;

        case "join":
          await handleJoinEvent(event, companyConfig, company.lineChannelAccessToken!);
          break;

        default:
          log.debug("Unhandled event type", { type: event.type });
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
