import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sendTestNotification } from "@/lib/notifications/line-messaging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/[id]/line-config
 * Get LINE Bot configuration (with masked tokens for security)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Verify user has access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId,
        },
      },
    });

    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get company LINE config
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        lineChannelSecret: true,
        lineChannelAccessToken: true,
        lineGroupId: true,
        lineNotifyEnabled: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Mask sensitive data
    const maskToken = (token: string | null) => {
      if (!token) return null;
      if (token.length <= 8) return "••••••••";
      return token.substring(0, 4) + "••••••••" + token.substring(token.length - 4);
    };

    return NextResponse.json({
      channelSecret: maskToken(company.lineChannelSecret),
      channelAccessToken: maskToken(company.lineChannelAccessToken),
      groupId: company.lineGroupId,
      notifyEnabled: company.lineNotifyEnabled,
      isConfigured: !!(company.lineChannelSecret && company.lineChannelAccessToken),
    });
  } catch (error) {
    console.error("Failed to get LINE config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/line-config
 * Update LINE Bot configuration
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Verify user has OWNER access
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId,
        },
      },
    });

    if (!access || !access.isOwner) {
      return NextResponse.json(
        { error: "Only owners can update LINE configuration" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { channelSecret, channelAccessToken, groupId, notifyEnabled } = body;

    // If only toggling notification
    if (typeof notifyEnabled === "boolean" && !channelSecret && !channelAccessToken) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          lineNotifyEnabled: notifyEnabled,
        },
      });

      return NextResponse.json({
        success: true,
        message: `LINE notifications ${notifyEnabled ? "enabled" : "disabled"}`,
        notifyEnabled,
      });
    }

    // Validate required fields for full config update
    if (!channelSecret || !channelAccessToken) {
      return NextResponse.json(
        { error: "Channel Secret and Access Token are required" },
        { status: 400 }
      );
    }

    // Basic validation
    if (channelSecret.length < 10 || channelAccessToken.length < 10) {
      return NextResponse.json(
        { error: "Invalid credentials format" },
        { status: 400 }
      );
    }

    // Update company LINE config
    await prisma.company.update({
      where: { id: companyId },
      data: {
        lineChannelSecret: channelSecret,
        lineChannelAccessToken: channelAccessToken,
        lineGroupId: groupId || null,
        lineNotifyEnabled: notifyEnabled !== false, // Default to true
      },
    });

    return NextResponse.json({
      success: true,
      message: "LINE Bot configuration updated successfully",
      isConfigured: true,
    });
  } catch (error) {
    console.error("Failed to update LINE config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/line-config
 * Remove LINE Bot configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Verify user has OWNER access
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId,
        },
      },
    });

    if (!access || !access.isOwner) {
      return NextResponse.json(
        { error: "Only owners can remove LINE configuration" },
        { status: 403 }
      );
    }

    // Clear LINE config
    await prisma.company.update({
      where: { id: companyId },
      data: {
        lineChannelSecret: null,
        lineChannelAccessToken: null,
        lineGroupId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "LINE Bot configuration removed successfully",
    });
  } catch (error) {
    console.error("Failed to remove LINE config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/[id]/line-config
 * Send test notification
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Verify user has access to this company
    const access = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId,
        },
      },
    });

    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Send test notification
    const result = await sendTestNotification(companyId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ส่งข้อความทดสอบสำเร็จ!",
    });
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
