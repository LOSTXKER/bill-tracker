/**
 * Centralized API Error Handling
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const ApiErrors = {
  unauthorized: () => new ApiError(401, "Unauthorized", "UNAUTHORIZED"),
  forbidden: (message = "Access denied") => new ApiError(403, message, "FORBIDDEN"),
  notFound: (resource = "Resource") => new ApiError(404, `${resource} not found`, "NOT_FOUND"),
  badRequest: (message = "Bad request") => new ApiError(400, message, "BAD_REQUEST"),
  tooManyRequests: () => new ApiError(429, "Too many requests", "RATE_LIMITED"),
  internal: (message = "Internal server error") => new ApiError(500, message, "INTERNAL_ERROR"),
  conflict: (message = "Conflict") => new ApiError(409, message, "CONFLICT"),
  unprocessable: (message = "Unprocessable entity") => new ApiError(422, message, "UNPROCESSABLE"),
};
