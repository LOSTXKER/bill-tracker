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
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalName.split(".").pop();
  return `${timestamp}-${random}.${extension}`;
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

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);

    // Create form data
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("folder", folder);
    formData.append("filename", filename);

    // Upload to server
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "การอัพโหลดล้มเหลว");
    }

    const result = await response.json();
    // Handle apiResponse wrapper: { success: true, data: { url, ... } }
    const data = result.data || result;
    
    if (!data.url) {
      console.error("Upload response missing URL:", result);
      throw new Error("ไม่ได้รับ URL จากการอัปโหลด");
    }
    
    return { url: data.url, filename: data.filename || data.path?.split("/").pop() || "" };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const response = await fetch("/api/upload", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("การลบไฟล์ล้มเหลว");
    }
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
}
