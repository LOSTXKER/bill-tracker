/**
 * Authentication Wrapper for API Routes
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiResponse } from "./response";
import { ApiError } from "./errors";
import type { Session } from "next-auth";

export interface AuthenticatedContext {
  session: Session;
}

type AuthenticatedHandler<T = any> = (
  request: Request,
  context: AuthenticatedContext,
  routeContext?: T
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper that ensures the user is authenticated
 * Usage:
 * export const GET = withAuth(async (request, { session }) => {
 *   return apiResponse.success({ user: session.user });
 * });
 * 
 * For dynamic routes with params:
 * export const GET = withAuth(async (request, { session }, routeContext) => {
 *   const { id } = await routeContext.params;
 *   return apiResponse.success({ id });
 * });
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>
): (request: Request, context?: T) => Promise<NextResponse> {
  return async (request: Request, routeContext?: T) => {
    try {
      const session = await auth();

      if (!session?.user) {
        return apiResponse.unauthorized();
      }

      return await handler(request, { session }, routeContext);
    } catch (error) {
      console.error("Auth error:", error);

      if (error instanceof ApiError) {
        return apiResponse.error(error);
      }

      return apiResponse.error(
        error instanceof Error ? error : new Error("Internal server error")
      );
    }
  };
}
