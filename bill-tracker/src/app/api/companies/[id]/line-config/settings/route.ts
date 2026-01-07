import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { mergeSettings, LineNotifySettings } from "@/lib/notifications/settings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/[id]/line-config/settings
 * Get LINE notification settings
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

    // Get company LINE notify settings
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        lineNotifySettings: true,
        lineNotifyEnabled: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Merge with defaults
    const settings = mergeSettings(
      company.lineNotifySettings as Partial<LineNotifySettings> | null
    );

    return NextResponse.json({
      settings,
      globalEnabled: company.lineNotifyEnabled,
    });
  } catch (error) {
    console.error("Failed to get LINE notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/line-config/settings
 * Update LINE notification settings
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
        { error: "Only owners can update notification settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Settings are required" },
        { status: 400 }
      );
    }

    // Validate settings structure
    if (typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings format" },
        { status: 400 }
      );
    }

    // Merge with defaults to ensure all required fields exist
    const mergedSettings = mergeSettings(settings);

    // Update company notification settings
    await prisma.company.update({
      where: { id: companyId },
      data: {
        lineNotifySettings: mergedSettings as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully",
      settings: mergedSettings,
    });
  } catch (error) {
    console.error("Failed to update LINE notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
