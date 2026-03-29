import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import {
  parseExcelFile,
  buildContactPreview,
  importContacts,
} from "@/lib/import/contacts-import";

async function parseFileFromRequest(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return null;

  const buffer = await file.arrayBuffer();
  return { buffer, mode: (formData.get("mode") as string) || "merge" };
}

export const POST = withCompanyAccess(
  async (request, { company, session }) => {
    try {
      const { searchParams } = new URL(request.url);
      const isPreview = searchParams.get("preview") === "true";

      const parsed = await parseFileFromRequest(request);
      if (!parsed) {
        return apiResponse.badRequest("ไม่พบไฟล์");
      }

      const parsedContacts = parseExcelFile(parsed.buffer);
      if (parsedContacts.length === 0) {
        return apiResponse.badRequest("ไม่พบข้อมูลผู้ติดต่อในไฟล์");
      }

      if (isPreview) {
        const preview = await buildContactPreview(parsedContacts, company.id);
        return apiResponse.success(preview);
      }

      const result = await importContacts(
        parsedContacts,
        company.id,
        parsed.mode,
        session.user.id
      );
      return apiResponse.success(result);
    } catch (error: any) {
      console.error("Contact import error:", error);
      return apiResponse.error(error);
    }
  },
  {
    permission: "contacts:create",
    rateLimit: { maxRequests: 10, windowMs: 60000 },
  }
);
