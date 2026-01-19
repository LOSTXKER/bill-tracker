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
 * Sanitize filename for storage - Supabase requires URL-safe characters only
 * We encode the original name in base64 to preserve it for display
 */
function sanitizeFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop() || "file";
  const baseName = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
  
  // Encode original name to base64 (URL-safe)
  const encodedName = Buffer.from(baseName, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // Remove padding
  
  // Limit encoded name length
  const shortEncoded = encodedName.substring(0, 60);
  
  // Return format: timestamp_base64name.ext
  return `${timestamp}_${shortEncoded}.${extension}`;
}

/**
 * Decode original filename from stored filename
 * Format: timestamp_base64name.ext → original name
 */
export function decodeOriginalFilename(storedFilename: string): string {
  try {
    // Extract base64 part: remove timestamp prefix and extension
    const match = storedFilename.match(/^\d+_(.+)\.(\w+)$/);
    if (!match) return storedFilename;
    
    const [, encodedPart, extension] = match;
    
    // Restore base64 padding and decode
    const base64 = encodedPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    
    // Add padding if needed
    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    
    const decodedName = Buffer.from(paddedBase64, "base64").toString("utf-8");
    
    // Check if decoded successfully (contains valid characters)
    if (decodedName && decodedName.length > 0) {
      return `${decodedName}.${extension}`;
    }
    
    return storedFilename;
  } catch {
    return storedFilename;
  }
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param folder - The folder path in storage
 * @param originalFilename - Optional original filename (if different from file.name)
 */
export async function uploadToSupabase(
  file: File,
  folder: string = "receipts",
  originalFilename?: string
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseClient();
  
  // Use provided filename or file.name
  const nameToUse = originalFilename || file.name;
  
  // Generate filename that preserves original name
  const filename = sanitizeFilename(nameToUse);
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
