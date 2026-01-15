"use server";

import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/db-utils";
import { unstable_cache } from "next/cache";

/**
 * Get company by code with caching
 * Cache for 1 hour (3600 seconds)
 */
export const getCompanyByCode = unstable_cache(
  async (code: string) => {
    return withRetry(async () => {
      const company = await prisma.company.findUnique({
        where: { code: code.toUpperCase() },
        select: {
          id: true,
          name: true,
          code: true,
          taxId: true,
          logoUrl: true,
        },
      });
      return company;
    });
  },
  ["company-by-code"],
  { revalidate: 3600 } // Cache for 1 hour
);

/**
 * Get company ID by code (simpler cache for common lookup)
 */
export const getCompanyId = unstable_cache(
  async (code: string) => {
    return withRetry(async () => {
      const company = await prisma.company.findUnique({
        where: { code: code.toUpperCase() },
        select: { id: true },
      });
      return company?.id || null;
    });
  },
  ["company-id"],
  { revalidate: 3600 }
);
