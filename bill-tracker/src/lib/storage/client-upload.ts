"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side upload directly to Supabase Storage
 * This bypasses Vercel's 4.5MB body size limit
 */

// Get Supabase client for browser
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Sanitize filename for storage - Supabase requires URL-safe characters only
 */
function sanitizeFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop() || "file";
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  // Encode original name to base64 (URL-safe)
  const encodedName = btoa(unescape(encodeURIComponent(baseName)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Limit encoded name length
  const shortEncoded = encodedName.substring(0, 60);

  return `${timestamp}_${shortEncoded}.${extension}`;
}

export interface ClientUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * Upload a file directly to Supabase from the browser
 * Supports files up to 50MB (Supabase Storage limit)
 */
export async function uploadFileDirect(
  file: File,
  folder: string = "receipts",
  originalFilename?: string
): Promise<ClientUploadResult> {
  const supabase = getSupabaseClient();

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];

  if (!validTypes.includes(file.type)) {
    throw new Error("ไฟล์ต้องเป็นรูปภาพหรือ PDF เท่านั้น");
  }

  // Validate file size (50MB max for Supabase)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 50MB");
  }

  // Use provided filename or file.name
  const nameToUse = originalFilename || file.name || "file";
  const filename = sanitizeFilename(nameToUse);
  const path = `${folder}/${filename}`;

  // Upload file directly to Supabase
  const { data, error } = await supabase.storage
    .from("bill-tracker")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(error.message || "การอัปโหลดล้มเหลว");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("bill-tracker")
    .getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    filename: filename,
    size: file.size,
    type: file.type,
  };
}

/**
 * Delete a file from Supabase Storage (client-side)
 */
export async function deleteFileDirect(filePath: string): Promise<void> {
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
  const match = url.match(/bill-tracker\/(.+)$/);
  return match ? match[1] : "";
}
