import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { mergeSettings, LineNotifySettings } from "@/lib/notifications/settings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/[id]/line-config/settings
 * Get LINE notification settings
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Get company LINE notify settings
    const lineConfig = await prisma.company.findUnique({
      where: { id: company.id },
      select: {
        lineNotifySettings: true,
        lineNotifyEnabled: true,
      },
    });

    if (!lineConfig) {
      return apiResponse.notFound("Company not found");
    }

    // Merge with defaults
    const settings = mergeSettings(
      lineConfig.lineNotifySettings as Partial<LineNotifySettings> | null
    );

    return apiResponse.success({
      settings,
      globalEnabled: lineConfig.lineNotifyEnabled,
    });
  },
  { permission: "settings:read" }
);

/**
 * POST /api/companies/[id]/line-config/settings
 * Update LINE notification settings
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return apiResponse.badRequest("Settings are required");
    }

    // Validate settings structure
    if (typeof settings !== "object") {
      return apiResponse.badRequest("Invalid settings format");
    }

    // Merge with defaults to ensure all required fields exist
    const mergedSettings = mergeSettings(settings);

    // Update company notification settings
    await prisma.company.update({
      where: { id: company.id },
      data: {
        lineNotifySettings: mergedSettings as any,
      },
    });

    return apiResponse.success(
      { settings: mergedSettings },
      "Notification settings updated successfully"
    );
  },
  {
    permission: "settings:edit",
    requireOwner: true,
  }
);
