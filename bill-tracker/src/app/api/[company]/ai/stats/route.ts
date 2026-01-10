import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { getStats } from "@/lib/ai/vendor-mapping";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  return pathParts[2];
};

/**
 * GET /api/[company]/ai/stats
 * Get AI learning statistics for dashboard
 */
async function handleGet(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const stats = await getStats(context.company.id);

    return apiResponse.success(stats);
  } catch (error) {
    console.error("AI stats error:", error);
    return apiResponse.error(
      error instanceof Error ? error.message : "ไม่สามารถดึงสถิติได้"
    );
  }
}

export const GET = withCompanyAccess(handleGet, {
  permission: "settings:read",
  getCompanyCode: getCompanyFromPath,
});
