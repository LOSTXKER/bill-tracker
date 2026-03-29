import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiError, ApiErrors } from "@/lib/api/errors";
import { extractRowsFromPdf } from "@/lib/reconcile/pdf-extract";

export type { ExtractedRow } from "@/lib/reconcile/pdf-extract";

const MAX_PDF_SIZE_MB = 10;

export const POST = withCompanyAccessFromParams(
  async (request) => {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw ApiErrors.badRequest("ไม่พบไฟล์ PDF");
    }

    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      throw ApiErrors.badRequest(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_PDF_SIZE_MB} MB)`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await extractRowsFromPdf(buffer);

    if (rows.length === 0) {
      throw new ApiError(
        422,
        "ไม่พบตารางข้อมูลภาษีใน PDF นี้ กรุณาตรวจสอบไฟล์",
        "NO_DATA_FOUND"
      );
    }

    return apiResponse.success({ rows });
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);
