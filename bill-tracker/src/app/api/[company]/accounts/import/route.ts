import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import {
  parseAccountsFromExcel,
  previewAccounts,
  importAccountsReplace,
  importAccountsMerge,
} from "@/lib/import/accounts-import";

async function handleRequest(
  req: Request,
  context: { company: { id: string; code: string; name: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "true";

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return apiResponse.badRequest("กรุณาเลือกไฟล์ Excel");
    }

    const buffer = await file.arrayBuffer();
    const parsedAccounts = parseAccountsFromExcel(buffer);

    if (parsedAccounts.length === 0) {
      return apiResponse.badRequest("ไม่พบบัญชีรายได้/ค่าใช้จ่ายในไฟล์");
    }

    if (isPreview) {
      const preview = await previewAccounts(
        context.company.id,
        parsedAccounts
      );
      return apiResponse.success(preview);
    }

    const mode = (formData.get("mode") as string) || "merge";

    if (mode === "replace") {
      const result = await importAccountsReplace(
        context.company.id,
        parsedAccounts
      );
      return apiResponse.success({
        message: `Import สำเร็จ: ลบบัญชี Peak เดิม ${result.deleted} รายการ, สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
        deleted: result.deleted,
        created: result.created,
        updated: result.updated,
        total: parsedAccounts.length,
        mode: "replace",
      });
    }

    const result = await importAccountsMerge(
      context.company.id,
      parsedAccounts
    );
    return apiResponse.success({
      message: `Import สำเร็จ: สร้างใหม่ ${result.created} รายการ, อัปเดต ${result.updated} รายการ`,
      created: result.created,
      updated: result.updated,
      total: parsedAccounts.length,
      mode: "merge",
    });
  } catch (error) {
    console.error("Account import error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการ Import ผังบัญชี")
    );
  }
}

export const POST = withCompanyAccessFromParams(handleRequest, {
  permission: "settings:write",
});
