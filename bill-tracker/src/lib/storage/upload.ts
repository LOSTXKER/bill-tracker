import imageCompression from "browser-image-compression";

export interface UploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export async function compressImage(file: File, options?: UploadOptions): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  // Sanitize filename: remove special chars but keep Thai characters
  const baseName = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
  const extension = originalName.split(".").pop();
  // Clean the name: replace spaces with underscore, keep alphanumeric and Thai
  const cleanName = baseName
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_\-]/g, "_") // Keep Thai, alphanumeric, underscore, hyphen
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .substring(0, 50); // Limit length
  return `${timestamp}_${cleanName}.${extension}`;
}

/**
 * Extract original filename from stored filename
 * Handles multiple formats:
 * - New (base64): "1768505912582_c-OquOC4seC4meC4kuC4sg.pdf" → "สัญญาเช่า.pdf"
 * - Old: "1768505912582-abc123.jpg" → "รูปภาพ.jpg"
 */
export function extractDisplayName(storedFilename: string): string {
  if (!storedFilename) return "ไฟล์";
  
  // Get extension
  const extMatch = storedFilename.match(/\.([^.]+)$/);
  const extension = extMatch ? extMatch[1] : "";
  
  // Check if it's the old format: timestamp-random.ext (13 digits + hyphen + random chars)
  const oldFormatMatch = storedFilename.match(/^(\d{13})-([a-z0-9]+)\.(\w+)$/i);
  if (oldFormatMatch) {
    // Old format - just show generic name with extension
    const extName = extension.toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(extName)) {
      return `รูปภาพ.${extension}`;
    } else if (extName === "pdf") {
      return `เอกสาร.${extension}`;
    }
    return `ไฟล์.${extension}`;
  }
  
  // New format: timestamp_base64name.ext
  // Try to decode base64
  const newFormatMatch = storedFilename.match(/^(\d+)_(.+)\.(\w+)$/);
  if (newFormatMatch) {
    const [, , encodedPart, ext] = newFormatMatch;
    
    try {
      // Restore base64 padding and decode
      const base64 = encodedPart
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      
      // Add padding if needed
      const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      
      // Try to decode - works in browser with atob
      let decodedName: string;
      if (typeof window !== "undefined") {
        // Browser
        decodedName = decodeURIComponent(escape(atob(paddedBase64)));
      } else {
        // Node.js
        decodedName = Buffer.from(paddedBase64, "base64").toString("utf-8");
      }
      
      // Check if decoded successfully
      if (decodedName && decodedName.length > 0 && !decodedName.includes("\ufffd")) {
        return `${decodedName}.${ext}`;
      }
    } catch {
      // If decode fails, it might be an older format with underscores
      // Replace underscores with spaces
      const withSpaces = encodedPart.replace(/_/g, " ");
      return `${withSpaces}.${ext}`;
    }
  }
  
  return storedFilename;
}

export function validateFile(file: File): boolean {
  const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const pdfTypes = ["application/pdf"];
  const validTypes = [...imageTypes, ...pdfTypes];
  
  const maxImageSize = 5 * 1024 * 1024; // 5MB for images
  const maxPdfSize = 10 * 1024 * 1024; // 10MB for PDF

  if (!validTypes.includes(file.type)) {
    throw new Error("ไฟล์ต้องเป็นรูปภาพ (JPEG, PNG, WebP) หรือ PDF เท่านั้น");
  }

  const isPdf = pdfTypes.includes(file.type);
  const maxSize = isPdf ? maxPdfSize : maxImageSize;
  
  if (file.size > maxSize) {
    throw new Error(`ไฟล์ต้องมีขนาดไม่เกิน ${isPdf ? "10MB" : "5MB"}`);
  }

  return true;
}

// Keep for backward compatibility
export function validateImageFile(file: File): boolean {
  return validateFile(file);
}

export async function uploadFile(
  file: File,
  folder: string = "receipts"
): Promise<{ url: string; filename: string }> {
  try {
    // Validate file
    validateFile(file);

    // Check if file is an image (skip compression for PDF)
    const isImage = file.type.startsWith("image/");
    
    // Compress only images, not PDF
    const fileToUpload = isImage ? await compressImage(file) : file;

    // Use direct upload to Supabase to bypass Vercel's 4.5MB limit
    const { uploadFileDirect } = await import("@/lib/storage/client-upload");
    const result = await uploadFileDirect(fileToUpload, folder, file.name);
    
    return { url: result.url, filename: result.filename };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const { deleteFileDirect, extractPathFromUrl } = await import("@/lib/storage/client-upload");
    const filePath = extractPathFromUrl(url);
    if (filePath) {
      await deleteFileDirect(filePath);
    }
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
}
