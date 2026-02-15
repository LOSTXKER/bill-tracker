import { withAuth } from "@/lib/api/with-auth";
import { apiResponse } from "@/lib/api/response";
import { uploadToSupabase } from "@/lib/storage/supabase";

export async function POST(request: Request) {
  return withAuth(async (req) => {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "receipts";
    const providedFilename = formData.get("filename") as string | null;

    if (!file) {
      return apiResponse.badRequest("No file uploaded");
    }

    // Validate file type - allow images and PDF
    const validTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      return apiResponse.badRequest("ไฟล์ต้องเป็นรูปภาพหรือ PDF เท่านั้น");
    }

    // Validate file size (30MB for PDF, 5MB for images)
    const maxSize = file.type === "application/pdf" ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiResponse.badRequest(
        `ไฟล์ต้องมีขนาดไม่เกิน ${file.type === "application/pdf" ? "30MB" : "5MB"}`
      );
    }

    // Use provided filename or original file name
    // If file.name is "blob" (from clipboard/compression), use provided filename or generate based on type
    let originalFilename = file.name || "file";
    if (providedFilename) {
      originalFilename = providedFilename;
    } else if (originalFilename === "blob" || !originalFilename.includes(".")) {
      // Generate a proper filename based on mime type
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "application/pdf": "pdf",
      };
      const ext = extMap[file.type] || "file";
      const timestamp = Date.now();
      originalFilename = `upload_${timestamp}.${ext}`;
    }

    // Upload to Supabase Storage with the proper filename
    const { url, path } = await uploadToSupabase(file, folder, originalFilename);

    return apiResponse.success({
      url,
      path,
      filename: path.split("/").pop(),
      size: file.size,
      type: file.type,
    });
  })(request);
}

export async function DELETE(request: Request) {
  return withAuth(async (req) => {
    const { url, path } = await req.json();

    if (!url && !path) {
      return apiResponse.badRequest("No URL or path provided");
    }

    // Extract path from URL if only URL is provided
    let filePath = path;
    if (!filePath && url) {
      const { extractPathFromUrl } = await import("@/lib/storage/supabase");
      filePath = extractPathFromUrl(url);
    }

    // Delete from Supabase Storage
    const { deleteFromSupabase } = await import("@/lib/storage/supabase");
    await deleteFromSupabase(filePath);

    return apiResponse.success({ success: true });
  })(request);
}
