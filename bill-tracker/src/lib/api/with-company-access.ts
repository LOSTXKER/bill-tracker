/**
 * Company Access Wrapper for API Routes
 * Combines authentication, company access check, and permission verification
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/checker";
import { rateLimit, getClientIP } from "@/lib/security/rate-limit";
import { apiResponse } from "./response";
import { ApiError, ApiErrors } from "./errors";
import { withAuth, type AuthenticatedContext } from "./with-auth";
import type { Company } from "@prisma/client";

export interface CompanyAccessContext extends AuthenticatedContext {
  company: Company;
  companyCode: string;
}

interface CompanyAccessOptions {
  permission?: string;
  requireOwner?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  getCompanyCode?: (request: Request) => Promise<string> | string;
}

type CompanyAccessHandler = (
  request: Request,
  context: CompanyAccessContext
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper that checks company access and permissions
 * Usage:
 * export const GET = withCompanyAccess(
 *   async (request, { session, company }) => {
 *     const expenses = await prisma.expense.findMany({ where: { companyId: company.id } });
 *     return apiResponse.success({ expenses });
 *   },
 *   { permission: "expenses:read" }
 * );
 */
export function withCompanyAccess(
  handler: CompanyAccessHandler,
  options: CompanyAccessOptions = {}
): (request: Request) => Promise<NextResponse> {
  return withAuth(async (request, { session }) => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const ip = getClientIP(request);
        const { success, headers } = rateLimit(ip, options.rateLimit);

        if (!success) {
          return apiResponse.error(ApiErrors.tooManyRequests(), headers);
        }
      }

      // Get company code
      let companyCode: string;
      if (options.getCompanyCode) {
        companyCode = await options.getCompanyCode(request);
      } else {
        // Try to get from query params
        const { searchParams } = new URL(request.url);
        const codeFromQuery = searchParams.get("company");
        if (codeFromQuery) {
          companyCode = codeFromQuery;
        } else {
          // Try to get from body for POST/PUT requests
          const contentType = request.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            try {
              const body = await request.json();
              companyCode = body.companyCode;
              // Re-create request with body for handler
              request = new Request(request.url, {
                method: request.method,
                headers: request.headers,
                body: JSON.stringify(body),
              });
            } catch {
              throw ApiErrors.badRequest("Company code required");
            }
          } else {
            throw ApiErrors.badRequest("Company code required");
          }
        }
      }

      if (!companyCode) {
        throw ApiErrors.badRequest("Company code required");
      }

      // Find company
      const company = await prisma.company.findUnique({
        where: { code: companyCode.toUpperCase() },
      });

      if (!company) {
        throw ApiErrors.notFound("Company");
      }

      // Check company access
      const access = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: session.user.id,
            companyId: company.id,
          },
        },
      });

      if (!access) {
        throw ApiErrors.forbidden("You don't have access to this company");
      }

      // Check if owner is required
      if (options.requireOwner && !access.isOwner) {
        throw ApiErrors.forbidden("Owner access required");
      }

      // Check specific permission
      if (options.permission) {
        const hasAccess = await hasPermission(
          session.user.id,
          company.id,
          options.permission
        );

        if (!hasAccess) {
          throw ApiErrors.forbidden(
            `Missing permission: ${options.permission}`
          );
        }
      }

      return await handler(request, {
        session,
        company,
        companyCode: companyCode.toUpperCase(),
      });
    } catch (error) {
      console.error("Company access error:", error);

      if (error instanceof ApiError) {
        return apiResponse.error(error);
      }

      return apiResponse.error(
        error instanceof Error ? error : new Error("Internal server error")
      );
    }
  });
}

/**
 * Wrapper for routes with company ID in path params
 * Usage with Next.js dynamic routes:
 * export const GET = withCompanyAccessFromParams(
 *   async (request, { session, company, params }) => {
 *     return apiResponse.success({ company });
 *   },
 *   { permission: "company:read" }
 * );
 */
export function withCompanyAccessFromParams(
  handler: (
    request: Request,
    context: CompanyAccessContext & { params: any }
  ) => Promise<NextResponse> | NextResponse,
  options: Omit<CompanyAccessOptions, "getCompanyCode"> = {}
) {
  return async (
    request: Request,
    routeContext: { params: Promise<any> }
  ): Promise<NextResponse> => {
    const params = await routeContext.params;

    return withCompanyAccess(
      async (req, ctx) => {
        return handler(req, { ...ctx, params });
      },
      {
        ...options,
        getCompanyCode: async () => {
          // Try different param names
          return params.company || params.companyId || params.code;
        },
      }
    )(request);
  };
}
