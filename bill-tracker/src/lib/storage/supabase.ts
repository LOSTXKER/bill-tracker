import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization of Supabase client
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

export { getSupabaseClient as supabase };

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToSupabase(
  file: File,
  folder: string = "receipts"
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseClient();
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split(".").pop();
  const filename = `${timestamp}-${random}.${extension}`;
  const path = `${folder}/${filename}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from("bill-tracker") // bucket name
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(error.message || "การอัพโหลดล้มเหลว");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("bill-tracker")
    .getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabase(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.storage
    .from("bill-tracker")
    .remove([filePath]);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message || "การลบไฟล์ล้มเหลว");
  }
}

/**
 * Extract path from Supabase URL
 */
export function extractPathFromUrl(url: string): string {
  // Example: https://xxx.supabase.co/storage/v1/object/public/bill-tracker/receipts/123.jpg
  // Returns: receipts/123.jpg
  const match = url.match(/bill-tracker\/(.+)$/);
  return match ? match[1] : "";
}
