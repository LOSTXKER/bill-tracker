import { uploadToSupabase } from "@/lib/storage/supabase";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw ApiErrors.badRequest("ไม่พบไฟล์");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw ApiErrors.badRequest("ไฟล์ต้องมีขนาดไม่เกิน 30MB");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw ApiErrors.badRequest("ไฟล์ต้องเป็น PDF, Excel หรือ CSV เท่านั้น");
    }

    const folder = `reconcile/${company.code.toLowerCase()}`;
    const { url, path } = await uploadToSupabase(file, folder, file.name);

    return apiResponse.success({ url, path, fileName: file.name });
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);
