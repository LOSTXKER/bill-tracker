import { NextResponse } from "next/server";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { buildExportArchive } from "@/lib/export/archive-export";
import { toThaiLocalDate } from "@/lib/queries/date-utils";

export const GET = withCompanyAccessFromParams(async (req, { company }) => {
  try {
    const { searchParams } = new URL(req.url);
    const thaiNow = toThaiLocalDate(new Date());
    const month = parseInt(searchParams.get("month") || String(thaiNow.getMonth())); // 0-based, matches archive-export.ts convention
    const year = parseInt(searchParams.get("year") || String(thaiNow.getFullYear() + 543));

    const { readable, filename } = await buildExportArchive({
      companyId: company.id,
      companyCode: company.code,
      companyName: company.name,
      month,
      year,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

    return new NextResponse(readable, { headers });
  } catch (error) {
    console.error("Export archive error:", error);
    return apiResponse.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
  }
});
