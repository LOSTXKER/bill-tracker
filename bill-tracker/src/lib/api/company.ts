/**
 * Company Utility Functions
 * Shared utilities for company-related operations
 */

import { prisma } from "@/lib/db";
import type { Company } from "@prisma/client";

/**
 * Get company from company code in URL path
 * @param companyCode - Company code from URL path (e.g., "ANJ", "MLK")
 * @returns Result with success flag and company data
 */
export async function getCompanyFromPath(companyCode: string): Promise<{
  success: boolean;
  company: Company | null;
}> {
  try {
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
    });

    return {
      success: !!company,
      company,
    };
  } catch (error) {
    console.error("Error fetching company:", error);
    return {
      success: false,
      company: null,
    };
  }
}

/**
 * Verify user has access to company
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns True if user has access
 */
export async function hasCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  return !!access;
}
