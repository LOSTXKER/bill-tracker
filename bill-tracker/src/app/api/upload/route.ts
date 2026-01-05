import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToSupabase } from "@/lib/storage/supabase";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "receipts";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "ไฟล์ต้องเป็นรูปภาพเท่านั้น" },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ไฟล์ต้องมีขนาดไม่เกิน 5MB" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const { url, path } = await uploadToSupabase(file, folder);

    return NextResponse.json({
      url,
      path,
      filename: path.split("/").pop(),
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "การอัพโหลดล้มเหลว" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, path } = await request.json();

    if (!url && !path) {
      return NextResponse.json(
        { error: "No URL or path provided" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "การลบไฟล์ล้มเหลว" },
      { status: 500 }
    );
  }
}
