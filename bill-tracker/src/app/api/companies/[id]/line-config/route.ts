import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { sendTestNotification } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/[id]/line-config
 * Get LINE Bot configuration (with masked tokens for security)
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Get company LINE config
    const lineConfig = await prisma.company.findUnique({
      where: { id: company.id },
      select: {
        lineChannelSecret: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
        lineNotifyEnabled: true,
      },
    });

    if (!lineConfig) {
      return apiResponse.notFound("Company not found");
    }

    // Mask sensitive data
    const maskToken = (token: string | null) => {
      if (!token) return null;
      if (token.length <= 8) return "••••••••";
      return token.substring(0, 4) + "••••••••" + token.substring(token.length - 4);
    };

    return apiResponse.success({
      channelSecret: maskToken(lineConfig.lineChannelSecret),
      channelAccessToken: maskToken(lineConfig.lineChannelAccessToken),
      groupId: lineConfig.lineGroupId,
      notifyEnabled: lineConfig.lineNotifyEnabled,
      isConfigured: !!(lineConfig.lineChannelSecret && lineConfig.lineChannelAccessToken),
    });
  },
  { permission: "settings:read" }
);

/**
 * POST /api/companies/[id]/line-config
 * Update LINE Bot configuration
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    const body = await request.json();
    const { channelSecret, channelAccessToken, groupId, notifyEnabled } = body;

    // If only toggling notification
    if (typeof notifyEnabled === "boolean" && !channelSecret && !channelAccessToken) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          lineNotifyEnabled: notifyEnabled,
        },
      });

      return apiResponse.success(
        { notifyEnabled },
        `LINE notifications ${notifyEnabled ? "enabled" : "disabled"}`
      );
    }

    // Validate required fields for full config update
    if (!channelSecret || !channelAccessToken) {
      return apiResponse.badRequest("Channel Secret and Access Token are required");
    }

    // Basic validation
    if (channelSecret.length < 10 || channelAccessToken.length < 10) {
      return apiResponse.badRequest("Invalid credentials format");
    }

    // Update company LINE config
    await prisma.company.update({
      where: { id: company.id },
      data: {
        lineChannelSecret: channelSecret,
        lineChannelAccessToken: channelAccessToken,
        lineGroupId: groupId || null,
        lineNotifyEnabled: notifyEnabled !== false, // Default to true
      },
    });

    return apiResponse.success(
      { isConfigured: true },
      "LINE Bot configuration updated successfully"
    );
  },
  {
    permission: "settings:edit",
    requireOwner: true,
  }
);

/**
 * DELETE /api/companies/[id]/line-config
 * Remove LINE Bot configuration
 */
export const DELETE = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Clear LINE config
    await prisma.company.update({
      where: { id: company.id },
      data: {
        lineChannelSecret: null,
        lineChannelAccessToken: null,
        lineGroupId: null,
      },
    });

    return apiResponse.success(
      { message: "LINE Bot configuration removed successfully" }
    );
  },
  {
    permission: "settings:edit",
    requireOwner: true,
  }
);

/**
 * PUT /api/companies/[id]/line-config
 * Send test notification
 */
export const PUT = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Send test notification
    const result = await sendTestNotification(company.id);

    if (!result.success) {
      return apiResponse.badRequest(result.error || "Failed to send test notification");
    }

    return apiResponse.success(
      { message: "ส่งข้อความทดสอบสำเร็จ!" }
    );
  },
  { permission: "settings:read" }
);
