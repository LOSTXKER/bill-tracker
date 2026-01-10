import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { suggestAccount } from "@/lib/ai/account-suggestion";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  return pathParts[2];
};

/**
 * POST /api/[company]/ai/suggest-account
 * AI-powered account suggestion based on vendor name, description, and/or images
 */
async function handlePost(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const body = await req.json();
    const { 
      transactionType, 
      vendorName,
      vendorTaxId,
      description,
      items,
      imageUrls,
    } = body;

    if (!transactionType || !["EXPENSE", "INCOME"].includes(transactionType)) {
      return apiResponse.badRequest("transactionType must be EXPENSE or INCOME");
    }

    // Use the unified suggestAccount function
    const result = await suggestAccount(
      context.company.id,
      transactionType as "EXPENSE" | "INCOME",
      {
        vendorName,
        vendorTaxId,
        description,
        items,
        imageUrls,
      }
    );

    return apiResponse.success({
      accountId: result.accountId,
      accountCode: result.accountCode,
      accountName: result.accountName,
      confidence: result.confidence,
      reason: result.reason,
      source: result.source,
      useCount: result.useCount,
      suggestNewAccount: result.suggestNewAccount,
    });
  } catch (error) {
    console.error("Account suggestion error:", error);
    return apiResponse.error(
      error instanceof Error ? error.message : "ไม่สามารถแนะนำบัญชีได้"
    );
  }
}

export const POST = withCompanyAccess(handlePost, {
  permission: "expenses:read",
  getCompanyCode: getCompanyFromPath,
});
