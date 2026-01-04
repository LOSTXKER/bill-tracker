/**
 * Standardized API Response Utilities
 */

import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export const apiResponse = {
  /**
   * Return a successful JSON response
   */
  success<T>(data: T, message?: string, status = 200): NextResponse {
    const body: ApiSuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };
    return NextResponse.json(body, { status });
  },

  /**
   * Return a created response (201)
   */
  created<T>(data: T, message?: string): NextResponse {
    return this.success(data, message, 201);
  },

  /**
   * Return an error response
   */
  error(error: ApiError | Error | string, headers?: Record<string, string>): NextResponse {
    if (error instanceof ApiError) {
      const body: ApiErrorResponse = {
        success: false,
        error: error.message,
        code: error.code,
      };
      return NextResponse.json(body, { 
        status: error.statusCode,
        headers,
      });
    }

    if (error instanceof Error) {
      const body: ApiErrorResponse = {
        success: false,
        error: error.message,
      };
      return NextResponse.json(body, { status: 500, headers });
    }

    const body: ApiErrorResponse = {
      success: false,
      error: error,
    };
    return NextResponse.json(body, { status: 500, headers });
  },

  /**
   * Return a 404 Not Found response
   */
  notFound(message = "Resource not found"): NextResponse {
    return NextResponse.json(
      { success: false, error: message, code: "NOT_FOUND" },
      { status: 404 }
    );
  },

  /**
   * Return a 401 Unauthorized response
   */
  unauthorized(message = "Unauthorized"): NextResponse {
    return NextResponse.json(
      { success: false, error: message, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  },

  /**
   * Return a 403 Forbidden response
   */
  forbidden(message = "Access denied"): NextResponse {
    return NextResponse.json(
      { success: false, error: message, code: "FORBIDDEN" },
      { status: 403 }
    );
  },

  /**
   * Return a 400 Bad Request response
   */
  badRequest(message = "Bad request"): NextResponse {
    return NextResponse.json(
      { success: false, error: message, code: "BAD_REQUEST" },
      { status: 400 }
    );
  },
};
