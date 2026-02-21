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
  unauthorized: () => new ApiError(401, "กรุณาเข้าสู่ระบบ", "UNAUTHORIZED"),
  forbidden: (message = "คุณไม่มีสิทธิ์ดำเนินการนี้") => new ApiError(403, message, "FORBIDDEN"),
  notFound: (resource = "รายการ") => new ApiError(404, `ไม่พบ${resource}`, "NOT_FOUND"),
  badRequest: (message = "ข้อมูลไม่ถูกต้อง") => new ApiError(400, message, "BAD_REQUEST"),
  tooManyRequests: () => new ApiError(429, "คำขอมากเกินไป กรุณารอสักครู่", "RATE_LIMITED"),
  internal: (message = "เกิดข้อผิดพลาดภายในระบบ") => new ApiError(500, message, "INTERNAL_ERROR"),
  conflict: (message = "ข้อมูลขัดแย้ง") => new ApiError(409, message, "CONFLICT"),
  unprocessable: (message = "ไม่สามารถประมวลผลได้") => new ApiError(422, message, "UNPROCESSABLE"),
};
