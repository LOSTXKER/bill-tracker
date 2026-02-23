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
 * 1. Filter to companies whose Channel Secret matches the signature
 * 2. If event has a groupId, match by lineGroupId (supports shared bot across companies)
 * 3. If no groupId match, pick the first company without a groupId assigned (new company setup)
 * 4. Fallback to first signature-matched company
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
  if (validCompanies.length === 1) return validCompanies[0];

  // Multiple companies share the same bot — use groupId to distinguish
  if (eventGroupId) {
    const byGroupId = validCompanies.find((c) => c.lineGroupId === eventGroupId);
    if (byGroupId) return byGroupId;
  }

  // No groupId match — pick first company that hasn't been assigned a group yet
  const unassigned = validCompanies.find((c) => !c.lineGroupId);
  if (unassigned) return unassigned;

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

      // Find the matching company for this event
      const company = findMatchingCompany(companies, bodyText, signature, eventGroupId);

      if (!company) {
        log.warn("No matching company found for event", { eventGroupId });
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
